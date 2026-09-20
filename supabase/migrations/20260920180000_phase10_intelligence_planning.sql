-- ============================================================================
-- SoloOS Phase 10: Intelligence, Planning & Decision Support
-- Migration: 20260920180000_phase10_intelligence_planning.sql
-- ============================================================================
-- Architecture principles:
--   Goals are PLANNING and DESIGNATION constructs.
--   They do NOT post to financial_transactions or mutate the cash ledger.
--   Invoice reminders are audit logs of dispatched notifications.
--   Client & Project Economics aggregate authoritative invoices, payments,
--   and attributable expenses without fabricating attributions.
-- ============================================================================

-- ===== 1. financial_goals Table =====

CREATE TABLE IF NOT EXISTS public.financial_goals (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL CHECK (length(btrim(name)) >= 1 AND length(name) <= 200),
  category        TEXT          NOT NULL CHECK (category IN (
    'emergency_fund',
    'business_buffer',
    'tax_reserve',
    'equipment',
    'growth_fund',
    'custom'
  )),
  target_amount   NUMERIC(18,4) NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC(18,4) NOT NULL DEFAULT 0.0000 CHECK (current_amount >= 0),
  currency        CHAR(3)       NOT NULL CHECK (length(currency) = 3),
  target_date     DATE,
  status          TEXT          NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'completed',
    'paused',
    'cancelled'
  )),
  notes           TEXT          CHECK (notes IS NULL OR length(notes) <= 2000),
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_goals_workspace_status
  ON public.financial_goals(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_goals_workspace_currency
  ON public.financial_goals(workspace_id, currency);

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;
GRANT ALL ON public.financial_goals TO service_role;

DROP TRIGGER IF EXISTS financial_goals_updated_at ON public.financial_goals;
CREATE TRIGGER financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: Financial Goals
DROP POLICY IF EXISTS "financial_goals_select" ON public.financial_goals;
CREATE POLICY "financial_goals_select" ON public.financial_goals
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "financial_goals_insert" ON public.financial_goals;
CREATE POLICY "financial_goals_insert" ON public.financial_goals
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "financial_goals_update" ON public.financial_goals;
CREATE POLICY "financial_goals_update" ON public.financial_goals
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

DROP POLICY IF EXISTS "financial_goals_delete" ON public.financial_goals;
CREATE POLICY "financial_goals_delete" ON public.financial_goals
  FOR DELETE
  USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance']::public.app_role[]
    )
  );

-- ===== 2. invoice_reminders Table =====

CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id          UUID          NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sent_by             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email     TEXT          NOT NULL CHECK (length(btrim(recipient_email)) >= 3),
  reminder_type       TEXT          NOT NULL DEFAULT 'standard' CHECK (reminder_type IN (
    'upcoming',
    'due',
    'overdue',
    'escalation',
    'standard'
  )),
  subject             TEXT          NOT NULL CHECK (length(subject) <= 500),
  message_body        TEXT          CHECK (message_body IS NULL OR length(message_body) <= 5000),
  provider_message_id TEXT,
  status              TEXT          NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice
  ON public.invoice_reminders(invoice_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_workspace
  ON public.invoice_reminders(workspace_id, sent_at DESC);

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.invoice_reminders TO authenticated;
GRANT ALL ON public.invoice_reminders TO service_role;

DROP POLICY IF EXISTS "invoice_reminders_select" ON public.invoice_reminders;
CREATE POLICY "invoice_reminders_select" ON public.invoice_reminders
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "invoice_reminders_insert" ON public.invoice_reminders;
CREATE POLICY "invoice_reminders_insert" ON public.invoice_reminders
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

-- ===== 3. RPC: get_client_economics =====

CREATE OR REPLACE FUNCTION public.get_client_economics(
  _workspace_id UUID,
  _client_id    UUID DEFAULT NULL
)
RETURNS TABLE (
  client_id               UUID,
  client_name             TEXT,
  currency                CHAR(3),
  total_invoiced          NUMERIC(18,4),
  total_collected         NUMERIC(18,4),
  outstanding_receivables NUMERIC(18,4),
  attributable_expenses   NUMERIC(18,4),
  net_profit              NUMERIC(18,4),
  profit_margin_percent   NUMERIC(8,2),
  total_invoices_count    INT,
  paid_invoices_count     INT,
  overdue_invoices_count  INT,
  avg_days_to_payment     NUMERIC(8,1),
  last_payment_date       DATE
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH client_scope AS (
    SELECT c.id, c.name
    FROM public.clients c
    WHERE c.workspace_id = _workspace_id
      AND (_client_id IS NULL OR c.id = _client_id)
  ),
  inv_summary AS (
    SELECT
      i.client_id,
      i.currency,
      COALESCE(SUM(i.total), 0) AS total_invoiced,
      COALESCE(SUM(i.amount_paid), 0) AS total_collected,
      COALESCE(SUM(CASE WHEN i.status IN ('sent', 'partially_paid', 'overdue') THEN i.amount_due ELSE 0 END), 0) AS outstanding_receivables,
      COUNT(i.id)::INT AS total_invoices_count,
      COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::INT AS paid_invoices_count,
      COUNT(CASE WHEN i.status = 'overdue' OR (i.status IN ('sent', 'partially_paid') AND i.due_date < CURRENT_DATE) THEN 1 END)::INT AS overdue_invoices_count
    FROM public.invoices i
    WHERE i.workspace_id = _workspace_id
      AND i.status <> 'cancelled'
      AND (_client_id IS NULL OR i.client_id = _client_id)
    GROUP BY i.client_id, i.currency
  ),
  exp_summary AS (
    SELECT
      e.client_id,
      e.currency,
      COALESCE(SUM(e.amount), 0) AS attributable_expenses
    FROM public.expenses e
    WHERE e.workspace_id = _workspace_id
      AND e.status = 'posted'
      AND e.client_id IS NOT NULL
      AND (_client_id IS NULL OR e.client_id = _client_id)
    GROUP BY e.client_id, e.currency
  ),
  payment_stats AS (
    -- Average days between invoice issue_date and the final completed payment date for fully paid invoices
    SELECT
      i.client_id,
      i.currency,
      ROUND(AVG(p_latest.latest_paid_date - i.issue_date)::NUMERIC, 1) AS avg_days,
      MAX(p_latest.latest_paid_date) AS last_payment_date
    FROM public.invoices i
    JOIN (
      SELECT
        p.invoice_id,
        MAX(p.payment_date) AS latest_paid_date
      FROM public.payments p
      WHERE p.workspace_id = _workspace_id
        AND p.status = 'posted'
      GROUP BY p.invoice_id
    ) p_latest ON p_latest.invoice_id = i.id
    WHERE i.workspace_id = _workspace_id
      AND i.status = 'paid'
      AND (_client_id IS NULL OR i.client_id = _client_id)
    GROUP BY i.client_id, i.currency
  ),
  all_pairs AS (
    SELECT client_id, currency FROM inv_summary
    UNION
    SELECT client_id, currency FROM exp_summary
  )
  SELECT
    ap.client_id,
    cs.name AS client_name,
    ap.currency,
    COALESCE(inv.total_invoiced, 0)::NUMERIC(18,4) AS total_invoiced,
    COALESCE(inv.total_collected, 0)::NUMERIC(18,4) AS total_collected,
    COALESCE(inv.outstanding_receivables, 0)::NUMERIC(18,4) AS outstanding_receivables,
    COALESCE(exp.attributable_expenses, 0)::NUMERIC(18,4) AS attributable_expenses,
    (COALESCE(inv.total_collected, 0) - COALESCE(exp.attributable_expenses, 0))::NUMERIC(18,4) AS net_profit,
    CASE
      WHEN COALESCE(inv.total_collected, 0) > 0 THEN
        ROUND(((COALESCE(inv.total_collected, 0) - COALESCE(exp.attributable_expenses, 0)) / inv.total_collected * 100)::NUMERIC, 2)
      ELSE 0.00
    END AS profit_margin_percent,
    COALESCE(inv.total_invoices_count, 0)::INT AS total_invoices_count,
    COALESCE(inv.paid_invoices_count, 0)::INT AS paid_invoices_count,
    COALESCE(inv.overdue_invoices_count, 0)::INT AS overdue_invoices_count,
    ps.avg_days AS avg_days_to_payment,
    ps.last_payment_date
  FROM all_pairs ap
  JOIN client_scope cs ON cs.id = ap.client_id
  LEFT JOIN inv_summary inv ON inv.client_id = ap.client_id AND inv.currency = ap.currency
  LEFT JOIN exp_summary exp ON exp.client_id = ap.client_id AND exp.currency = ap.currency
  LEFT JOIN payment_stats ps ON ps.client_id = ap.client_id AND ps.currency = ap.currency
  ORDER BY cs.name, ap.currency;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_client_economics(UUID, UUID) TO authenticated;

-- ===== 4. RPC: get_project_economics =====

CREATE OR REPLACE FUNCTION public.get_project_economics(
  _workspace_id UUID,
  _project_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  project_id                  UUID,
  project_name                TEXT,
  client_id                   UUID,
  client_name                 TEXT,
  currency                    CHAR(3),
  project_revenue             NUMERIC(18,4),
  collected_revenue           NUMERIC(18,4),
  outstanding_revenue         NUMERIC(18,4),
  project_expenses            NUMERIC(18,4),
  net_profit                  NUMERIC(18,4),
  profit_margin_percent       NUMERIC(8,2),
  budget                      NUMERIC(18,4),
  budget_currency             CHAR(3),
  budget_utilization_percent  NUMERIC(8,2),
  budget_variance             NUMERIC(18,4),
  health_state                TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH project_scope AS (
    SELECT
      p.id,
      p.name,
      p.client_id,
      c.name AS client_name,
      p.budget,
      p.budget_currency
    FROM public.projects p
    LEFT JOIN public.clients c ON c.id = p.client_id
    WHERE p.workspace_id = _workspace_id
      AND (_project_id IS NULL OR p.id = _project_id)
  ),
  inv_summary AS (
    SELECT
      i.project_id,
      i.currency,
      COALESCE(SUM(i.total), 0) AS project_revenue,
      COALESCE(SUM(i.amount_paid), 0) AS collected_revenue,
      COALESCE(SUM(CASE WHEN i.status IN ('sent', 'partially_paid', 'overdue') THEN i.amount_due ELSE 0 END), 0) AS outstanding_revenue
    FROM public.invoices i
    WHERE i.workspace_id = _workspace_id
      AND i.status <> 'cancelled'
      AND i.project_id IS NOT NULL
      AND (_project_id IS NULL OR i.project_id = _project_id)
    GROUP BY i.project_id, i.currency
  ),
  exp_summary AS (
    SELECT
      e.project_id,
      e.currency,
      COALESCE(SUM(e.amount), 0) AS project_expenses
    FROM public.expenses e
    WHERE e.workspace_id = _workspace_id
      AND e.status = 'posted'
      AND e.project_id IS NOT NULL
      AND (_project_id IS NULL OR e.project_id = _project_id)
    GROUP BY e.project_id, e.currency
  ),
  all_pairs AS (
    SELECT project_id, currency FROM inv_summary
    UNION
    SELECT project_id, currency FROM exp_summary
    UNION
    -- If project has budget defined, include it even without invoices/expenses
    SELECT ps.id AS project_id, ps.budget_currency AS currency
    FROM project_scope ps
    WHERE ps.budget_currency IS NOT NULL
  )
  SELECT
    ap.project_id,
    ps.name AS project_name,
    ps.client_id,
    ps.client_name,
    ap.currency,
    COALESCE(inv.project_revenue, 0)::NUMERIC(18,4) AS project_revenue,
    COALESCE(inv.collected_revenue, 0)::NUMERIC(18,4) AS collected_revenue,
    COALESCE(inv.outstanding_revenue, 0)::NUMERIC(18,4) AS outstanding_revenue,
    COALESCE(exp.project_expenses, 0)::NUMERIC(18,4) AS project_expenses,
    (COALESCE(inv.collected_revenue, 0) - COALESCE(exp.project_expenses, 0))::NUMERIC(18,4) AS net_profit,
    CASE
      WHEN COALESCE(inv.collected_revenue, 0) > 0 THEN
        ROUND(((COALESCE(inv.collected_revenue, 0) - COALESCE(exp.project_expenses, 0)) / inv.collected_revenue * 100)::NUMERIC, 2)
      ELSE 0.00
    END AS profit_margin_percent,
    CASE WHEN ps.budget_currency = ap.currency THEN ps.budget ELSE NULL END AS budget,
    CASE WHEN ps.budget_currency = ap.currency THEN ps.budget_currency ELSE NULL END AS budget_currency,
    CASE
      WHEN ps.budget_currency = ap.currency AND ps.budget > 0 THEN
        ROUND((COALESCE(exp.project_expenses, 0) / ps.budget * 100)::NUMERIC, 2)
      ELSE NULL
    END AS budget_utilization_percent,
    CASE
      WHEN ps.budget_currency = ap.currency AND ps.budget IS NOT NULL THEN
        (ps.budget - COALESCE(exp.project_expenses, 0))::NUMERIC(18,4)
      ELSE NULL
    END AS budget_variance,
    CASE
      WHEN ps.budget IS NULL OR ps.budget_currency <> ap.currency THEN 'no_budget'
      WHEN COALESCE(exp.project_expenses, 0) > ps.budget THEN 'over_budget'
      WHEN (COALESCE(exp.project_expenses, 0) / NULLIF(ps.budget, 0)) >= 0.80 THEN 'watch'
      ELSE 'on_track'
    END AS health_state
  FROM all_pairs ap
  JOIN project_scope ps ON ps.id = ap.project_id
  LEFT JOIN inv_summary inv ON inv.project_id = ap.project_id AND inv.currency = ap.currency
  LEFT JOIN exp_summary exp ON exp.project_id = ap.project_id AND exp.currency = ap.currency
  ORDER BY ps.name, ap.currency;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_project_economics(UUID, UUID) TO authenticated;
