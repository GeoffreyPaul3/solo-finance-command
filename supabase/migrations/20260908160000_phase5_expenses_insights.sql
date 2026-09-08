-- ============================================================================
-- SoloOS Phase 5: Expenses Metadata + Profitability + Payments Global View
-- Migration: 20260908160000_phase5_expenses_insights.sql
-- ============================================================================
-- Architecture principle:
--   Expenses are financial_transactions (type='expense') that get enriched by
--   an expenses metadata row. The metadata row carries vendor, project_id,
--   client_id, and notes — data that doesn't belong in the generic ledger.
--   record_expense_with_meta() atomically writes both rows in one transaction.
--   reverse_expense() reverses the underlying financial_transaction and marks
--   the expense metadata row as 'reversed'.
-- ============================================================================

-- ===== 1. Expense Status Enum =====

DO $$ BEGIN
  CREATE TYPE public.expense_status AS ENUM ('posted', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. Expenses Metadata Table =====

CREATE TABLE IF NOT EXISTS public.expenses (
  id                       UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  financial_transaction_id UUID                   NOT NULL UNIQUE REFERENCES public.financial_transactions(id),
  financial_account_id     UUID                   NOT NULL REFERENCES public.financial_accounts(id),
  category_id              UUID                   REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  client_id                UUID                   REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id               UUID                   REFERENCES public.projects(id) ON DELETE SET NULL,
  -- Core fields (mirror from financial_transactions for quick queries)
  amount                   NUMERIC(18,4)          NOT NULL CHECK (amount > 0),
  currency                 CHAR(3)                NOT NULL CHECK (length(currency) = 3),
  expense_date             DATE                   NOT NULL,
  description              TEXT                   NOT NULL CHECK (length(btrim(description)) >= 1),
  -- Expense-specific metadata
  vendor                   TEXT                   CHECK (vendor IS NULL OR length(btrim(vendor)) BETWEEN 1 AND 200),
  notes                    TEXT                   CHECK (notes IS NULL OR length(notes) <= 2000),
  reference                TEXT                   CHECK (reference IS NULL OR length(reference) <= 200),
  status                   public.expense_status  NOT NULL DEFAULT 'posted',
  idempotency_key          TEXT,
  created_by               UUID                   REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ            NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_date
  ON public.expenses(workspace_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_workspace_status
  ON public.expenses(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_expenses_workspace_client
  ON public.expenses(workspace_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_workspace_project
  ON public.expenses(workspace_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_workspace_account
  ON public.expenses(workspace_id, financial_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_idempotency
  ON public.expenses(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 3. Workspace Integrity Triggers for Expenses =====

-- Enforce: expense.client_id must belong to same workspace
CREATE OR REPLACE FUNCTION public.check_expense_client_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'client does not belong to the expense workspace' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_expense_client_workspace ON public.expenses;
CREATE TRIGGER trg_expense_client_workspace
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.check_expense_client_workspace();

-- Enforce: expense.project_id must belong to same workspace
CREATE OR REPLACE FUNCTION public.check_expense_project_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'project does not belong to the expense workspace' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_expense_project_workspace ON public.expenses;
CREATE TRIGGER trg_expense_project_workspace
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.check_expense_project_workspace();

-- ===== 4. RLS Policies for expenses =====

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

-- ===== 5. record_expense_with_meta RPC =====

CREATE OR REPLACE FUNCTION public.record_expense_with_meta(
  _workspace_id        UUID,
  _account_id          UUID,
  _amount              NUMERIC,
  _transaction_date    DATE,
  _description         TEXT,
  _category_id         UUID    DEFAULT NULL,
  _vendor              TEXT    DEFAULT NULL,
  _project_id          UUID    DEFAULT NULL,
  _client_id           UUID    DEFAULT NULL,
  _notes               TEXT    DEFAULT NULL,
  _reference           TEXT    DEFAULT NULL,
  _idempotency_key     TEXT    DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid            UUID := auth.uid();
  _tx_id          UUID;
  _expense_id     UUID;
  _acc_currency   CHAR(3);
  _acc_status     public.financial_account_status;
  _clean_desc     TEXT := btrim(_description);
  _clean_vendor   TEXT := CASE WHEN _vendor IS NOT NULL THEN btrim(_vendor) ELSE NULL END;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record expenses' USING ERRCODE = '42501';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'expense amount must be strictly greater than 0' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_desc) < 1 THEN
    RAISE EXCEPTION 'expense description cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Idempotency check on expense metadata table
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _expense_id FROM public.expenses
    WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _expense_id;
    END IF;
  END IF;

  -- Validate & lock account
  SELECT currency, status INTO _acc_currency, _acc_status
  FROM public.financial_accounts
  WHERE id = _account_id AND workspace_id = _workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial account not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _acc_status <> 'active' THEN
    RAISE EXCEPTION 'cannot post transactions to an archived account' USING ERRCODE = '23514';
  END IF;

  -- Validate cross-workspace FK for client
  IF _client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'client does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  -- Validate cross-workspace FK for project
  IF _project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'project does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  -- Insert into financial_transactions (the authoritative ledger)
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, category_id, transaction_type,
    amount, currency, transaction_date, description, reference,
    status, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _account_id, _category_id, 'expense',
    _amount, _acc_currency, _transaction_date, _clean_desc, _reference,
    'posted', NULL, _uid
  ) RETURNING id INTO _tx_id;

  -- Atomic balance decrement
  UPDATE public.financial_accounts
  SET current_balance = current_balance - _amount
  WHERE id = _account_id;

  -- Insert expense metadata row
  INSERT INTO public.expenses (
    workspace_id, financial_transaction_id, financial_account_id, category_id,
    client_id, project_id, amount, currency, expense_date,
    description, vendor, notes, reference, status, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _tx_id, _account_id, _category_id,
    _client_id, _project_id, _amount, _acc_currency, _transaction_date,
    _clean_desc,
    CASE WHEN _clean_vendor IS NOT NULL AND length(_clean_vendor) > 0 THEN _clean_vendor ELSE NULL END,
    _notes, _reference, 'posted', _idempotency_key, _uid
  ) RETURNING id INTO _expense_id;

  -- Audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'expense.recorded', 'expense', _expense_id::text,
    jsonb_build_object(
      'account_id', _account_id,
      'amount', _amount,
      'currency', _acc_currency,
      'expense_date', _transaction_date,
      'vendor', _clean_vendor,
      'client_id', _client_id,
      'project_id', _project_id
    )
  );

  RETURN _expense_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_expense_with_meta(UUID, UUID, NUMERIC, DATE, TEXT, UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ===== 6. reverse_expense RPC =====

CREATE OR REPLACE FUNCTION public.reverse_expense(
  _workspace_id    UUID,
  _expense_id      UUID,
  _reversal_reason TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid             UUID := auth.uid();
  _expense         RECORD;
  _reversal_tx_id  UUID;
  _clean_reason    TEXT := btrim(_reversal_reason);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to reverse expenses' USING ERRCODE = '42501';
  END IF;

  IF length(_clean_reason) < 3 THEN
    RAISE EXCEPTION 'reversal reason must be at least 3 characters' USING ERRCODE = '22023';
  END IF;

  -- Lock the expense row
  SELECT e.*, ft.status AS tx_status
  INTO _expense
  FROM public.expenses e
  JOIN public.financial_transactions ft ON ft.id = e.financial_transaction_id
  WHERE e.id = _expense_id AND e.workspace_id = _workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _expense.status = 'reversed' THEN
    RAISE EXCEPTION 'expense is already reversed' USING ERRCODE = '22023';
  END IF;

  -- Insert reversal transaction (positive amount = money flows back in)
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, category_id, transaction_type,
    amount, currency, transaction_date, description, status,
    reversal_of_transaction_id, reversal_reason, created_by
  ) VALUES (
    _workspace_id, _expense.financial_account_id, _expense.category_id, 'expense',
    _expense.amount, _expense.currency, CURRENT_DATE,
    'REVERSAL: ' || _expense.description,
    'reversed',
    _expense.financial_transaction_id, _clean_reason, _uid
  ) RETURNING id INTO _reversal_tx_id;

  -- Mark original transaction as reversed
  UPDATE public.financial_transactions
  SET status = 'reversed',
      reversed_by_transaction_id = _reversal_tx_id
  WHERE id = _expense.financial_transaction_id;

  -- Restore account balance (credit back)
  UPDATE public.financial_accounts
  SET current_balance = current_balance + _expense.amount
  WHERE id = _expense.financial_account_id;

  -- Mark expense metadata as reversed
  UPDATE public.expenses
  SET status = 'reversed'
  WHERE id = _expense_id;

  -- Audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'expense.reversed', 'expense', _expense_id::text,
    jsonb_build_object(
      'reversal_reason', _clean_reason,
      'original_amount', _expense.amount,
      'currency', _expense.currency
    )
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.reverse_expense(UUID, UUID, TEXT) TO authenticated;

-- ===== 7. get_command_center_summary RPC =====
-- Returns a per-currency cash-based financial summary for the Command Center.
-- Revenue = total income transactions (posted) in the date range
-- Expenses = total expense transactions (posted) in the date range
-- Net = Revenue - Expenses (per currency, strictly isolated)

CREATE OR REPLACE FUNCTION public.get_command_center_summary(
  _workspace_id UUID,
  _date_from    DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  _date_to      DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  currency         CHAR(3),
  total_revenue    NUMERIC(18,4),
  total_expenses   NUMERIC(18,4),
  net_cash         NUMERIC(18,4),
  cash_balance     NUMERIC(18,4),
  receivables_due  NUMERIC(18,4)
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH period_txns AS (
    SELECT
      ft.currency,
      ft.transaction_type,
      ft.amount
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.status = 'posted'
      AND ft.transaction_date BETWEEN _date_from AND _date_to
      AND ft.transaction_type IN ('income', 'expense')
  ),
  period_aggregated AS (
    SELECT
      currency,
      COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END), 0) AS rev,
      COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS exp
    FROM period_txns
    GROUP BY currency
  ),
  balances AS (
    SELECT
      fa.currency,
      SUM(CASE WHEN fa.status = 'active' THEN fa.current_balance ELSE 0 END) AS bal
    FROM public.financial_accounts fa
    WHERE fa.workspace_id = _workspace_id
    GROUP BY fa.currency
  ),
  receivables AS (
    SELECT
      inv.currency,
      COALESCE(SUM(inv.amount_due), 0) AS due
    FROM public.invoices inv
    WHERE inv.workspace_id = _workspace_id
      AND inv.status NOT IN ('cancelled', 'paid')
      AND inv.amount_due > 0
    GROUP BY inv.currency
  ),
  all_currencies AS (
    SELECT currency FROM period_aggregated
    UNION SELECT currency FROM balances
    UNION SELECT currency FROM receivables
  )
  SELECT
    ac.currency::CHAR(3),
    COALESCE(pa.rev, 0)::NUMERIC(18,4)         AS total_revenue,
    COALESCE(pa.exp, 0)::NUMERIC(18,4)         AS total_expenses,
    (COALESCE(pa.rev, 0) - COALESCE(pa.exp, 0))::NUMERIC(18,4) AS net_cash,
    COALESCE(b.bal, 0)::NUMERIC(18,4)          AS cash_balance,
    COALESCE(r.due, 0)::NUMERIC(18,4)          AS receivables_due
  FROM all_currencies ac
  LEFT JOIN period_aggregated pa ON pa.currency = ac.currency
  LEFT JOIN balances b ON b.currency = ac.currency
  LEFT JOIN receivables r ON r.currency = ac.currency
  ORDER BY ac.currency;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_command_center_summary(UUID, DATE, DATE) TO authenticated;

-- ===== 8. get_profitability_summary RPC =====
-- Cash-based profitability: Collected Revenue vs Posted Expenses = Net Cash Contribution.
-- Groups by currency, optionally by client, optionally by project.
-- NO cross-currency aggregation. Each currency is an independent bucket.

CREATE OR REPLACE FUNCTION public.get_profitability_summary(
  _workspace_id UUID,
  _date_from    DATE DEFAULT '2000-01-01',
  _date_to      DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  currency       CHAR(3),
  total_revenue  NUMERIC(18,4),
  total_expenses NUMERIC(18,4),
  net_profit     NUMERIC(18,4),
  invoice_count  BIGINT,
  expense_count  BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH rev AS (
    SELECT ft.currency,
           COALESCE(SUM(ft.amount), 0) AS total,
           COUNT(*)                    AS cnt
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.transaction_type = 'income'
      AND ft.status = 'posted'
      AND ft.transaction_date BETWEEN _date_from AND _date_to
    GROUP BY ft.currency
  ),
  exp AS (
    SELECT ft.currency,
           COALESCE(SUM(ft.amount), 0) AS total,
           COUNT(*)                    AS cnt
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.transaction_type = 'expense'
      AND ft.status = 'posted'
      AND ft.transaction_date BETWEEN _date_from AND _date_to
    GROUP BY ft.currency
  ),
  currencies AS (
    SELECT currency FROM rev
    UNION SELECT currency FROM exp
  )
  SELECT
    c.currency::CHAR(3),
    COALESCE(r.total, 0)::NUMERIC(18,4)                        AS total_revenue,
    COALESCE(e.total, 0)::NUMERIC(18,4)                        AS total_expenses,
    (COALESCE(r.total, 0) - COALESCE(e.total, 0))::NUMERIC(18,4) AS net_profit,
    COALESCE(r.cnt, 0)                                         AS invoice_count,
    COALESCE(e.cnt, 0)                                         AS expense_count
  FROM currencies c
  LEFT JOIN rev r ON r.currency = c.currency
  LEFT JOIN exp e ON e.currency = c.currency
  ORDER BY c.currency;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_profitability_summary(UUID, DATE, DATE) TO authenticated;
