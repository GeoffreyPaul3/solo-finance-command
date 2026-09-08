-- ============================================================================
-- SoloOS Phase 2: Authoritative Financial Engine
-- Migration: 20260908130000_phase2_financial_engine.sql
-- ============================================================================

-- ===== 1. Custom Types & Enums =====
DO $$ BEGIN
  CREATE TYPE public.financial_account_type AS ENUM (
    'bank',
    'cash',
    'mobile_money',
    'payment_processor',
    'digital_wallet',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_account_status AS ENUM (
    'active',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_category_type AS ENUM (
    'income',
    'expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_transaction_type AS ENUM (
    'income',
    'expense',
    'transfer',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_transaction_status AS ENUM (
    'posted',
    'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. Financial Accounts =====
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  type public.financial_account_type NOT NULL DEFAULT 'bank',
  currency CHAR(3) NOT NULL CHECK (length(currency) = 3),
  opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  status public.financial_account_status NOT NULL DEFAULT 'active',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_financial_accounts_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_workspace_status ON public.financial_accounts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_workspace_currency ON public.financial_accounts(workspace_id, currency);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;

DROP TRIGGER IF EXISTS financial_accounts_updated_at ON public.financial_accounts;
CREATE TRIGGER financial_accounts_updated_at BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 3. Financial Categories =====
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  type public.financial_category_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_financial_categories_workspace_type_name UNIQUE (workspace_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_workspace_type ON public.financial_categories(workspace_id, type);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;

DROP TRIGGER IF EXISTS financial_categories_updated_at ON public.financial_categories;
CREATE TRIGGER financial_categories_updated_at BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 4. Authoritative Financial Transactions =====
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
  category_id UUID REFERENCES public.financial_categories(id),
  transaction_type public.financial_transaction_type NOT NULL,
  amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL CHECK (length(currency) = 3),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL CHECK (length(btrim(description)) >= 1),
  reference TEXT,
  status public.financial_transaction_status NOT NULL DEFAULT 'posted',
  -- Transfer tracking
  transfer_id UUID,
  transfer_role TEXT CHECK (transfer_role IN ('source', 'destination') OR transfer_role IS NULL),
  paired_account_id UUID REFERENCES public.financial_accounts(id),
  -- Reversal tracking
  reversed_by_transaction_id UUID REFERENCES public.financial_transactions(id),
  reversal_of_transaction_id UUID REFERENCES public.financial_transactions(id),
  reversal_reason TEXT,
  -- Idempotency & Audit
  idempotency_key TEXT,
  source_type TEXT DEFAULT 'manual',
  source_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_paired_account_distinct CHECK (paired_account_id IS NULL OR account_id <> paired_account_id),
  CONSTRAINT chk_transfer_integrity CHECK (
    (transfer_id IS NULL AND paired_account_id IS NULL AND transfer_role IS NULL) OR
    (transfer_id IS NOT NULL AND paired_account_id IS NOT NULL AND transfer_role IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_tx_workspace_idempotency
  ON public.financial_transactions(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_tx_workspace_date
  ON public.financial_transactions(workspace_id, transaction_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_tx_account_date
  ON public.financial_transactions(account_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_tx_transfer_id
  ON public.financial_transactions(transfer_id)
  WHERE transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_tx_reversal_of
  ON public.financial_transactions(reversal_of_transaction_id)
  WHERE reversal_of_transaction_id IS NOT NULL;

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;

DROP TRIGGER IF EXISTS financial_transactions_updated_at ON public.financial_transactions;
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 5. Anti-Tamper & Immutability Triggers =====

-- Prevent physical deletion of financial transactions
CREATE OR REPLACE FUNCTION public.prevent_financial_transaction_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Financial transactions cannot be deleted. Authoritative financial history requires reversal.' USING ERRCODE = '23505';
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_financial_tx_delete ON public.financial_transactions;
CREATE TRIGGER trg_prevent_financial_tx_delete
  BEFORE DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_transaction_delete();

-- Prevent mutation of core financial fields on posted transactions
CREATE OR REPLACE FUNCTION public.prevent_financial_transaction_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'posted' AND (
    NEW.amount <> OLD.amount OR
    NEW.currency <> OLD.currency OR
    NEW.account_id <> OLD.account_id OR
    NEW.transaction_type <> OLD.transaction_type OR
    NEW.transaction_date <> OLD.transaction_date OR
    NEW.transfer_id IS DISTINCT FROM OLD.transfer_id OR
    NEW.paired_account_id IS DISTINCT FROM OLD.paired_account_id
  ) THEN
    RAISE EXCEPTION 'Core financial fields of a posted transaction are immutable. Issue a reversal instead.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_financial_tx_mutation ON public.financial_transactions;
CREATE TRIGGER trg_prevent_financial_tx_mutation
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_transaction_mutation();

-- Prevent deletion of accounts with recorded transactions
CREATE OR REPLACE FUNCTION public.prevent_account_delete_with_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE account_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete financial account with recorded history. Archive the account instead.' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_account_delete_with_history ON public.financial_accounts;
CREATE TRIGGER trg_prevent_account_delete_with_history
  BEFORE DELETE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_account_delete_with_history();

-- Enforce category compatibility and workspace match
CREATE OR REPLACE FUNCTION public.check_transaction_category_compatibility()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _cat_workspace UUID;
  _cat_type public.financial_category_type;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT workspace_id, type INTO _cat_workspace, _cat_type
    FROM public.financial_categories WHERE id = NEW.category_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Category not found' USING ERRCODE = '23503';
    END IF;
    IF _cat_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Category belongs to a different workspace' USING ERRCODE = '23514';
    END IF;
    IF NEW.transaction_type = 'income' AND _cat_type <> 'income' THEN
      RAISE EXCEPTION 'Income transactions must use an income category' USING ERRCODE = '23514';
    END IF;
    IF NEW.transaction_type = 'expense' AND _cat_type <> 'expense' THEN
      RAISE EXCEPTION 'Expense transactions must use an expense category' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_check_transaction_category_compatibility ON public.financial_transactions;
CREATE TRIGGER trg_check_transaction_category_compatibility
  BEFORE INSERT OR UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_transaction_category_compatibility();

-- ===== 6. Category Seeding Foundation =====
CREATE OR REPLACE FUNCTION public.seed_default_financial_categories(_workspace_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Standard Income categories
  INSERT INTO public.financial_categories (workspace_id, name, type, is_system, icon, color)
  VALUES
    (_workspace_id, 'Client Revenue', 'income', true, 'Briefcase', '#10B981'),
    (_workspace_id, 'Consulting', 'income', true, 'LineChart', '#06B6D4'),
    (_workspace_id, 'Services', 'income', true, 'CheckCircle2', '#3B82F6'),
    (_workspace_id, 'Product Sales', 'income', true, 'Package', '#8B5CF6'),
    (_workspace_id, 'Other Income', 'income', true, 'PlusCircle', '#6B7280')
  ON CONFLICT (workspace_id, type, name) DO NOTHING;

  -- Standard Expense categories
  INSERT INTO public.financial_categories (workspace_id, name, type, is_system, icon, color)
  VALUES
    (_workspace_id, 'Software & Subscriptions', 'expense', true, 'Cpu', '#EF4444'),
    (_workspace_id, 'Contractors & Freelancers', 'expense', true, 'Users', '#F97316'),
    (_workspace_id, 'Internet & Utilities', 'expense', true, 'Wifi', '#F59E0B'),
    (_workspace_id, 'Transport & Travel', 'expense', true, 'Car', '#EAB308'),
    (_workspace_id, 'Office Supplies', 'expense', true, 'Building2', '#84CC16'),
    (_workspace_id, 'Marketing & Advertising', 'expense', true, 'Megaphone', '#EC4899'),
    (_workspace_id, 'Professional Services', 'expense', true, 'ShieldCheck', '#6366F1'),
    (_workspace_id, 'Bank Fees', 'expense', true, 'CreditCard', '#71717A'),
    (_workspace_id, 'Other Expense', 'expense', true, 'MinusCircle', '#6B7280')
  ON CONFLICT (workspace_id, type, name) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.seed_default_financial_categories(UUID) TO authenticated;

-- Backfill existing workspaces with default categories
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id FROM public.workspaces LOOP
    PERFORM public.seed_default_financial_categories(w.id);
  END LOOP;
END $$;

-- Update create_workspace to seed categories atomically on creation
CREATE OR REPLACE FUNCTION public.create_workspace(
  _name TEXT,
  _business_type TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _timezone TEXT DEFAULT 'UTC',
  _currency TEXT DEFAULT 'USD',
  _fiscal_year_start_month SMALLINT DEFAULT 1,
  _tax_reserve_percent NUMERIC DEFAULT 25,
  _default_payment_terms_days SMALLINT DEFAULT 14,
  _operating_buffer NUMERIC DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workspaces (name, business_type, country, timezone, currency, fiscal_year_start_month, created_by)
  VALUES (btrim(_name), _business_type, _country, COALESCE(_timezone,'UTC'), upper(COALESCE(_currency,'USD')),
          COALESCE(_fiscal_year_start_month,1), _uid)
  RETURNING id INTO _id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_id, _uid, 'owner');

  INSERT INTO public.workspace_settings (workspace_id, tax_reserve_percent, default_payment_terms_days, operating_buffer)
  VALUES (_id, COALESCE(_tax_reserve_percent,25), COALESCE(_default_payment_terms_days,14), COALESCE(_operating_buffer,0));

  -- Seed default financial categories
  PERFORM public.seed_default_financial_categories(_id);

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_id, _uid, 'workspace.created', 'workspace', _id::text, jsonb_build_object('name', btrim(_name)));

  RETURN _id;
END; $$;

-- ===== 7. Atomic Financial Operations (RPCs) =====

-- 7.1 Create Financial Account
CREATE OR REPLACE FUNCTION public.create_financial_account(
  _workspace_id UUID,
  _name TEXT,
  _type public.financial_account_type,
  _currency CHAR(3),
  _opening_balance NUMERIC DEFAULT 0.0000,
  _opening_balance_date DATE DEFAULT CURRENT_DATE,
  _description TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _account_id UUID;
  _clean_name TEXT := btrim(_name);
  _clean_currency CHAR(3) := upper(btrim(_currency));
  _init_balance NUMERIC(18, 4) := COALESCE(_opening_balance, 0.0000);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to create financial accounts' USING ERRCODE = '42501';
  END IF;

  IF length(_clean_name) < 1 OR length(_clean_name) > 100 THEN
    RAISE EXCEPTION 'account name must be between 1 and 100 characters' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_currency) <> 3 THEN
    RAISE EXCEPTION 'currency code must be 3 characters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.financial_accounts (
    workspace_id, name, type, currency, opening_balance, opening_balance_date,
    current_balance, status, description, created_by
  ) VALUES (
    _workspace_id, _clean_name, _type, _clean_currency, _init_balance,
    COALESCE(_opening_balance_date, CURRENT_DATE), _init_balance, 'active',
    _description, _uid
  ) RETURNING id INTO _account_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'financial_account.created', 'financial_account', _account_id::text,
    jsonb_build_object(
      'name', _clean_name,
      'type', _type::text,
      'currency', _clean_currency,
      'opening_balance', _init_balance
    )
  );

  RETURN _account_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_financial_account(UUID, TEXT, public.financial_account_type, CHAR(3), NUMERIC, DATE, TEXT) TO authenticated;

-- 7.2 Record Income
CREATE OR REPLACE FUNCTION public.record_income(
  _workspace_id UUID,
  _account_id UUID,
  _amount NUMERIC,
  _transaction_date DATE,
  _description TEXT,
  _category_id UUID DEFAULT NULL,
  _reference TEXT DEFAULT NULL,
  _idempotency_key TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tx_id UUID;
  _acc_currency CHAR(3);
  _acc_status public.financial_account_status;
  _clean_desc TEXT := btrim(_description);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record financial income' USING ERRCODE = '42501';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'transaction amount must be strictly greater than 0' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_desc) < 1 THEN
    RAISE EXCEPTION 'transaction description cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Idempotency check: if key already exists, return existing transaction
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _tx_id FROM public.financial_transactions
    WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _tx_id;
    END IF;
  END IF;

  -- Lock account FOR UPDATE to guarantee atomic balance mutation
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

  -- Insert posted transaction
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, category_id, transaction_type,
    amount, currency, transaction_date, description, reference,
    status, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _account_id, _category_id, 'income',
    _amount, _acc_currency, _transaction_date, _clean_desc, _reference,
    'posted', _idempotency_key, _uid
  ) RETURNING id INTO _tx_id;

  -- Atomic balance increment
  UPDATE public.financial_accounts
  SET current_balance = current_balance + _amount
  WHERE id = _account_id;

  -- Append audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'transaction.income_recorded', 'financial_transaction', _tx_id::text,
    jsonb_build_object(
      'account_id', _account_id,
      'amount', _amount,
      'currency', _acc_currency,
      'transaction_date', _transaction_date,
      'category_id', _category_id
    )
  );

  RETURN _tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_income(UUID, UUID, NUMERIC, DATE, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- 7.3 Record Expense
CREATE OR REPLACE FUNCTION public.record_expense(
  _workspace_id UUID,
  _account_id UUID,
  _amount NUMERIC,
  _transaction_date DATE,
  _description TEXT,
  _category_id UUID DEFAULT NULL,
  _reference TEXT DEFAULT NULL,
  _idempotency_key TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tx_id UUID;
  _acc_currency CHAR(3);
  _acc_status public.financial_account_status;
  _clean_desc TEXT := btrim(_description);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record financial expenses' USING ERRCODE = '42501';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'transaction amount must be strictly greater than 0' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_desc) < 1 THEN
    RAISE EXCEPTION 'transaction description cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Idempotency check
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _tx_id FROM public.financial_transactions
    WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _tx_id;
    END IF;
  END IF;

  -- Lock account FOR UPDATE
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

  -- Insert posted transaction
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, category_id, transaction_type,
    amount, currency, transaction_date, description, reference,
    status, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _account_id, _category_id, 'expense',
    _amount, _acc_currency, _transaction_date, _clean_desc, _reference,
    'posted', _idempotency_key, _uid
  ) RETURNING id INTO _tx_id;

  -- Atomic balance decrement
  UPDATE public.financial_accounts
  SET current_balance = current_balance - _amount
  WHERE id = _account_id;

  -- Append audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'transaction.expense_recorded', 'financial_transaction', _tx_id::text,
    jsonb_build_object(
      'account_id', _account_id,
      'amount', _amount,
      'currency', _acc_currency,
      'transaction_date', _transaction_date,
      'category_id', _category_id
    )
  );

  RETURN _tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_expense(UUID, UUID, NUMERIC, DATE, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- 7.4 Record Transfer (Atomic Dual-Leg Linking with Deadlock-Safe Ordering)
CREATE OR REPLACE FUNCTION public.record_transfer(
  _workspace_id UUID,
  _source_account_id UUID,
  _destination_account_id UUID,
  _amount NUMERIC,
  _transaction_date DATE,
  _description TEXT,
  _reference TEXT DEFAULT NULL,
  _idempotency_key TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _transfer_id UUID;
  _source_tx_id UUID;
  _dest_tx_id UUID;
  _src_curr CHAR(3);
  _src_status public.financial_account_status;
  _dst_curr CHAR(3);
  _dst_status public.financial_account_status;
  _clean_desc TEXT := btrim(_description);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record transfers' USING ERRCODE = '42501';
  END IF;

  IF _source_account_id = _destination_account_id THEN
    RAISE EXCEPTION 'source and destination accounts must be distinct' USING ERRCODE = '22023';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'transfer amount must be strictly greater than 0' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_desc) < 1 THEN
    RAISE EXCEPTION 'transfer description cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Idempotency check: if key already exists on transfer, return transfer_id
  IF _idempotency_key IS NOT NULL THEN
    SELECT transfer_id INTO _transfer_id FROM public.financial_transactions
    WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _transfer_id;
    END IF;
  END IF;

  -- Deadlock prevention: Lock accounts FOR UPDATE in sorted UUID order
  IF _source_account_id < _destination_account_id THEN
    SELECT currency, status INTO _src_curr, _src_status
    FROM public.financial_accounts WHERE id = _source_account_id AND workspace_id = _workspace_id FOR UPDATE;
    SELECT currency, status INTO _dst_curr, _dst_status
    FROM public.financial_accounts WHERE id = _destination_account_id AND workspace_id = _workspace_id FOR UPDATE;
  ELSE
    SELECT currency, status INTO _dst_curr, _dst_status
    FROM public.financial_accounts WHERE id = _destination_account_id AND workspace_id = _workspace_id FOR UPDATE;
    SELECT currency, status INTO _src_curr, _src_status
    FROM public.financial_accounts WHERE id = _source_account_id AND workspace_id = _workspace_id FOR UPDATE;
  END IF;

  IF _src_curr IS NULL THEN
    RAISE EXCEPTION 'source financial account not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _dst_curr IS NULL THEN
    RAISE EXCEPTION 'destination financial account not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _src_status <> 'active' OR _dst_status <> 'active' THEN
    RAISE EXCEPTION 'cannot transfer to or from an archived account' USING ERRCODE = '23514';
  END IF;

  -- Enforce same currency for transfers (no silent conversions)
  IF _src_curr <> _dst_curr THEN
    RAISE EXCEPTION 'cross-currency transfers are not supported. Both accounts must share currency %', _src_curr USING ERRCODE = '23514';
  END IF;

  _transfer_id := gen_random_uuid();

  -- Leg 1: Source deduction
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, transaction_type, amount, currency,
    transaction_date, description, reference, status,
    transfer_id, transfer_role, paired_account_id,
    idempotency_key, created_by
  ) VALUES (
    _workspace_id, _source_account_id, 'transfer', _amount, _src_curr,
    _transaction_date, _clean_desc, _reference, 'posted',
    _transfer_id, 'source', _destination_account_id,
    _idempotency_key, _uid
  ) RETURNING id INTO _source_tx_id;

  -- Leg 2: Destination credit
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, transaction_type, amount, currency,
    transaction_date, description, reference, status,
    transfer_id, transfer_role, paired_account_id,
    idempotency_key, created_by
  ) VALUES (
    _workspace_id, _destination_account_id, 'transfer', _amount, _dst_curr,
    _transaction_date, _clean_desc, _reference, 'posted',
    _transfer_id, 'destination', _source_account_id,
    CASE WHEN _idempotency_key IS NOT NULL THEN _idempotency_key || ':dest' ELSE NULL END, _uid
  ) RETURNING id INTO _dest_tx_id;

  -- Atomic balance updates
  UPDATE public.financial_accounts SET current_balance = current_balance - _amount WHERE id = _source_account_id;
  UPDATE public.financial_accounts SET current_balance = current_balance + _amount WHERE id = _destination_account_id;

  -- Append audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'transaction.transfer_recorded', 'financial_transfer', _transfer_id::text,
    jsonb_build_object(
      'source_account_id', _source_account_id,
      'destination_account_id', _destination_account_id,
      'amount', _amount,
      'currency', _src_curr,
      'transaction_date', _transaction_date,
      'source_tx_id', _source_tx_id,
      'destination_tx_id', _dest_tx_id
    )
  );

  RETURN _transfer_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_transfer(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- 7.5 Record Adjustment (Role-Gated with Mandatory Reason)
CREATE OR REPLACE FUNCTION public.record_adjustment(
  _workspace_id UUID,
  _account_id UUID,
  _delta_amount NUMERIC,
  _transaction_date DATE,
  _reason TEXT,
  _reference TEXT DEFAULT NULL,
  _idempotency_key TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tx_id UUID;
  _acc_currency CHAR(3);
  _acc_status public.financial_account_status;
  _clean_reason TEXT := btrim(_reason);
  _abs_amount NUMERIC(18, 4);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to record financial adjustments' USING ERRCODE = '42501';
  END IF;

  IF _delta_amount IS NULL OR _delta_amount = 0 THEN
    RAISE EXCEPTION 'adjustment delta amount cannot be zero' USING ERRCODE = '22023';
  END IF;

  IF length(_clean_reason) < 3 THEN
    RAISE EXCEPTION 'a detailed reason is mandatory for financial adjustments' USING ERRCODE = '22023';
  END IF;

  -- Idempotency check
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _tx_id FROM public.financial_transactions
    WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _tx_id;
    END IF;
  END IF;

  -- Lock account FOR UPDATE
  SELECT currency, status INTO _acc_currency, _acc_status
  FROM public.financial_accounts
  WHERE id = _account_id AND workspace_id = _workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial account not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _acc_status <> 'active' THEN
    RAISE EXCEPTION 'cannot adjust an archived account' USING ERRCODE = '23514';
  END IF;

  _abs_amount := abs(_delta_amount);

  -- Insert posted adjustment transaction
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, transaction_type,
    amount, currency, transaction_date, description, reference,
    status, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _account_id, 'adjustment',
    _abs_amount, _acc_currency, _transaction_date, _clean_reason,
    COALESCE(_reference, CASE WHEN _delta_amount > 0 THEN 'Adjustment (credit)' ELSE 'Adjustment (debit)' END),
    'posted', _idempotency_key, _uid
  ) RETURNING id INTO _tx_id;

  -- Atomic balance adjustment
  UPDATE public.financial_accounts
  SET current_balance = current_balance + _delta_amount
  WHERE id = _account_id;

  -- Append audit log
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'transaction.adjustment_recorded', 'financial_transaction', _tx_id::text,
    jsonb_build_object(
      'account_id', _account_id,
      'delta_amount', _delta_amount,
      'currency', _acc_currency,
      'reason', _clean_reason
    )
  );

  RETURN _tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_adjustment(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- 7.6 Reverse Transaction (Atomic Preserved History & Zero Net Effect)
CREATE OR REPLACE FUNCTION public.reverse_transaction(
  _workspace_id UUID,
  _transaction_id UUID,
  _reversal_reason TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _orig RECORD;
  _sibling RECORD;
  _rev_tx_id UUID;
  _rev_sibling_id UUID;
  _clean_reason TEXT := btrim(COALESCE(_reversal_reason, ''));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to reverse financial transactions' USING ERRCODE = '42501';
  END IF;

  IF length(_clean_reason) < 3 THEN
    RAISE EXCEPTION 'a detailed reason is mandatory for financial reversals' USING ERRCODE = '22023';
  END IF;

  -- Retrieve and lock original transaction
  SELECT * INTO _orig FROM public.financial_transactions
  WHERE id = _transaction_id AND workspace_id = _workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial transaction not found in workspace' USING ERRCODE = '23503';
  END IF;

  IF _orig.status = 'reversed' OR _orig.reversed_by_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'transaction has already been reversed' USING ERRCODE = '23514';
  END IF;

  -- CASE 1: Transfer Reversal (Atomic reversal of both legs)
  IF _orig.transaction_type = 'transfer' AND _orig.transfer_id IS NOT NULL THEN
    -- Find and lock sibling leg
    SELECT * INTO _sibling FROM public.financial_transactions
    WHERE transfer_id = _orig.transfer_id AND id <> _orig.id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'corrupted transfer: sibling leg missing' USING ERRCODE = '23514';
    END IF;

    -- Lock both accounts in sorted order
    IF _orig.account_id < _orig.paired_account_id THEN
      PERFORM 1 FROM public.financial_accounts WHERE id = _orig.account_id FOR UPDATE;
      PERFORM 1 FROM public.financial_accounts WHERE id = _orig.paired_account_id FOR UPDATE;
    ELSE
      PERFORM 1 FROM public.financial_accounts WHERE id = _orig.paired_account_id FOR UPDATE;
      PERFORM 1 FROM public.financial_accounts WHERE id = _orig.account_id FOR UPDATE;
    END IF;

    -- Create reversal for original leg
    INSERT INTO public.financial_transactions (
      workspace_id, account_id, transaction_type, amount, currency,
      transaction_date, description, reference, status,
      reversal_of_transaction_id, reversal_reason, created_by
    ) VALUES (
      _workspace_id, _orig.account_id, 'adjustment', _orig.amount, _orig.currency,
      CURRENT_DATE, 'Reversal: ' || _orig.description, 'Reversal of transfer ' || _orig.transfer_id::text,
      'posted', _orig.id, _clean_reason, _uid
    ) RETURNING id INTO _rev_tx_id;

    -- Create reversal for sibling leg
    INSERT INTO public.financial_transactions (
      workspace_id, account_id, transaction_type, amount, currency,
      transaction_date, description, reference, status,
      reversal_of_transaction_id, reversal_reason, created_by
    ) VALUES (
      _workspace_id, _sibling.account_id, 'adjustment', _sibling.amount, _sibling.currency,
      CURRENT_DATE, 'Reversal: ' || _sibling.description, 'Reversal of transfer ' || _orig.transfer_id::text,
      'posted', _sibling.id, _clean_reason, _uid
    ) RETURNING id INTO _rev_sibling_id;

    -- Restore balances: if source leg, refund amount (+); if destination leg, deduct amount (-)
    IF _orig.transfer_role = 'source' THEN
      UPDATE public.financial_accounts SET current_balance = current_balance + _orig.amount WHERE id = _orig.account_id;
      UPDATE public.financial_accounts SET current_balance = current_balance - _sibling.amount WHERE id = _sibling.account_id;
    ELSE
      UPDATE public.financial_accounts SET current_balance = current_balance - _orig.amount WHERE id = _orig.account_id;
      UPDATE public.financial_accounts SET current_balance = current_balance + _sibling.amount WHERE id = _sibling.account_id;
    END IF;

    -- Mark both legs reversed
    UPDATE public.financial_transactions SET status = 'reversed', reversed_by_transaction_id = _rev_tx_id WHERE id = _orig.id;
    UPDATE public.financial_transactions SET status = 'reversed', reversed_by_transaction_id = _rev_sibling_id WHERE id = _sibling.id;

    INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      _workspace_id, _uid, 'transaction.reversed', 'financial_transfer', _orig.transfer_id::text,
      jsonb_build_object(
        'transfer_id', _orig.transfer_id,
        'reason', _clean_reason,
        'reversal_tx_id', _rev_tx_id
      )
    );

    RETURN _rev_tx_id;
  END IF;

  -- CASE 2: Income Reversal
  IF _orig.transaction_type = 'income' THEN
    PERFORM 1 FROM public.financial_accounts WHERE id = _orig.account_id FOR UPDATE;

    INSERT INTO public.financial_transactions (
      workspace_id, account_id, category_id, transaction_type, amount, currency,
      transaction_date, description, reference, status,
      reversal_of_transaction_id, reversal_reason, created_by
    ) VALUES (
      _workspace_id, _orig.account_id, _orig.category_id, 'adjustment', _orig.amount, _orig.currency,
      CURRENT_DATE, 'Reversal: ' || _orig.description, 'Reversal of tx ' || _orig.id::text,
      'posted', _orig.id, _clean_reason, _uid
    ) RETURNING id INTO _rev_tx_id;

    -- Balance decreases back
    UPDATE public.financial_accounts SET current_balance = current_balance - _orig.amount WHERE id = _orig.account_id;
    UPDATE public.financial_transactions SET status = 'reversed', reversed_by_transaction_id = _rev_tx_id WHERE id = _orig.id;

    INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      _workspace_id, _uid, 'transaction.reversed', 'financial_transaction', _orig.id::text,
      jsonb_build_object('original_id', _orig.id, 'amount', _orig.amount, 'reason', _clean_reason)
    );

    RETURN _rev_tx_id;
  END IF;

  -- CASE 3: Expense Reversal
  IF _orig.transaction_type = 'expense' THEN
    PERFORM 1 FROM public.financial_accounts WHERE id = _orig.account_id FOR UPDATE;

    INSERT INTO public.financial_transactions (
      workspace_id, account_id, category_id, transaction_type, amount, currency,
      transaction_date, description, reference, status,
      reversal_of_transaction_id, reversal_reason, created_by
    ) VALUES (
      _workspace_id, _orig.account_id, _orig.category_id, 'adjustment', _orig.amount, _orig.currency,
      CURRENT_DATE, 'Reversal: ' || _orig.description, 'Reversal of tx ' || _orig.id::text,
      'posted', _orig.id, _clean_reason, _uid
    ) RETURNING id INTO _rev_tx_id;

    -- Balance increases back
    UPDATE public.financial_accounts SET current_balance = current_balance + _orig.amount WHERE id = _orig.account_id;
    UPDATE public.financial_transactions SET status = 'reversed', reversed_by_transaction_id = _rev_tx_id WHERE id = _orig.id;

    INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      _workspace_id, _uid, 'transaction.reversed', 'financial_transaction', _orig.id::text,
      jsonb_build_object('original_id', _orig.id, 'amount', _orig.amount, 'reason', _clean_reason)
    );

    RETURN _rev_tx_id;
  END IF;

  -- CASE 4: Adjustment Reversal
  IF _orig.transaction_type = 'adjustment' THEN
    PERFORM 1 FROM public.financial_accounts WHERE id = _orig.account_id FOR UPDATE;

    INSERT INTO public.financial_transactions (
      workspace_id, account_id, transaction_type, amount, currency,
      transaction_date, description, reference, status,
      reversal_of_transaction_id, reversal_reason, created_by
    ) VALUES (
      _workspace_id, _orig.account_id, 'adjustment', _orig.amount, _orig.currency,
      CURRENT_DATE, 'Reversal: ' || _orig.description, 'Reversal of tx ' || _orig.id::text,
      'posted', _orig.id, _clean_reason, _uid
    ) RETURNING id INTO _rev_tx_id;

    -- Reverse based on reference sign
    IF _orig.reference LIKE '%(credit)%' THEN
      UPDATE public.financial_accounts SET current_balance = current_balance - _orig.amount WHERE id = _orig.account_id;
    ELSE
      UPDATE public.financial_accounts SET current_balance = current_balance + _orig.amount WHERE id = _orig.account_id;
    END IF;

    UPDATE public.financial_transactions SET status = 'reversed', reversed_by_transaction_id = _rev_tx_id WHERE id = _orig.id;

    INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      _workspace_id, _uid, 'transaction.reversed', 'financial_transaction', _orig.id::text,
      jsonb_build_object('original_id', _orig.id, 'amount', _orig.amount, 'reason', _clean_reason)
    );

    RETURN _rev_tx_id;
  END IF;

  RAISE EXCEPTION 'unsupported transaction type for reversal' USING ERRCODE = '23514';
END; $$;
GRANT EXECUTE ON FUNCTION public.reverse_transaction(UUID, UUID, TEXT) TO authenticated;

-- 7.7 Archive Financial Account (No Physical Delete with History)
CREATE OR REPLACE FUNCTION public.archive_financial_account(
  _workspace_id UUID,
  _account_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _acc_name TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, ARRAY['owner','admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'unauthorized to archive financial accounts' USING ERRCODE = '42501';
  END IF;

  UPDATE public.financial_accounts
  SET status = 'archived'
  WHERE id = _account_id AND workspace_id = _workspace_id
  RETURNING name INTO _acc_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial account not found' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'financial_account.archived', 'financial_account', _account_id::text,
    jsonb_build_object('name', _acc_name)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.archive_financial_account(UUID, UUID) TO authenticated;

-- 7.8 Reconcile Account Balance (Authoritative Verification of Ledger vs Stored State)
CREATE OR REPLACE FUNCTION public.reconcile_account_balance(
  _workspace_id UUID,
  _account_id UUID
) RETURNS TABLE (
  account_id UUID,
  account_name TEXT,
  currency CHAR(3),
  opening_balance NUMERIC(18, 4),
  stored_balance NUMERIC(18, 4),
  calculated_balance NUMERIC(18, 4),
  is_reconciled BOOLEAN,
  variance NUMERIC(18, 4)
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _acc RECORD;
  _calc NUMERIC(18, 4) := 0.0000;
  _net_tx NUMERIC(18, 4) := 0.0000;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'not authorized for workspace' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _acc FROM public.financial_accounts
  WHERE id = _account_id AND workspace_id = _workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial account not found' USING ERRCODE = '23503';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN status = 'reversed' THEN 0.0000
      WHEN transaction_type = 'income' THEN amount
      WHEN transaction_type = 'expense' THEN -amount
      WHEN transaction_type = 'transfer' AND transfer_role = 'destination' THEN amount
      WHEN transaction_type = 'transfer' AND transfer_role = 'source' THEN -amount
      WHEN transaction_type = 'adjustment' THEN
        CASE WHEN reference LIKE '%(debit)%' OR reference LIKE '%(negative)%' THEN -amount ELSE amount END
      ELSE 0.0000
    END
  ), 0.0000) INTO _net_tx
  FROM public.financial_transactions
  WHERE account_id = _account_id;

  _calc := _acc.opening_balance + _net_tx;

  RETURN QUERY SELECT
    _acc.id,
    _acc.name,
    _acc.currency,
    _acc.opening_balance,
    _acc.current_balance,
    _calc,
    (_acc.current_balance = _calc),
    (_acc.current_balance - _calc);
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_account_balance(UUID, UUID) TO authenticated;

-- ===== 8. Row-Level Security (RLS) Policies =====

-- Financial Accounts RLS
CREATE POLICY fa_select_member ON public.financial_accounts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY fa_insert_finance ON public.financial_accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

CREATE POLICY fa_update_finance ON public.financial_accounts FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

-- Financial Categories RLS
CREATE POLICY fc_select_member ON public.financial_categories FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY fc_insert_finance ON public.financial_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

CREATE POLICY fc_update_finance ON public.financial_categories FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

CREATE POLICY fc_delete_admin ON public.financial_categories FOR DELETE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
    AND is_system = false
  );

-- Financial Transactions RLS
CREATE POLICY ft_select_member ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY ft_insert_finance ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

-- Note: Direct update & delete on financial_transactions are blocked by triggers trg_prevent_financial_tx_delete and trg_prevent_financial_tx_mutation.
