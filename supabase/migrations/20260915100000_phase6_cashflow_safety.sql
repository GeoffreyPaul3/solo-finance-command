-- ============================================================================
-- SoloOS Phase 6: Cashflow + Financial Safety
-- Migration: 20260915100000_phase6_cashflow_safety.sql
-- ============================================================================
-- Architecture principles:
--   Obligations are PLANNING objects. They do NOT post to financial_transactions.
--   Recurring expenses generate obligations; they do NOT auto-post to the ledger.
--   Tax reserve adjustments are DESIGNATIONS, not ledger entries.
--   Safe-to-Spend is a DERIVED, READ-ONLY calculation built on top of:
--     - financial_transactions (authoritative cash)
--     - invoices (receivables)
--     - obligations (projected outflows)
--     - workspace_settings (operating_buffer, tax_reserve_percent)
--     - tax_reserve_adjustments (designated reserve tracking)
--   Expected collections derive from existing invoices table — no duplication.
-- ============================================================================

-- ===== 1. Enums =====

DO $$ BEGIN
  CREATE TYPE public.obligation_status AS ENUM (
    'upcoming',
    'due',
    'overdue',
    'paid',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_expense_frequency AS ENUM (
    'weekly',
    'monthly',
    'quarterly',
    'yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_expense_status AS ENUM (
    'active',
    'paused',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. recurring_expenses (created first because obligations FK references it) =====

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id              UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID                              NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT                              NOT NULL CHECK (length(btrim(name)) >= 1 AND length(name) <= 200),
  amount          NUMERIC(18,4)                     NOT NULL CHECK (amount > 0),
  currency        CHAR(3)                           NOT NULL CHECK (length(currency) = 3),
  frequency       public.recurring_expense_frequency NOT NULL,
  start_date      DATE                              NOT NULL,
  next_occurrence DATE,
  end_date        DATE,
  category_id     UUID                              REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  vendor          TEXT                              CHECK (vendor IS NULL OR length(btrim(vendor)) BETWEEN 1 AND 200),
  notes           TEXT                              CHECK (notes IS NULL OR length(notes) <= 2000),
  status          public.recurring_expense_status   NOT NULL DEFAULT 'active',
  created_by      UUID                              REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ                       NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ                       NOT NULL DEFAULT now(),
  CONSTRAINT recurring_end_after_start CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_workspace_status
  ON public.recurring_expenses(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next
  ON public.recurring_expenses(workspace_id, next_occurrence)
  WHERE status = 'active';

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.recurring_expenses TO authenticated;
GRANT ALL ON public.recurring_expenses TO service_role;

DROP TRIGGER IF EXISTS recurring_expenses_updated_at ON public.recurring_expenses;
CREATE TRIGGER recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 3. obligations =====

CREATE TABLE IF NOT EXISTS public.obligations (
  id                   UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID                     NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name                 TEXT                     NOT NULL CHECK (length(btrim(name)) >= 1 AND length(name) <= 200),
  description          TEXT                     CHECK (description IS NULL OR length(description) <= 2000),
  amount               NUMERIC(18,4)            NOT NULL CHECK (amount > 0),
  currency             CHAR(3)                  NOT NULL CHECK (length(currency) = 3),
  due_date             DATE                     NOT NULL,
  status               public.obligation_status NOT NULL DEFAULT 'upcoming',
  category_id          UUID                     REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  vendor               TEXT                     CHECK (vendor IS NULL OR length(btrim(vendor)) BETWEEN 1 AND 200),
  recurring_expense_id UUID                     REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  notes                TEXT                     CHECK (notes IS NULL OR length(notes) <= 2000),
  priority             SMALLINT                 NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  -- Optional: link to actual expense posted when this obligation is paid.
  -- CRITICAL: Setting this does NOT auto-create a ledger transaction.
  -- The expense must be created separately via record_expense_with_meta().
  linked_expense_id    UUID                     REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_by           UUID                     REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ              NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligations_workspace_due
  ON public.obligations(workspace_id, due_date);
CREATE INDEX IF NOT EXISTS idx_obligations_workspace_status
  ON public.obligations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_obligations_workspace_currency
  ON public.obligations(workspace_id, currency);
CREATE INDEX IF NOT EXISTS idx_obligations_recurring
  ON public.obligations(recurring_expense_id)
  WHERE recurring_expense_id IS NOT NULL;

ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.obligations TO authenticated;
GRANT ALL ON public.obligations TO service_role;

DROP TRIGGER IF EXISTS obligations_updated_at ON public.obligations;
CREATE TRIGGER obligations_updated_at
  BEFORE UPDATE ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 4. recurring_expense_occurrences =====

CREATE TABLE IF NOT EXISTS public.recurring_expense_occurrences (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recurring_expense_id UUID        NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  occurrence_date      DATE        NOT NULL,
  obligation_id        UUID        REFERENCES public.obligations(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_occurrence UNIQUE (recurring_expense_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_reo_workspace_schedule
  ON public.recurring_expense_occurrences(workspace_id, recurring_expense_id);

ALTER TABLE public.recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.recurring_expense_occurrences TO authenticated;
GRANT ALL ON public.recurring_expense_occurrences TO service_role;

-- ===== 5. tax_reserve_adjustments =====
-- Tracks explicitly designated/tracked tax reserve amounts per currency.
-- PLANNING DESIGNATIONS ONLY — not ledger transactions.
-- Physical money movement remains record_transfer() in financial_transactions.

CREATE TABLE IF NOT EXISTS public.tax_reserve_adjustments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency        CHAR(3)       NOT NULL CHECK (length(currency) = 3),
  amount          NUMERIC(18,4) NOT NULL CHECK (amount <> 0),
  description     TEXT          NOT NULL CHECK (length(btrim(description)) >= 1 AND length(description) <= 500),
  adjustment_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_reserve_adj_workspace_currency
  ON public.tax_reserve_adjustments(workspace_id, currency);
CREATE INDEX IF NOT EXISTS idx_tax_reserve_adj_workspace_date
  ON public.tax_reserve_adjustments(workspace_id, adjustment_date DESC);

ALTER TABLE public.tax_reserve_adjustments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.tax_reserve_adjustments TO authenticated;
GRANT ALL ON public.tax_reserve_adjustments TO service_role;

-- ===== 6. RLS Policies =====

DROP POLICY IF EXISTS "obligations_select" ON public.obligations;
CREATE POLICY "obligations_select" ON public.obligations
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "obligations_insert" ON public.obligations;
CREATE POLICY "obligations_insert" ON public.obligations
  FOR INSERT WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[])
  );

DROP POLICY IF EXISTS "obligations_update" ON public.obligations;
CREATE POLICY "obligations_update" ON public.obligations
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

DROP POLICY IF EXISTS "recurring_expenses_select" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_select" ON public.recurring_expenses
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "recurring_expenses_insert" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[])
  );

DROP POLICY IF EXISTS "recurring_expenses_update" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_update" ON public.recurring_expenses
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

DROP POLICY IF EXISTS "reo_select" ON public.recurring_expense_occurrences;
CREATE POLICY "reo_select" ON public.recurring_expense_occurrences
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "reo_insert" ON public.recurring_expense_occurrences;
CREATE POLICY "reo_insert" ON public.recurring_expense_occurrences
  FOR INSERT WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[])
  );

DROP POLICY IF EXISTS "reo_update" ON public.recurring_expense_occurrences;
CREATE POLICY "reo_update" ON public.recurring_expense_occurrences
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

DROP POLICY IF EXISTS "tax_reserve_adj_select" ON public.tax_reserve_adjustments;
CREATE POLICY "tax_reserve_adj_select" ON public.tax_reserve_adjustments
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "tax_reserve_adj_insert" ON public.tax_reserve_adjustments;
CREATE POLICY "tax_reserve_adj_insert" ON public.tax_reserve_adjustments
  FOR INSERT WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[])
  );

-- ===== 7. Workspace integrity triggers =====

CREATE OR REPLACE FUNCTION public.check_obligation_refs_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.financial_categories
      WHERE id = NEW.category_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'obligation category does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;
  IF NEW.linked_expense_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = NEW.linked_expense_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'linked expense does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_obligation_refs_workspace ON public.obligations;
CREATE TRIGGER trg_obligation_refs_workspace
  BEFORE INSERT OR UPDATE ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION public.check_obligation_refs_workspace();

-- ===== 8. create_obligation =====

CREATE OR REPLACE FUNCTION public.create_obligation(
  _workspace_id UUID,
  _name         TEXT,
  _amount       NUMERIC,
  _currency     CHAR(3),
  _due_date     DATE,
  _description  TEXT     DEFAULT NULL,
  _category_id  UUID     DEFAULT NULL,
  _vendor       TEXT     DEFAULT NULL,
  _notes        TEXT     DEFAULT NULL,
  _priority     SMALLINT DEFAULT 2
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid           UUID := auth.uid();
  _obligation_id UUID;
  _clean_name    TEXT   := btrim(_name);
  _clean_curr    CHAR(3) := upper(btrim(_currency));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to create obligations' USING ERRCODE = '42501';
  END IF;
  IF length(_clean_name) < 1 OR length(_clean_name) > 200 THEN
    RAISE EXCEPTION 'obligation name must be between 1 and 200 characters' USING ERRCODE = '22023';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'obligation amount must be greater than 0' USING ERRCODE = '22023';
  END IF;
  IF length(_clean_curr) <> 3 THEN
    RAISE EXCEPTION 'currency must be a 3-letter ISO code' USING ERRCODE = '22023';
  END IF;
  IF _due_date IS NULL THEN RAISE EXCEPTION 'due_date is required' USING ERRCODE = '22023'; END IF;
  IF _category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE id = _category_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'category does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  INSERT INTO public.obligations (
    workspace_id, name, description, amount, currency, due_date,
    category_id, vendor, notes, priority, status, created_by
  ) VALUES (
    _workspace_id, _clean_name, _description, _amount, _clean_curr, _due_date,
    _category_id,
    CASE WHEN _vendor IS NOT NULL AND length(btrim(_vendor)) > 0 THEN btrim(_vendor) ELSE NULL END,
    _notes, _priority, 'upcoming', _uid
  ) RETURNING id INTO _obligation_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'obligation.created', 'obligation', _obligation_id::text,
    jsonb_build_object('name', _clean_name, 'amount', _amount, 'currency', _clean_curr, 'due_date', _due_date));

  RETURN _obligation_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_obligation(UUID,TEXT,NUMERIC,CHAR,DATE,TEXT,UUID,TEXT,TEXT,SMALLINT) TO authenticated;

-- ===== 9. update_obligation =====

CREATE OR REPLACE FUNCTION public.update_obligation(
  _workspace_id UUID,
  _obligation_id UUID,
  _name         TEXT     DEFAULT NULL,
  _amount       NUMERIC  DEFAULT NULL,
  _currency     CHAR(3)  DEFAULT NULL,
  _due_date     DATE     DEFAULT NULL,
  _description  TEXT     DEFAULT NULL,
  _category_id  UUID     DEFAULT NULL,
  _vendor       TEXT     DEFAULT NULL,
  _notes        TEXT     DEFAULT NULL,
  _priority     SMALLINT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid     UUID := auth.uid();
  _current public.obligations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to update obligations' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _current FROM public.obligations
  WHERE id = _obligation_id AND workspace_id = _workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'obligation not found in workspace' USING ERRCODE = '23503'; END IF;
  IF _current.status IN ('paid','cancelled') THEN
    RAISE EXCEPTION 'cannot update a paid or cancelled obligation' USING ERRCODE = '22023';
  END IF;

  IF _category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE id = _category_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'category does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  UPDATE public.obligations SET
    name        = COALESCE(_name, name),
    amount      = COALESCE(_amount, amount),
    currency    = COALESCE(upper(btrim(_currency)), currency),
    due_date    = COALESCE(_due_date, due_date),
    description = CASE WHEN _description IS NOT NULL THEN _description ELSE description END,
    category_id = CASE WHEN _category_id IS NOT NULL THEN _category_id ELSE category_id END,
    vendor      = CASE WHEN _vendor IS NOT NULL THEN btrim(_vendor) ELSE vendor END,
    notes       = CASE WHEN _notes IS NOT NULL THEN _notes ELSE notes END,
    priority    = COALESCE(_priority, priority)
  WHERE id = _obligation_id AND workspace_id = _workspace_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'obligation.updated', 'obligation', _obligation_id::text, '{}'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.update_obligation(UUID,UUID,TEXT,NUMERIC,CHAR,DATE,TEXT,UUID,TEXT,TEXT,SMALLINT) TO authenticated;

-- ===== 10. cancel_obligation =====

CREATE OR REPLACE FUNCTION public.cancel_obligation(
  _workspace_id  UUID,
  _obligation_id UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to cancel obligations' USING ERRCODE = '42501';
  END IF;

  UPDATE public.obligations SET status = 'cancelled', cancelled_at = now()
  WHERE id = _obligation_id AND workspace_id = _workspace_id
    AND status NOT IN ('paid','cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'obligation not found, already paid, or already cancelled' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'obligation.cancelled', 'obligation', _obligation_id::text, '{}'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_obligation(UUID,UUID) TO authenticated;

-- ===== 11. complete_obligation =====
-- Marks obligation planning status as paid.
-- Does NOT create a financial_transaction. Cash movement requires separate record_expense_with_meta().
-- linked_expense_id optionally links to an existing expense for reference.

CREATE OR REPLACE FUNCTION public.complete_obligation(
  _workspace_id      UUID,
  _obligation_id     UUID,
  _linked_expense_id UUID DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to complete obligations' USING ERRCODE = '42501';
  END IF;

  IF _linked_expense_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = _linked_expense_id AND workspace_id = _workspace_id AND status = 'posted') THEN
      RAISE EXCEPTION 'linked expense not found or not posted in workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  UPDATE public.obligations SET
    status            = 'paid',
    completed_at      = now(),
    linked_expense_id = COALESCE(_linked_expense_id, linked_expense_id)
  WHERE id = _obligation_id AND workspace_id = _workspace_id
    AND status NOT IN ('paid','cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'obligation not found, already paid, or cancelled' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'obligation.completed', 'obligation', _obligation_id::text,
    jsonb_build_object('linked_expense_id', _linked_expense_id));
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_obligation(UUID,UUID,UUID) TO authenticated;

-- ===== 12. create_recurring_expense =====

CREATE OR REPLACE FUNCTION public.create_recurring_expense(
  _workspace_id UUID,
  _name         TEXT,
  _amount       NUMERIC,
  _currency     CHAR(3),
  _frequency    public.recurring_expense_frequency,
  _start_date   DATE,
  _end_date     DATE    DEFAULT NULL,
  _category_id  UUID    DEFAULT NULL,
  _vendor       TEXT    DEFAULT NULL,
  _notes        TEXT    DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid  UUID := auth.uid();
  _id   UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to create recurring expenses' USING ERRCODE = '42501';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be greater than 0' USING ERRCODE = '22023'; END IF;
  IF _end_date IS NOT NULL AND _end_date <= _start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date' USING ERRCODE = '22023';
  END IF;
  IF _category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE id = _category_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'category does not belong to workspace' USING ERRCODE = '23503';
    END IF;
  END IF;

  INSERT INTO public.recurring_expenses (
    workspace_id, name, amount, currency, frequency, start_date, next_occurrence,
    end_date, category_id, vendor, notes, status, created_by
  ) VALUES (
    _workspace_id, btrim(_name), _amount, upper(btrim(_currency)), _frequency,
    _start_date, _start_date,
    _end_date, _category_id,
    CASE WHEN _vendor IS NOT NULL THEN btrim(_vendor) ELSE NULL END,
    _notes, 'active', _uid
  ) RETURNING id INTO _id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'recurring_expense.created', 'recurring_expense', _id::text,
    jsonb_build_object('name', btrim(_name), 'amount', _amount, 'currency', upper(btrim(_currency)),
                       'frequency', _frequency::text, 'start_date', _start_date));

  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_recurring_expense(UUID,TEXT,NUMERIC,CHAR,public.recurring_expense_frequency,DATE,DATE,UUID,TEXT,TEXT) TO authenticated;

-- ===== 13. update_recurring_expense_status =====

CREATE OR REPLACE FUNCTION public.update_recurring_expense_status(
  _workspace_id UUID,
  _schedule_id  UUID,
  _status       public.recurring_expense_status
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.recurring_expenses SET status = _status
  WHERE id = _schedule_id AND workspace_id = _workspace_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'recurring expense schedule not found in workspace' USING ERRCODE = '23503'; END IF;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'recurring_expense.' || _status::text, 'recurring_expense', _schedule_id::text, '{}'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.update_recurring_expense_status(UUID,UUID,public.recurring_expense_status) TO authenticated;

-- ===== 14. generate_recurring_occurrences =====
-- Idempotent: creates obligation stubs from active recurring schedules.
-- UNIQUE constraint on (recurring_expense_id, occurrence_date) prevents duplicates.
-- Does NOT post to financial_transactions.

CREATE OR REPLACE FUNCTION public.generate_recurring_occurrences(
  _workspace_id UUID,
  _as_of_date   DATE DEFAULT CURRENT_DATE,
  _horizon_days INT  DEFAULT 90
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid         UUID := auth.uid();
  _horizon_end DATE := _as_of_date + _horizon_days;
  _schedule    RECORD;
  _occ_date    DATE;
  _obl_id      UUID;
  _created     INT := 0;
  _step        INTERVAL;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  FOR _schedule IN
    SELECT * FROM public.recurring_expenses
    WHERE workspace_id = _workspace_id
      AND status = 'active'
      AND start_date <= _horizon_end
      AND (end_date IS NULL OR end_date >= _as_of_date)
  LOOP
    _step := CASE _schedule.frequency
      WHEN 'weekly'    THEN INTERVAL '7 days'
      WHEN 'monthly'   THEN INTERVAL '1 month'
      WHEN 'quarterly' THEN INTERVAL '3 months'
      WHEN 'yearly'    THEN INTERVAL '1 year'
    END;

    _occ_date := _schedule.start_date;

    -- Walk forward through all occurrence dates up to horizon
    WHILE _occ_date <= _horizon_end LOOP
      IF _occ_date >= _as_of_date
         AND (_schedule.end_date IS NULL OR _occ_date <= _schedule.end_date)
      THEN
        BEGIN
          INSERT INTO public.recurring_expense_occurrences
            (workspace_id, recurring_expense_id, occurrence_date)
          VALUES (_workspace_id, _schedule.id, _occ_date);

          -- Create corresponding obligation stub
          INSERT INTO public.obligations (
            workspace_id, name, amount, currency, due_date, status,
            category_id, vendor, notes, priority, recurring_expense_id, created_by
          ) VALUES (
            _workspace_id, _schedule.name, _schedule.amount, _schedule.currency,
            _occ_date,
            CASE WHEN _occ_date < _as_of_date THEN 'overdue'
                 WHEN _occ_date = _as_of_date THEN 'due'
                 ELSE 'upcoming' END,
            _schedule.category_id, _schedule.vendor, _schedule.notes, 2,
            _schedule.id, _uid
          ) RETURNING id INTO _obl_id;

          UPDATE public.recurring_expense_occurrences
          SET obligation_id = _obl_id
          WHERE recurring_expense_id = _schedule.id AND occurrence_date = _occ_date;

          _created := _created + 1;
        EXCEPTION WHEN unique_violation THEN
          NULL; -- Already exists — idempotent
        END;
      END IF;
      _occ_date := _occ_date + _step;
    END LOOP;

    -- Advance next_occurrence pointer
    DECLARE _next DATE := _schedule.start_date;
    BEGIN
      WHILE _next <= _as_of_date LOOP _next := _next + _step; END LOOP;
      UPDATE public.recurring_expenses SET next_occurrence = _next WHERE id = _schedule.id;
    END;

  END LOOP;

  RETURN _created;
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_recurring_occurrences(UUID,DATE,INT) TO authenticated;

-- ===== 15. upsert_tax_reserve_adjustment =====

CREATE OR REPLACE FUNCTION public.upsert_tax_reserve_adjustment(
  _workspace_id    UUID,
  _currency        CHAR(3),
  _amount          NUMERIC,
  _description     TEXT,
  _adjustment_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid  UUID := auth.uid();
  _id   UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record tax reserve adjustments' USING ERRCODE = '42501';
  END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'adjustment amount cannot be zero' USING ERRCODE = '22023'; END IF;
  IF length(btrim(_description)) < 1 THEN RAISE EXCEPTION 'description is required' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.tax_reserve_adjustments
    (workspace_id, currency, amount, description, adjustment_date, created_by)
  VALUES
    (_workspace_id, upper(btrim(_currency)), _amount, btrim(_description), _adjustment_date, _uid)
  RETURNING id INTO _id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _uid, 'tax_reserve.adjustment_recorded', 'tax_reserve_adjustment', _id::text,
    jsonb_build_object('currency', upper(btrim(_currency)), 'amount', _amount));

  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.upsert_tax_reserve_adjustment(UUID,CHAR,NUMERIC,TEXT,DATE) TO authenticated;

-- ===== 16. get_safe_to_spend =====
-- Conservative: uses target_tax_reserve (income × rate) as the effective deduction.
-- The UI must clearly label this as "Target Tax Reserve (planning estimate)".
-- Operating buffer applies ONLY to workspace primary currency — no FX conversion.

CREATE OR REPLACE FUNCTION public.get_safe_to_spend(
  _workspace_id UUID
)
RETURNS TABLE (
  currency                    CHAR(3),
  liquid_cash                 NUMERIC(18,4),
  target_tax_reserve          NUMERIC(18,4),
  tracked_tax_reserve         NUMERIC(18,4),
  effective_tax_reserve       NUMERIC(18,4),
  upcoming_obligations_30d    NUMERIC(18,4),
  all_future_obligations      NUMERIC(18,4),
  operating_buffer            NUMERIC(18,4),
  reliable_collections_high   NUMERIC(18,4),
  reliable_collections_medium NUMERIC(18,4),
  current_safe_to_spend       NUMERIC(18,4),
  projected_safe_to_spend     NUMERIC(18,4),
  is_primary_currency         BOOLEAN,
  collected_income_ytd        NUMERIC(18,4),
  tax_reserve_rate_percent    NUMERIC(5,2)
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _settings      RECORD;
  _today         DATE := CURRENT_DATE;
  _ytd_from      DATE := date_trunc('year', CURRENT_DATE)::DATE;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT ws.tax_reserve_percent, ws.operating_buffer, w.currency AS primary_currency
  INTO _settings
  FROM public.workspace_settings ws
  JOIN public.workspaces w ON w.id = ws.workspace_id
  WHERE ws.workspace_id = _workspace_id;

  RETURN QUERY
  WITH
  cash_by_ccy AS (
    SELECT fa.currency,
           COALESCE(SUM(CASE WHEN fa.status='active' THEN fa.current_balance ELSE 0 END),0) AS liquid_cash
    FROM public.financial_accounts fa
    WHERE fa.workspace_id = _workspace_id
    GROUP BY fa.currency
  ),
  income_ytd AS (
    SELECT ft.currency,
           COALESCE(SUM(ft.amount),0) AS collected
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.transaction_type = 'income'
      AND ft.status = 'posted'
      AND ft.transaction_date >= _ytd_from
    GROUP BY ft.currency
  ),
  tracked_reserve AS (
    SELECT tra.currency, COALESCE(SUM(tra.amount),0) AS tracked_amount
    FROM public.tax_reserve_adjustments tra
    WHERE tra.workspace_id = _workspace_id
    GROUP BY tra.currency
  ),
  obls_30d AS (
    SELECT o.currency, COALESCE(SUM(o.amount),0) AS total
    FROM public.obligations o
    WHERE o.workspace_id = _workspace_id
      AND o.status IN ('upcoming','due','overdue')
      AND o.due_date <= _today + 30
    GROUP BY o.currency
  ),
  obls_all AS (
    SELECT o.currency, COALESCE(SUM(o.amount),0) AS total
    FROM public.obligations o
    WHERE o.workspace_id = _workspace_id
      AND o.status IN ('upcoming','due','overdue')
    GROUP BY o.currency
  ),
  collections AS (
    SELECT inv.currency,
      COALESCE(SUM(CASE
        WHEN inv.status IN ('sent','partially_paid')
          AND (inv.due_date IS NULL OR inv.due_date >= _today)
        THEN inv.amount_due ELSE 0 END),0) AS high_rel,
      COALESCE(SUM(CASE
        WHEN inv.status IN ('sent','partially_paid')
          AND inv.due_date IS NOT NULL
          AND inv.due_date < _today
          AND (_today - inv.due_date) <= 30
        THEN inv.amount_due ELSE 0 END),0) AS medium_rel
    FROM public.invoices inv
    WHERE inv.workspace_id = _workspace_id
      AND inv.status NOT IN ('cancelled','paid')
      AND inv.amount_due > 0
    GROUP BY inv.currency
  ),
  all_ccys AS (
    SELECT currency FROM cash_by_ccy
    UNION SELECT currency FROM income_ytd
    UNION SELECT currency FROM obls_30d
    UNION SELECT currency FROM obls_all
    UNION SELECT currency FROM collections
  )
  SELECT
    ac.currency::CHAR(3),
    COALESCE(c.liquid_cash, 0)::NUMERIC(18,4),
    GREATEST(COALESCE(iy.collected,0) * (_settings.tax_reserve_percent/100.0),0)::NUMERIC(18,4) AS target_tax_reserve,
    GREATEST(COALESCE(tr.tracked_amount,0),0)::NUMERIC(18,4)                                    AS tracked_tax_reserve,
    -- effective = target (conservative, protects user; UI must label this)
    GREATEST(COALESCE(iy.collected,0) * (_settings.tax_reserve_percent/100.0),0)::NUMERIC(18,4) AS effective_tax_reserve,
    COALESCE(o30.total,0)::NUMERIC(18,4)                                                         AS upcoming_obligations_30d,
    COALESCE(oall.total,0)::NUMERIC(18,4)                                                        AS all_future_obligations,
    -- Operating buffer: ONLY primary currency; zero for all others (no FX)
    CASE WHEN ac.currency = _settings.primary_currency
         THEN _settings.operating_buffer::NUMERIC(18,4)
         ELSE 0::NUMERIC(18,4) END                                                               AS operating_buffer,
    COALESCE(col.high_rel,0)::NUMERIC(18,4)                                                      AS reliable_collections_high,
    COALESCE(col.medium_rel,0)::NUMERIC(18,4)                                                    AS reliable_collections_medium,
    -- Current STS: conservative — cash minus tax, 30d obligations, buffer
    (
      COALESCE(c.liquid_cash,0)
      - GREATEST(COALESCE(iy.collected,0)*(_settings.tax_reserve_percent/100.0),0)
      - COALESCE(o30.total,0)
      - CASE WHEN ac.currency = _settings.primary_currency THEN _settings.operating_buffer ELSE 0 END
    )::NUMERIC(18,4)                                                                             AS current_safe_to_spend,
    -- Projected STS: cash - tax - all obligations - buffer + high + medium collections
    (
      COALESCE(c.liquid_cash,0)
      - GREATEST(COALESCE(iy.collected,0)*(_settings.tax_reserve_percent/100.0),0)
      - COALESCE(oall.total,0)
      - CASE WHEN ac.currency = _settings.primary_currency THEN _settings.operating_buffer ELSE 0 END
      + COALESCE(col.high_rel,0)
      + COALESCE(col.medium_rel,0)
    )::NUMERIC(18,4)                                                                             AS projected_safe_to_spend,
    (ac.currency = _settings.primary_currency)                                                   AS is_primary_currency,
    COALESCE(iy.collected,0)::NUMERIC(18,4)                                                      AS collected_income_ytd,
    _settings.tax_reserve_percent::NUMERIC(5,2)                                                  AS tax_reserve_rate_percent
  FROM all_ccys ac
  LEFT JOIN cash_by_ccy c   ON c.currency   = ac.currency
  LEFT JOIN income_ytd iy   ON iy.currency  = ac.currency
  LEFT JOIN tracked_reserve tr ON tr.currency = ac.currency
  LEFT JOIN obls_30d o30    ON o30.currency  = ac.currency
  LEFT JOIN obls_all oall   ON oall.currency = ac.currency
  LEFT JOIN collections col ON col.currency  = ac.currency
  ORDER BY (ac.currency = _settings.primary_currency) DESC, ac.currency;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_safe_to_spend(UUID) TO authenticated;

-- ===== 17. get_cashflow_projection =====

CREATE OR REPLACE FUNCTION public.get_cashflow_projection(
  _workspace_id UUID,
  _horizon_days INT DEFAULT 30
)
RETURNS TABLE (
  currency             CHAR(3),
  current_cash         NUMERIC(18,4),
  expected_inflows     NUMERIC(18,4),
  planned_outflows     NUMERIC(18,4),
  projected_cash       NUMERIC(18,4),
  net_change           NUMERIC(18,4),
  is_primary_currency  BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today    DATE := CURRENT_DATE;
  _horizon  DATE := CURRENT_DATE + _horizon_days;
  _primary  TEXT;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT w.currency INTO _primary FROM public.workspaces w WHERE w.id = _workspace_id;

  RETURN QUERY
  WITH
  cash AS (
    SELECT fa.currency, COALESCE(SUM(CASE WHEN fa.status='active' THEN fa.current_balance ELSE 0 END),0) AS bal
    FROM public.financial_accounts fa WHERE fa.workspace_id = _workspace_id GROUP BY fa.currency
  ),
  inflows AS (
    SELECT inv.currency, COALESCE(SUM(inv.amount_due),0) AS expected
    FROM public.invoices inv
    WHERE inv.workspace_id = _workspace_id
      AND inv.status IN ('sent','partially_paid')
      AND inv.amount_due > 0
      AND (inv.due_date IS NULL OR inv.due_date <= _horizon)
      AND (inv.due_date IS NULL OR (_today - inv.due_date) <= 30)
    GROUP BY inv.currency
  ),
  outflows AS (
    SELECT o.currency, COALESCE(SUM(o.amount),0) AS planned
    FROM public.obligations o
    WHERE o.workspace_id = _workspace_id
      AND o.status IN ('upcoming','due','overdue')
      AND o.due_date <= _horizon
    GROUP BY o.currency
  ),
  all_ccys AS (
    SELECT currency FROM cash UNION SELECT currency FROM inflows UNION SELECT currency FROM outflows
  )
  SELECT
    ac.currency::CHAR(3),
    COALESCE(c.bal,0)::NUMERIC(18,4),
    COALESCE(inf.expected,0)::NUMERIC(18,4),
    COALESCE(out.planned,0)::NUMERIC(18,4),
    (COALESCE(c.bal,0)+COALESCE(inf.expected,0)-COALESCE(out.planned,0))::NUMERIC(18,4),
    (COALESCE(inf.expected,0)-COALESCE(out.planned,0))::NUMERIC(18,4),
    (ac.currency = _primary) AS is_primary_currency
  FROM all_ccys ac
  LEFT JOIN cash c      ON c.currency   = ac.currency
  LEFT JOIN inflows inf ON inf.currency = ac.currency
  LEFT JOIN outflows out ON out.currency = ac.currency
  ORDER BY (ac.currency = _primary) DESC, ac.currency;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_cashflow_projection(UUID,INT) TO authenticated;

-- ===== 18. get_command_center_v2_summary =====

CREATE OR REPLACE FUNCTION public.get_command_center_v2_summary(
  _workspace_id UUID,
  _date_from    DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  _date_to      DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  currency             CHAR(3),
  total_revenue        NUMERIC(18,4),
  total_expenses       NUMERIC(18,4),
  net_cash             NUMERIC(18,4),
  cash_balance         NUMERIC(18,4),
  receivables_due      NUMERIC(18,4),
  upcoming_obligations NUMERIC(18,4),
  target_tax_reserve   NUMERIC(18,4),
  tracked_tax_reserve  NUMERIC(18,4),
  current_sts          NUMERIC(18,4),
  projected_sts        NUMERIC(18,4),
  is_primary_currency  BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH
  v1 AS (SELECT * FROM public.get_command_center_summary(_workspace_id, _date_from, _date_to)),
  sts AS (SELECT * FROM public.get_safe_to_spend(_workspace_id)),
  all_ccys AS (SELECT currency FROM v1 UNION SELECT currency FROM sts)
  SELECT
    ac.currency::CHAR(3),
    COALESCE(v.total_revenue,0)::NUMERIC(18,4),
    COALESCE(v.total_expenses,0)::NUMERIC(18,4),
    COALESCE(v.net_cash,0)::NUMERIC(18,4),
    COALESCE(v.cash_balance,0)::NUMERIC(18,4),
    COALESCE(v.receivables_due,0)::NUMERIC(18,4),
    COALESCE(s.upcoming_obligations_30d,0)::NUMERIC(18,4),
    COALESCE(s.target_tax_reserve,0)::NUMERIC(18,4),
    COALESCE(s.tracked_tax_reserve,0)::NUMERIC(18,4),
    COALESCE(s.current_safe_to_spend,0)::NUMERIC(18,4),
    COALESCE(s.projected_safe_to_spend,0)::NUMERIC(18,4),
    COALESCE(s.is_primary_currency,false)
  FROM all_ccys ac
  LEFT JOIN v1 v  ON v.currency  = ac.currency
  LEFT JOIN sts s ON s.currency  = ac.currency
  ORDER BY COALESCE(s.is_primary_currency,false) DESC, ac.currency;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_command_center_v2_summary(UUID,DATE,DATE) TO authenticated;
