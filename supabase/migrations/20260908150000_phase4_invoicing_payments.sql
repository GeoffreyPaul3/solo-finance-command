-- ============================================================================
-- SoloOS Phase 4: Invoicing + Payments
-- Migration: 20260908150000_phase4_invoicing_payments.sql
-- ============================================================================
-- Architecture principle:
--   Invoice → Payment → Financial Transaction → Account Balance
--   The Phase 2 financial engine remains the authoritative cash source.
--   Payments create real financial_transactions; they never maintain their
--   own parallel balance system.
-- ============================================================================

-- ===== 1. Enums =====

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'sent',
    'partially_paid',
    'paid',
    'overdue',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'mobile_money',
    'card',
    'payment_processor',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'posted',
    'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. Invoices Table =====

CREATE TABLE IF NOT EXISTS public.invoices (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id            UUID          NOT NULL REFERENCES public.clients(id),
  project_id           UUID          REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number       TEXT          NOT NULL CHECK (length(btrim(invoice_number)) BETWEEN 1 AND 50),
  status               public.invoice_status NOT NULL DEFAULT 'draft',
  currency             CHAR(3)       NOT NULL CHECK (length(currency) = 3),
  issue_date           DATE          NOT NULL DEFAULT CURRENT_DATE,
  due_date             DATE          NOT NULL,
  subtotal             NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (subtotal >= 0),
  discount_amount      NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (discount_amount >= 0),
  tax_amount           NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (tax_amount >= 0),
  total                NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (total >= 0),
  amount_paid          NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (amount_paid >= 0),
  amount_due           NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (amount_due >= 0),
  notes                TEXT          CHECK (notes IS NULL OR length(notes) <= 5000),
  payment_instructions TEXT          CHECK (payment_instructions IS NULL OR length(payment_instructions) <= 2000),
  created_by           UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Invoice number unique within workspace
  CONSTRAINT uq_invoices_workspace_number UNIQUE (workspace_id, invoice_number),
  -- Due date must be on or after issue date
  CONSTRAINT chk_invoices_dates CHECK (due_date >= issue_date),
  -- Paid cannot exceed total
  CONSTRAINT chk_invoices_paid_lte_total CHECK (amount_paid <= total),
  -- Due cannot be negative or exceed total
  CONSTRAINT chk_invoices_due_lte_total CHECK (amount_due <= total),
  -- total = subtotal - discount + tax
  CONSTRAINT chk_invoices_total_formula CHECK (
    total = subtotal - discount_amount + tax_amount
  ),
  -- amount_due = total - amount_paid
  CONSTRAINT chk_invoices_amount_due CHECK (
    amount_due = total - amount_paid
  )
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status
  ON public.invoices(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_client
  ON public.invoices(workspace_id, client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_project
  ON public.invoices(workspace_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_issue_date
  ON public.invoices(workspace_id, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_due_date
  ON public.invoices(workspace_id, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_number
  ON public.invoices(workspace_id, invoice_number);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 3. Invoice Workspace Integrity Triggers =====

-- Enforce: invoice.client_id must belong to the same workspace
CREATE OR REPLACE FUNCTION public.check_invoice_client_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION
        'Invoice client_id % does not belong to workspace %. Cross-workspace references are prohibited.',
        NEW.client_id, NEW.workspace_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_invoice_client_workspace ON public.invoices;
CREATE TRIGGER trg_invoice_client_workspace
  BEFORE INSERT OR UPDATE OF client_id, workspace_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_invoice_client_workspace();

-- Enforce: invoice.project_id must belong to same workspace and compatible client
CREATE OR REPLACE FUNCTION public.check_invoice_project_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _proj_workspace UUID;
  _proj_client    UUID;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id, client_id INTO _proj_workspace, _proj_client
    FROM public.projects WHERE id = NEW.project_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Project % not found.', NEW.project_id USING ERRCODE = '23503';
    END IF;

    IF _proj_workspace <> NEW.workspace_id THEN
      RAISE EXCEPTION
        'Invoice project_id % does not belong to workspace %. Cross-workspace references are prohibited.',
        NEW.project_id, NEW.workspace_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_invoice_project_workspace ON public.invoices;
CREATE TRIGGER trg_invoice_project_workspace
  BEFORE INSERT OR UPDATE OF project_id, workspace_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_invoice_project_workspace();

-- Prevent physical deletion of invoices (use cancel instead)
CREATE OR REPLACE FUNCTION public.prevent_invoice_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Invoices cannot be physically deleted. Use cancel_invoice() instead to preserve financial history.'
    USING ERRCODE = '23505';
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_invoice_delete ON public.invoices;
CREATE TRIGGER trg_prevent_invoice_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_invoice_delete();

-- ===== 4. RLS: Invoices =====

-- SELECT: any workspace member
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (public.is_workspace_member(workspace_id));

-- INSERT: owner, admin, finance, manager
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

-- UPDATE: owner, admin, finance, manager
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE
  USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  )
  WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

-- ===== 5. Invoice Line Items =====

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID           NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id   UUID           NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description  TEXT           NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 1000),
  quantity     NUMERIC(10,4)  NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(18,4)  NOT NULL CHECK (unit_price >= 0),
  line_total   NUMERIC(18,4)  NOT NULL CHECK (line_total >= 0),
  sort_order   INTEGER        NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- line_total must equal quantity * unit_price (DB-enforced authoritative calculation)
  CONSTRAINT chk_line_item_total CHECK (
    line_total = ROUND(quantity * unit_price, 4)
  )
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice
  ON public.invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_workspace
  ON public.invoice_line_items(workspace_id);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
GRANT ALL ON public.invoice_line_items TO service_role;

DROP TRIGGER IF EXISTS invoice_line_items_updated_at ON public.invoice_line_items;
CREATE TRIGGER invoice_line_items_updated_at
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: Line Items
DROP POLICY IF EXISTS "invoice_line_items_select" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_select" ON public.invoice_line_items
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "invoice_line_items_insert" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_insert" ON public.invoice_line_items
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "invoice_line_items_update" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_update" ON public.invoice_line_items
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance','manager']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance','manager']::public.app_role[]));

DROP POLICY IF EXISTS "invoice_line_items_delete" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_delete" ON public.invoice_line_items
  FOR DELETE USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

-- ===== 6. Payments Table =====

CREATE TABLE IF NOT EXISTS public.payments (
  id                       UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id               UUID                   NOT NULL REFERENCES public.invoices(id),
  financial_transaction_id UUID                   NOT NULL REFERENCES public.financial_transactions(id),
  financial_account_id     UUID                   NOT NULL REFERENCES public.financial_accounts(id),
  amount                   NUMERIC(18,4)          NOT NULL CHECK (amount > 0),
  currency                 CHAR(3)                NOT NULL CHECK (length(currency) = 3),
  payment_date             DATE                   NOT NULL,
  payment_method           public.payment_method  NOT NULL DEFAULT 'bank_transfer',
  reference                TEXT                   CHECK (reference IS NULL OR length(reference) <= 200),
  notes                    TEXT                   CHECK (notes IS NULL OR length(notes) <= 2000),
  status                   public.payment_status  NOT NULL DEFAULT 'posted',
  idempotency_key          TEXT,
  created_by               UUID                   REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ            NOT NULL DEFAULT now()
);

-- Idempotency: one result per key per workspace
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_workspace_idempotency
  ON public.payments(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- One financial_transaction per payment (1:1 linkage)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_financial_transaction
  ON public.payments(financial_transaction_id);

CREATE INDEX IF NOT EXISTS idx_payments_workspace_invoice
  ON public.payments(workspace_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_workspace_date
  ON public.payments(workspace_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_workspace_status
  ON public.payments(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_financial_transaction
  ON public.payments(financial_transaction_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Prevent physical deletion of payments (use reversal instead)
CREATE OR REPLACE FUNCTION public.prevent_payment_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Payments cannot be physically deleted. Use reverse_invoice_payment() to preserve financial history.'
    USING ERRCODE = '23505';
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_payment_delete ON public.payments;
CREATE TRIGGER trg_prevent_payment_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_delete();

-- RLS: Payments
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));

-- ===== 7. Invoice Status Computation Helper =====

CREATE OR REPLACE FUNCTION public.compute_invoice_status(
  _status        public.invoice_status,
  _amount_paid   NUMERIC,
  _total         NUMERIC,
  _amount_due    NUMERIC,
  _due_date      DATE
) RETURNS public.invoice_status LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Terminal states preserved
  IF _status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF _status = 'draft' THEN RETURN 'draft'; END IF;

  -- Financial states from amounts
  IF _amount_paid >= _total AND _total > 0 THEN
    RETURN 'paid';
  ELSIF _amount_paid > 0 AND _amount_due > 0 THEN
    RETURN 'partially_paid';
  ELSIF _amount_paid = 0 AND _due_date < CURRENT_DATE THEN
    RETURN 'overdue';
  ELSE
    RETURN 'sent';
  END IF;
END; $$;

-- ===== 8. Create Invoice RPC =====

CREATE OR REPLACE FUNCTION public.create_invoice(
  _workspace_id        UUID,
  _client_id           UUID,
  _project_id          UUID          DEFAULT NULL,
  _currency            CHAR(3)       DEFAULT 'USD',
  _issue_date          DATE          DEFAULT CURRENT_DATE,
  _due_date            DATE          DEFAULT NULL,
  _discount_amount     NUMERIC       DEFAULT 0,
  _tax_amount          NUMERIC       DEFAULT 0,
  _notes               TEXT          DEFAULT NULL,
  _payment_instructions TEXT         DEFAULT NULL,
  _line_items          JSONB         DEFAULT '[]'::JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid              UUID := auth.uid();
  _invoice_id       UUID;
  _inv_number       TEXT;
  _prefix           TEXT;
  _next_num         INTEGER;
  _subtotal         NUMERIC(18,4) := 0;
  _total            NUMERIC(18,4);
  _line             JSONB;
  _qty              NUMERIC(10,4);
  _price            NUMERIC(18,4);
  _ltotal           NUMERIC(18,4);
  _sort_order       INTEGER := 0;
  _clean_currency   CHAR(3);
  _effective_due    DATE;
  _default_terms    INTEGER;
BEGIN
  -- Authentication check
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  -- Authorization check
  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance','manager']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized to create invoices in this workspace' USING ERRCODE = '42501';
  END IF;

  -- Currency normalization
  _clean_currency := upper(btrim(_currency));
  IF length(_clean_currency) <> 3 THEN
    RAISE EXCEPTION 'currency must be a 3-character ISO code' USING ERRCODE = '22023';
  END IF;

  -- Client workspace validation
  IF NOT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _client_id AND workspace_id = _workspace_id
  ) THEN
    RAISE EXCEPTION 'client % does not belong to workspace %', _client_id, _workspace_id
      USING ERRCODE = '23514';
  END IF;

  -- Project workspace validation (if provided)
  IF _project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = _project_id AND workspace_id = _workspace_id
    ) THEN
      RAISE EXCEPTION 'project % does not belong to workspace %', _project_id, _workspace_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Discount / Tax validation
  IF COALESCE(_discount_amount, 0) < 0 THEN
    RAISE EXCEPTION 'discount_amount cannot be negative' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(_tax_amount, 0) < 0 THEN
    RAISE EXCEPTION 'tax_amount cannot be negative' USING ERRCODE = '22023';
  END IF;

  -- Validate line items are present
  IF _line_items IS NULL OR jsonb_array_length(_line_items) = 0 THEN
    RAISE EXCEPTION 'at least one line item is required' USING ERRCODE = '22023';
  END IF;

  -- Validate each line item and compute subtotal
  FOR _line IN SELECT * FROM jsonb_array_elements(_line_items) LOOP
    IF _line->>'description' IS NULL OR btrim(_line->>'description') = '' THEN
      RAISE EXCEPTION 'line item description cannot be empty' USING ERRCODE = '22023';
    END IF;

    _qty := (_line->>'quantity')::NUMERIC(10,4);
    _price := (_line->>'unit_price')::NUMERIC(18,4);

    IF _qty IS NULL OR _qty <= 0 THEN
      RAISE EXCEPTION 'line item quantity must be greater than 0' USING ERRCODE = '22023';
    END IF;
    IF _price IS NULL OR _price < 0 THEN
      RAISE EXCEPTION 'line item unit_price cannot be negative' USING ERRCODE = '22023';
    END IF;

    _ltotal := ROUND(_qty * _price, 4);
    _subtotal := _subtotal + _ltotal;
  END LOOP;

  -- Calculate total
  _total := _subtotal - COALESCE(_discount_amount, 0) + COALESCE(_tax_amount, 0);
  IF _total < 0 THEN
    RAISE EXCEPTION 'invoice total cannot be negative (discount exceeds subtotal + tax)' USING ERRCODE = '22023';
  END IF;

  -- Effective due date
  IF _due_date IS NULL THEN
    SELECT COALESCE(default_payment_terms_days, 14) INTO _default_terms
    FROM public.workspace_settings WHERE workspace_id = _workspace_id;
    _effective_due := COALESCE(_issue_date, CURRENT_DATE) + COALESCE(_default_terms, 14);
  ELSE
    _effective_due := _due_date;
  END IF;

  IF _effective_due < COALESCE(_issue_date, CURRENT_DATE) THEN
    RAISE EXCEPTION 'due_date must be on or after issue_date' USING ERRCODE = '22023';
  END IF;

  -- ===== ATOMIC INVOICE NUMBER GENERATION =====
  -- Lock workspace_settings to serialize invoice number generation
  SELECT invoice_number_prefix, invoice_next_number
    INTO _prefix, _next_num
    FROM public.workspace_settings
    WHERE workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'workspace settings not found for workspace %', _workspace_id USING ERRCODE = '23503';
  END IF;

  _prefix := COALESCE(btrim(_prefix), 'INV');
  _next_num := COALESCE(_next_num, 1);

  -- Format: PREFIX-000001 (6-digit zero-padded)
  _inv_number := _prefix || '-' || lpad(_next_num::TEXT, 6, '0');

  -- Increment sequence
  UPDATE public.workspace_settings
    SET invoice_next_number = _next_num + 1
    WHERE workspace_id = _workspace_id;

  -- ===== INSERT INVOICE =====
  INSERT INTO public.invoices (
    workspace_id, client_id, project_id,
    invoice_number, status, currency,
    issue_date, due_date,
    subtotal, discount_amount, tax_amount, total,
    amount_paid, amount_due,
    notes, payment_instructions, created_by
  ) VALUES (
    _workspace_id, _client_id, _project_id,
    _inv_number, 'draft', _clean_currency,
    COALESCE(_issue_date, CURRENT_DATE), _effective_due,
    _subtotal,
    COALESCE(_discount_amount, 0),
    COALESCE(_tax_amount, 0),
    _total,
    0, _total,
    _notes, _payment_instructions, _uid
  ) RETURNING id INTO _invoice_id;

  -- ===== INSERT LINE ITEMS =====
  _sort_order := 0;
  FOR _line IN SELECT * FROM jsonb_array_elements(_line_items) LOOP
    _qty := (_line->>'quantity')::NUMERIC(10,4);
    _price := (_line->>'unit_price')::NUMERIC(18,4);
    _ltotal := ROUND(_qty * _price, 4);

    INSERT INTO public.invoice_line_items (
      workspace_id, invoice_id,
      description, quantity, unit_price, line_total, sort_order
    ) VALUES (
      _workspace_id, _invoice_id,
      btrim(_line->>'description'), _qty, _price, _ltotal, _sort_order
    );
    _sort_order := _sort_order + 1;
  END LOOP;

  -- Audit
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'invoice.created', 'invoice', _invoice_id::text,
    jsonb_build_object(
      'invoice_number', _inv_number,
      'client_id', _client_id,
      'project_id', _project_id,
      'currency', _clean_currency,
      'total', _total
    )
  );

  RETURN _invoice_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID,UUID,UUID,CHAR(3),DATE,DATE,NUMERIC,NUMERIC,TEXT,TEXT,JSONB) TO authenticated;

-- ===== 9. Update Invoice RPC =====

CREATE OR REPLACE FUNCTION public.update_invoice(
  _workspace_id         UUID,
  _invoice_id           UUID,
  _client_id            UUID          DEFAULT NULL,
  _project_id           UUID          DEFAULT NULL,
  _project_id_clear     BOOLEAN       DEFAULT FALSE,
  _currency             CHAR(3)       DEFAULT NULL,
  _issue_date           DATE          DEFAULT NULL,
  _due_date             DATE          DEFAULT NULL,
  _discount_amount      NUMERIC       DEFAULT NULL,
  _tax_amount           NUMERIC       DEFAULT NULL,
  _notes                TEXT          DEFAULT NULL,
  _payment_instructions TEXT          DEFAULT NULL,
  _line_items           JSONB         DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid           UUID := auth.uid();
  _inv           RECORD;
  _subtotal      NUMERIC(18,4);
  _total         NUMERIC(18,4);
  _line          JSONB;
  _qty           NUMERIC(10,4);
  _price         NUMERIC(18,4);
  _ltotal        NUMERIC(18,4);
  _sort_order    INTEGER;
  _disc          NUMERIC(18,4);
  _tax           NUMERIC(18,4);
  _new_currency  CHAR(3);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance','manager']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized to update invoices' USING ERRCODE = '42501';
  END IF;

  -- Lock the invoice for this operation
  SELECT * INTO _inv
    FROM public.invoices
    WHERE id = _invoice_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice % not found in workspace %', _invoice_id, _workspace_id
      USING ERRCODE = '23503';
  END IF;

  -- Only draft (and sent with no payments) are editable
  IF _inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'cancelled invoices cannot be edited' USING ERRCODE = '23514';
  END IF;

  IF _inv.status = 'paid' THEN
    RAISE EXCEPTION 'paid invoices are financially immutable' USING ERRCODE = '23514';
  END IF;

  -- Once payments exist, line items and financial totals are immutable
  IF _inv.amount_paid > 0 AND _line_items IS NOT NULL THEN
    RAISE EXCEPTION 'line items cannot be changed after a payment has been received' USING ERRCODE = '23514';
  END IF;

  IF _inv.amount_paid > 0 AND (
    _currency IS NOT NULL OR _discount_amount IS NOT NULL OR _tax_amount IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'financial fields (currency, discount, tax) cannot be changed after payment' USING ERRCODE = '23514';
  END IF;

  -- Validate new client if changing
  IF _client_id IS NOT NULL AND _client_id <> _inv.client_id THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'client % does not belong to this workspace', _client_id USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Validate new project if changing
  IF _project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND workspace_id = _workspace_id) THEN
      RAISE EXCEPTION 'project % does not belong to this workspace', _project_id USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Recalculate totals from line items if provided
  IF _line_items IS NOT NULL THEN
    IF jsonb_array_length(_line_items) = 0 THEN
      RAISE EXCEPTION 'at least one line item is required' USING ERRCODE = '22023';
    END IF;

    _subtotal := 0;
    FOR _line IN SELECT * FROM jsonb_array_elements(_line_items) LOOP
      IF _line->>'description' IS NULL OR btrim(_line->>'description') = '' THEN
        RAISE EXCEPTION 'line item description cannot be empty' USING ERRCODE = '22023';
      END IF;
      _qty := (_line->>'quantity')::NUMERIC(10,4);
      _price := (_line->>'unit_price')::NUMERIC(18,4);
      IF _qty IS NULL OR _qty <= 0 THEN
        RAISE EXCEPTION 'line item quantity must be greater than 0' USING ERRCODE = '22023';
      END IF;
      IF _price IS NULL OR _price < 0 THEN
        RAISE EXCEPTION 'line item unit_price cannot be negative' USING ERRCODE = '22023';
      END IF;
      _ltotal := ROUND(_qty * _price, 4);
      _subtotal := _subtotal + _ltotal;
    END LOOP;

    _disc := COALESCE(_discount_amount, _inv.discount_amount);
    _tax  := COALESCE(_tax_amount, _inv.tax_amount);
    _total := _subtotal - _disc + _tax;

    IF _total < 0 THEN
      RAISE EXCEPTION 'invoice total cannot be negative' USING ERRCODE = '22023';
    END IF;

    -- Replace line items
    DELETE FROM public.invoice_line_items WHERE invoice_id = _invoice_id;

    _sort_order := 0;
    FOR _line IN SELECT * FROM jsonb_array_elements(_line_items) LOOP
      _qty := (_line->>'quantity')::NUMERIC(10,4);
      _price := (_line->>'unit_price')::NUMERIC(18,4);
      _ltotal := ROUND(_qty * _price, 4);
      INSERT INTO public.invoice_line_items (
        workspace_id, invoice_id, description, quantity, unit_price, line_total, sort_order
      ) VALUES (
        _workspace_id, _invoice_id, btrim(_line->>'description'), _qty, _price, _ltotal, _sort_order
      );
      _sort_order := _sort_order + 1;
    END LOOP;
  ELSE
    _subtotal := _inv.subtotal;
    _disc := COALESCE(_discount_amount, _inv.discount_amount);
    _tax  := COALESCE(_tax_amount, _inv.tax_amount);
    _total := _subtotal - _disc + _tax;
  END IF;

  _new_currency := COALESCE(upper(btrim(_currency)), _inv.currency);

  -- Update invoice
  UPDATE public.invoices SET
    client_id            = COALESCE(_client_id, client_id),
    project_id           = CASE
                             WHEN _project_id_clear THEN NULL
                             WHEN _project_id IS NOT NULL THEN _project_id
                             ELSE project_id
                           END,
    currency             = _new_currency,
    issue_date           = COALESCE(_issue_date, issue_date),
    due_date             = COALESCE(_due_date, due_date),
    subtotal             = _subtotal,
    discount_amount      = _disc,
    tax_amount           = _tax,
    total                = _total,
    amount_due           = _total - amount_paid,
    notes                = COALESCE(_notes, notes),
    payment_instructions = COALESCE(_payment_instructions, payment_instructions)
  WHERE id = _invoice_id AND workspace_id = _workspace_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'invoice.updated', 'invoice', _invoice_id::text,
    jsonb_build_object('invoice_id', _invoice_id)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.update_invoice(UUID,UUID,UUID,UUID,BOOLEAN,CHAR(3),DATE,DATE,NUMERIC,NUMERIC,TEXT,TEXT,JSONB) TO authenticated;

-- ===== 10. Send Invoice RPC =====

CREATE OR REPLACE FUNCTION public.send_invoice(
  _workspace_id UUID,
  _invoice_id   UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid  UUID := auth.uid();
  _inv  RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance','manager']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _inv
    FROM public.invoices
    WHERE id = _invoice_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice % not found', _invoice_id USING ERRCODE = '23503';
  END IF;

  IF _inv.status <> 'draft' THEN
    RAISE EXCEPTION 'only draft invoices can be sent (current status: %)', _inv.status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.invoices
    SET status = 'sent'
    WHERE id = _invoice_id AND workspace_id = _workspace_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'invoice.sent', 'invoice', _invoice_id::text,
    jsonb_build_object('invoice_number', _inv.invoice_number)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.send_invoice(UUID, UUID) TO authenticated;

-- ===== 11. Cancel Invoice RPC =====

CREATE OR REPLACE FUNCTION public.cancel_invoice(
  _workspace_id UUID,
  _invoice_id   UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid  UUID := auth.uid();
  _inv  RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized to cancel invoices' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _inv
    FROM public.invoices
    WHERE id = _invoice_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice % not found', _invoice_id USING ERRCODE = '23503';
  END IF;

  IF _inv.status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'only draft or sent invoices can be cancelled (current status: %)', _inv.status
      USING ERRCODE = '23514';
  END IF;

  IF _inv.amount_paid > 0 THEN
    RAISE EXCEPTION 'invoices with received payments cannot be cancelled' USING ERRCODE = '23514';
  END IF;

  UPDATE public.invoices
    SET status = 'cancelled'
    WHERE id = _invoice_id AND workspace_id = _workspace_id;

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'invoice.cancelled', 'invoice', _invoice_id::text,
    jsonb_build_object('invoice_number', _inv.invoice_number)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(UUID, UUID) TO authenticated;

-- ===== 12. Record Invoice Payment RPC (Atomic) =====

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _workspace_id      UUID,
  _invoice_id        UUID,
  _amount            NUMERIC,
  _payment_date      DATE,
  _payment_method    public.payment_method DEFAULT 'bank_transfer',
  _financial_account_id UUID DEFAULT NULL,
  _reference         TEXT DEFAULT NULL,
  _notes             TEXT DEFAULT NULL,
  _idempotency_key   TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid           UUID := auth.uid();
  _payment_id    UUID;
  _tx_id         UUID;
  _inv           RECORD;
  _acc           RECORD;
  _existing_paid NUMERIC(18,4);
  _new_paid      NUMERIC(18,4);
  _new_due       NUMERIC(18,4);
  _new_status    public.invoice_status;
  _clean_ref     TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized to record payments' USING ERRCODE = '42501';
  END IF;

  -- Idempotency: return existing payment if key already used
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _payment_id
      FROM public.payments
      WHERE workspace_id = _workspace_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN _payment_id;
    END IF;
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be greater than 0' USING ERRCODE = '22023';
  END IF;

  -- Lock invoice FOR UPDATE (concurrency protection)
  SELECT * INTO _inv
    FROM public.invoices
    WHERE id = _invoice_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice % not found in workspace %', _invoice_id, _workspace_id
      USING ERRCODE = '23503';
  END IF;

  -- Invoice must be in a payable state
  IF _inv.status IN ('draft', 'cancelled') THEN
    RAISE EXCEPTION 'invoice is in status % and cannot receive payments', _inv.status
      USING ERRCODE = '23514';
  END IF;

  -- Re-compute authoritative amount_due from posted payments (defensive double-check)
  SELECT COALESCE(SUM(amount), 0) INTO _existing_paid
    FROM public.payments
    WHERE invoice_id = _invoice_id AND status = 'posted';

  _new_paid := _existing_paid + _amount;

  IF _new_paid > _inv.total THEN
    RAISE EXCEPTION 'payment of % would exceed invoice total of % (already paid: %)',
      _amount, _inv.total, _existing_paid
      USING ERRCODE = '23514';
  END IF;

  -- Validate financial account
  IF _financial_account_id IS NULL THEN
    RAISE EXCEPTION 'a financial account must be specified to receive the payment' USING ERRCODE = '22023';
  END IF;

  -- Lock financial account FOR UPDATE
  SELECT * INTO _acc
    FROM public.financial_accounts
    WHERE id = _financial_account_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'financial account % not found in workspace %', _financial_account_id, _workspace_id
      USING ERRCODE = '23503';
  END IF;

  IF _acc.status <> 'active' THEN
    RAISE EXCEPTION 'cannot receive payment into an archived account' USING ERRCODE = '23514';
  END IF;

  -- Currency must match invoice currency
  IF upper(_acc.currency) <> upper(_inv.currency) THEN
    RAISE EXCEPTION 'account currency % does not match invoice currency %',
      _acc.currency, _inv.currency
      USING ERRCODE = '23514';
  END IF;

  -- ===== Create financial transaction (income) =====
  _clean_ref := btrim(COALESCE(_reference, ''));
  IF length(_clean_ref) = 0 THEN _clean_ref := NULL; END IF;

  INSERT INTO public.financial_transactions (
    workspace_id, account_id, transaction_type,
    amount, currency, transaction_date,
    description, reference, status,
    source_type, idempotency_key, created_by
  ) VALUES (
    _workspace_id, _financial_account_id, 'income',
    _amount, _acc.currency, _payment_date,
    'Payment for invoice ' || _inv.invoice_number,
    _clean_ref,
    'posted',
    'invoice_payment',
    _idempotency_key,
    _uid
  ) RETURNING id INTO _tx_id;

  -- Update account balance (same pattern as record_income)
  UPDATE public.financial_accounts
    SET current_balance = current_balance + _amount
    WHERE id = _financial_account_id;

  -- Update source_id on the transaction to reference the payment (set after payment insert)
  _payment_id := gen_random_uuid();

  -- Insert payment record
  INSERT INTO public.payments (
    id, workspace_id, invoice_id, financial_transaction_id,
    financial_account_id, amount, currency,
    payment_date, payment_method, reference, notes,
    status, idempotency_key, created_by
  ) VALUES (
    _payment_id, _workspace_id, _invoice_id, _tx_id,
    _financial_account_id, _amount, _acc.currency,
    _payment_date, _payment_method, _clean_ref, _notes,
    'posted', _idempotency_key, _uid
  );

  -- Update transaction source_id to point at payment
  UPDATE public.financial_transactions
    SET source_id = _payment_id::text
    WHERE id = _tx_id;

  -- Recalculate invoice payment state
  _new_due := _inv.total - _new_paid;
  _new_status := public.compute_invoice_status(
    _inv.status, _new_paid, _inv.total, _new_due, _inv.due_date
  );

  UPDATE public.invoices SET
    amount_paid = _new_paid,
    amount_due  = _new_due,
    status      = _new_status
  WHERE id = _invoice_id AND workspace_id = _workspace_id;

  -- Audit
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'payment.created', 'payment', _payment_id::text,
    jsonb_build_object(
      'invoice_id', _invoice_id,
      'invoice_number', _inv.invoice_number,
      'amount', _amount,
      'currency', _acc.currency,
      'payment_method', _payment_method::text,
      'financial_account_id', _financial_account_id,
      'financial_transaction_id', _tx_id,
      'new_status', _new_status::text
    )
  );

  RETURN _payment_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(UUID,UUID,NUMERIC,DATE,public.payment_method,UUID,TEXT,TEXT,TEXT) TO authenticated;

-- ===== 13. Reverse Invoice Payment RPC =====

CREATE OR REPLACE FUNCTION public.reverse_invoice_payment(
  _workspace_id    UUID,
  _payment_id      UUID,
  _reversal_reason TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid           UUID := auth.uid();
  _pmt           RECORD;
  _inv           RECORD;
  _reversal_tx   UUID;
  _new_paid      NUMERIC(18,4);
  _new_due       NUMERIC(18,4);
  _new_status    public.invoice_status;
  _clean_reason  TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_workspace_role(
    _workspace_id,
    ARRAY['owner','admin','finance']::public.app_role[]
  ) THEN
    RAISE EXCEPTION 'unauthorized to reverse payments' USING ERRCODE = '42501';
  END IF;

  _clean_reason := btrim(COALESCE(_reversal_reason, ''));
  IF length(_clean_reason) < 3 THEN
    RAISE EXCEPTION 'a reversal reason of at least 3 characters is required' USING ERRCODE = '22023';
  END IF;

  -- Lock payment FOR UPDATE
  SELECT * INTO _pmt
    FROM public.payments
    WHERE id = _payment_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment % not found in workspace %', _payment_id, _workspace_id
      USING ERRCODE = '23503';
  END IF;

  IF _pmt.status = 'reversed' THEN
    RAISE EXCEPTION 'payment % has already been reversed', _payment_id USING ERRCODE = '23514';
  END IF;

  -- Lock invoice FOR UPDATE
  SELECT * INTO _inv
    FROM public.invoices
    WHERE id = _pmt.invoice_id AND workspace_id = _workspace_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice % not found', _pmt.invoice_id USING ERRCODE = '23503';
  END IF;

  -- ===== Reverse the financial transaction (following Phase 2 reversal semantics) =====
  -- Create reversal transaction
  INSERT INTO public.financial_transactions (
    workspace_id, account_id, transaction_type,
    amount, currency, transaction_date,
    description, status,
    reversal_of_transaction_id, reversal_reason,
    source_type, source_id, created_by
  ) VALUES (
    _workspace_id, _pmt.financial_account_id, 'income',
    _pmt.amount, _pmt.currency, CURRENT_DATE,
    'Reversal: Payment for invoice ' || _inv.invoice_number,
    'reversed',
    _pmt.financial_transaction_id, _clean_reason,
    'invoice_payment_reversal', _payment_id::text, _uid
  ) RETURNING id INTO _reversal_tx;

  -- Mark original transaction as reversed
  UPDATE public.financial_transactions
    SET status = 'reversed',
        reversed_by_transaction_id = _reversal_tx,
        reversal_reason = _clean_reason
    WHERE id = _pmt.financial_transaction_id;

  -- Deduct from account balance (undo the original income)
  UPDATE public.financial_accounts
    SET current_balance = current_balance - _pmt.amount
    WHERE id = _pmt.financial_account_id;

  -- Mark payment as reversed
  UPDATE public.payments
    SET status = 'reversed'
    WHERE id = _payment_id;

  -- Recalculate invoice: use authoritative sum of posted payments
  SELECT COALESCE(SUM(amount), 0) INTO _new_paid
    FROM public.payments
    WHERE invoice_id = _pmt.invoice_id AND status = 'posted';

  _new_due := _inv.total - _new_paid;
  _new_status := public.compute_invoice_status(
    _inv.status, _new_paid, _inv.total, _new_due, _inv.due_date
  );

  UPDATE public.invoices SET
    amount_paid = _new_paid,
    amount_due  = _new_due,
    status      = _new_status
  WHERE id = _pmt.invoice_id AND workspace_id = _workspace_id;

  -- Audit
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    _workspace_id, _uid, 'payment.reversed', 'payment', _payment_id::text,
    jsonb_build_object(
      'invoice_id', _pmt.invoice_id,
      'invoice_number', _inv.invoice_number,
      'amount', _pmt.amount,
      'reversal_reason', _clean_reason,
      'original_transaction_id', _pmt.financial_transaction_id,
      'reversal_transaction_id', _reversal_tx,
      'new_invoice_status', _new_status::text
    )
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.reverse_invoice_payment(UUID, UUID, TEXT) TO authenticated;

-- ===== 14. Workspace Receivables Summary Helper =====

CREATE OR REPLACE FUNCTION public.get_workspace_receivables_summary(
  _workspace_id UUID
) RETURNS TABLE (
  total_outstanding    NUMERIC,
  total_overdue        NUMERIC,
  invoices_this_month  BIGINT,
  active_invoice_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','draft') THEN amount_due ELSE 0 END), 0) AS total_outstanding,
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount_due ELSE 0 END), 0) AS total_overdue,
    COUNT(CASE WHEN DATE_TRUNC('month', issue_date) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::BIGINT AS invoices_this_month,
    COUNT(CASE WHEN status NOT IN ('cancelled', 'draft') THEN 1 END)::BIGINT AS active_invoice_count
  FROM public.invoices
  WHERE workspace_id = _workspace_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_workspace_receivables_summary(UUID) TO authenticated;

-- ===== 15. Comments =====

COMMENT ON TABLE public.invoices IS
  'SoloOS Phase 4: Receivables. Each invoice belongs to exactly one workspace and one client. Amounts stored as NUMERIC(18,4). Status computed from payment state. Numbers generated atomically via workspace_settings sequence.';

COMMENT ON TABLE public.invoice_line_items IS
  'SoloOS Phase 4: Invoice line items. line_total = ROUND(quantity * unit_price, 4) enforced by DB constraint. Invoice subtotal computed server-side only.';

COMMENT ON TABLE public.payments IS
  'SoloOS Phase 4: Payments against invoices. Each payment creates one financial_transaction (income) in the Phase 2 financial engine. Reversals use Phase 2 reversal semantics. No parallel balance system.';

COMMENT ON FUNCTION public.record_invoice_payment IS
  'Atomic payment recording: locks invoice + account, validates currency/workspace/amount, creates financial_transaction, inserts payment, recalculates invoice status. All-or-nothing.';

COMMENT ON FUNCTION public.reverse_invoice_payment IS
  'Atomic payment reversal: marks payment reversed, creates reversal financial_transaction, decrements account balance, recalculates invoice status. Preserves all history.';
