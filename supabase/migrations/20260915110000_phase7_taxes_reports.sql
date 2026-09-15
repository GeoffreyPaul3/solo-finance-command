-- ============================================================================
-- SoloOS Phase 7: Taxes + Reporting
-- Migration: 20260915110000_phase7_taxes_reports.sql
-- ============================================================================

-- ===== 1. Tax Summary RPC =====
-- Calculates YTD collected income, deductible expenses, net taxable income,
-- target tax reserve based on workspace_settings.tax_reserve_percent,
-- tracked actual reserve from tax_reserve_adjustments, and shortfall.

CREATE OR REPLACE FUNCTION public.get_tax_summary(
  _workspace_id UUID,
  _tax_year     INT DEFAULT NULL
)
RETURNS TABLE (
  currency                CHAR(3),
  gross_income_ytd        NUMERIC(18,4),
  expenses_ytd            NUMERIC(18,4),
  net_taxable_income_ytd  NUMERIC(18,4),
  tax_reserve_rate        NUMERIC(5,2),
  target_tax_reserve      NUMERIC(18,4),
  tracked_tax_reserve     NUMERIC(18,4),
  shortfall               NUMERIC(18,4),
  is_primary_currency     BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _primary_ccy  CHAR(3);
  _tax_pct      NUMERIC(5,2);
  _year_start   DATE;
  _year_end     DATE;
  _target_year  INT;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT w.currency, COALESCE(ws.tax_reserve_percent, 25.00)
    INTO _primary_ccy, _tax_pct
    FROM public.workspaces w
    JOIN public.workspace_settings ws ON ws.workspace_id = w.id
   WHERE w.id = _workspace_id;

  _target_year := COALESCE(_tax_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
  _year_start := make_date(_target_year, 1, 1);
  _year_end := make_date(_target_year, 12, 31);

  RETURN QUERY
  WITH
  -- 1. Income collected YTD from posted transactions
  inc AS (
    SELECT
      ft.currency::CHAR(3) AS ccy,
      SUM(ft.amount)::NUMERIC(18,4) AS total_inc
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.transaction_type = 'income'
      AND ft.status = 'posted'
      AND ft.transaction_date >= _year_start
      AND ft.transaction_date <= _year_end
    GROUP BY ft.currency
  ),
  -- 2. Deductible expenses YTD from posted transactions
  exp AS (
    SELECT
      ft.currency::CHAR(3) AS ccy,
      SUM(ft.amount)::NUMERIC(18,4) AS total_exp
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.transaction_type = 'expense'
      AND ft.status = 'posted'
      AND ft.transaction_date >= _year_start
      AND ft.transaction_date <= _year_end
    GROUP BY ft.currency
  ),
  -- 3. Tracked tax reserve adjustments
  res AS (
    SELECT
      tra.currency::CHAR(3) AS ccy,
      SUM(tra.amount)::NUMERIC(18,4) AS total_res
    FROM public.tax_reserve_adjustments tra
    WHERE tra.workspace_id = _workspace_id
    GROUP BY tra.currency
  ),
  all_ccys AS (
    SELECT _primary_ccy AS ccy
    UNION SELECT ccy FROM inc
    UNION SELECT ccy FROM exp
    UNION SELECT ccy FROM res
  )
  SELECT
    ac.ccy,
    COALESCE(i.total_inc, 0)::NUMERIC(18,4) AS gross_income_ytd,
    COALESCE(e.total_exp, 0)::NUMERIC(18,4) AS expenses_ytd,
    GREATEST(0, COALESCE(i.total_inc, 0) - COALESCE(e.total_exp, 0))::NUMERIC(18,4) AS net_taxable_income_ytd,
    _tax_pct AS tax_reserve_rate,
    ROUND(GREATEST(0, COALESCE(i.total_inc, 0) - COALESCE(e.total_exp, 0)) * (_tax_pct / 100.0), 4)::NUMERIC(18,4) AS target_tax_reserve,
    COALESCE(r.total_res, 0)::NUMERIC(18,4) AS tracked_tax_reserve,
    GREATEST(0, ROUND(GREATEST(0, COALESCE(i.total_inc, 0) - COALESCE(e.total_exp, 0)) * (_tax_pct / 100.0), 4) - COALESCE(r.total_res, 0))::NUMERIC(18,4) AS shortfall,
    (ac.ccy = _primary_ccy) AS is_primary_currency
  FROM all_ccys ac
  LEFT JOIN inc i ON i.ccy = ac.ccy
  LEFT JOIN exp e ON e.ccy = ac.ccy
  LEFT JOIN res r ON r.ccy = ac.ccy
  ORDER BY (ac.ccy = _primary_ccy) DESC, ac.ccy;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_tax_summary(UUID,INT) TO authenticated;

-- ===== 2. Income Report RPC =====
CREATE OR REPLACE FUNCTION public.get_income_report(
  _workspace_id UUID,
  _date_from    DATE,
  _date_to      DATE,
  _currency     CHAR(3) DEFAULT NULL
)
RETURNS TABLE (
  client_id       UUID,
  client_name     TEXT,
  project_id      UUID,
  project_name    TEXT,
  currency        CHAR(3),
  invoice_count   BIGINT,
  gross_billed    NUMERIC(18,4),
  gross_collected NUMERIC(18,4),
  outstanding     NUMERIC(18,4)
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS client_id,
    c.name::TEXT AS client_name,
    p.id AS project_id,
    COALESCE(p.name, 'No Project')::TEXT AS project_name,
    i.currency::CHAR(3) AS currency,
    COUNT(i.id)::BIGINT AS invoice_count,
    COALESCE(SUM(i.total), 0)::NUMERIC(18,4) AS gross_billed,
    COALESCE(SUM(i.amount_paid), 0)::NUMERIC(18,4) AS gross_collected,
    COALESCE(SUM(i.amount_due), 0)::NUMERIC(18,4) AS outstanding
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  LEFT JOIN public.projects p ON p.id = i.project_id
  WHERE i.workspace_id = _workspace_id
    AND i.issue_date >= _date_from
    AND i.issue_date <= _date_to
    AND i.status <> 'cancelled'
    AND (_currency IS NULL OR i.currency = _currency)
  GROUP BY c.id, c.name, p.id, p.name, i.currency
  ORDER BY gross_collected DESC, gross_billed DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_income_report(UUID,DATE,DATE,CHAR) TO authenticated;

-- ===== 3. Expense Report RPC =====
CREATE OR REPLACE FUNCTION public.get_expense_report(
  _workspace_id UUID,
  _date_from    DATE,
  _date_to      DATE,
  _currency     CHAR(3) DEFAULT NULL
)
RETURNS TABLE (
  category_id           UUID,
  category_name         TEXT,
  vendor                TEXT,
  currency              CHAR(3),
  expense_count         BIGINT,
  total_amount          NUMERIC(18,4),
  tax_deductible_amount NUMERIC(18,4)
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    fc.id AS category_id,
    COALESCE(fc.name, 'Uncategorized')::TEXT AS category_name,
    COALESCE(e.vendor, 'Unknown Vendor')::TEXT AS vendor,
    e.currency::CHAR(3) AS currency,
    COUNT(e.id)::BIGINT AS expense_count,
    COALESCE(SUM(e.amount), 0)::NUMERIC(18,4) AS total_amount,
    COALESCE(SUM(e.amount), 0)::NUMERIC(18,4) AS tax_deductible_amount
  FROM public.expenses e
  LEFT JOIN public.financial_categories fc ON fc.id = e.category_id
  WHERE e.workspace_id = _workspace_id
    AND e.expense_date >= _date_from
    AND e.expense_date <= _date_to
    AND e.status = 'posted'
    AND (_currency IS NULL OR e.currency = _currency)
  GROUP BY fc.id, fc.name, e.vendor, e.currency
  ORDER BY total_amount DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_expense_report(UUID,DATE,DATE,CHAR) TO authenticated;

-- ===== 4. Cashflow Report RPC (Monthly Aggregated) =====
CREATE OR REPLACE FUNCTION public.get_cashflow_report(
  _workspace_id UUID,
  _date_from    DATE,
  _date_to      DATE,
  _currency     CHAR(3) DEFAULT NULL
)
RETURNS TABLE (
  period_start    DATE,
  currency        CHAR(3),
  cash_inflow     NUMERIC(18,4),
  cash_outflow    NUMERIC(18,4),
  net_cashflow    NUMERIC(18,4),
  closing_balance NUMERIC(18,4)
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc('month', _date_from)::DATE,
      date_trunc('month', _date_to)::DATE,
      '1 month'::INTERVAL
    )::DATE AS p_start
  ),
  currencies AS (
    SELECT DISTINCT ft.currency::CHAR(3) AS ccy
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND (_currency IS NULL OR ft.currency = _currency)
    UNION
    SELECT fa.currency::CHAR(3) AS ccy
    FROM public.financial_accounts fa
    WHERE fa.workspace_id = _workspace_id
      AND (_currency IS NULL OR fa.currency = _currency)
  ),
  period_ccy AS (
    SELECT p.p_start, c.ccy
    FROM periods p
    CROSS JOIN currencies c
  ),
  monthly_tx AS (
    SELECT
      date_trunc('month', ft.transaction_date)::DATE AS m_start,
      ft.currency::CHAR(3) AS ccy,
      SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END)::NUMERIC(18,4) AS inflow,
      SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END)::NUMERIC(18,4) AS outflow
    FROM public.financial_transactions ft
    WHERE ft.workspace_id = _workspace_id
      AND ft.status = 'posted'
      AND ft.transaction_date >= _date_from
      AND ft.transaction_date <= _date_to
      AND (_currency IS NULL OR ft.currency = _currency)
    GROUP BY date_trunc('month', ft.transaction_date)::DATE, ft.currency
  )
  SELECT
    pc.p_start AS period_start,
    pc.ccy AS currency,
    COALESCE(mt.inflow, 0)::NUMERIC(18,4) AS cash_inflow,
    COALESCE(mt.outflow, 0)::NUMERIC(18,4) AS cash_outflow,
    (COALESCE(mt.inflow, 0) - COALESCE(mt.outflow, 0))::NUMERIC(18,4) AS net_cashflow,
    (
      SELECT COALESCE(SUM(fa.current_balance), 0)::NUMERIC(18,4)
      FROM public.financial_accounts fa
      WHERE fa.workspace_id = _workspace_id
        AND fa.currency = pc.ccy
        AND fa.status = 'active'
    ) AS closing_balance
  FROM period_ccy pc
  LEFT JOIN monthly_tx mt ON mt.m_start = pc.p_start AND mt.ccy = pc.ccy
  ORDER BY pc.p_start ASC, pc.ccy ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_cashflow_report(UUID,DATE,DATE,CHAR) TO authenticated;

-- ===== 5. Receivables Aging Report RPC =====
CREATE OR REPLACE FUNCTION public.get_receivables_report(
  _workspace_id UUID,
  _currency     CHAR(3) DEFAULT NULL
)
RETURNS TABLE (
  invoice_id      UUID,
  invoice_number  TEXT,
  client_id       UUID,
  client_name     TEXT,
  currency        CHAR(3),
  issue_date      DATE,
  due_date        DATE,
  days_overdue    INT,
  total_amount    NUMERIC(18,4),
  amount_paid     NUMERIC(18,4),
  amount_due      NUMERIC(18,4),
  aging_bucket    TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    i.id AS invoice_id,
    i.invoice_number::TEXT,
    c.id AS client_id,
    c.name::TEXT AS client_name,
    i.currency::CHAR(3),
    i.issue_date,
    i.due_date,
    GREATEST(0, (CURRENT_DATE - i.due_date))::INT AS days_overdue,
    i.total::NUMERIC(18,4) AS total_amount,
    i.amount_paid::NUMERIC(18,4) AS amount_paid,
    i.amount_due::NUMERIC(18,4) AS amount_due,
    CASE
      WHEN i.due_date >= CURRENT_DATE THEN 'current'
      WHEN (CURRENT_DATE - i.due_date) <= 30 THEN '1_30'
      WHEN (CURRENT_DATE - i.due_date) <= 60 THEN '31_60'
      WHEN (CURRENT_DATE - i.due_date) <= 90 THEN '61_90'
      ELSE '90_plus'
    END::TEXT AS aging_bucket
  FROM public.invoices i
  JOIN public.clients c ON c.id = i.client_id
  WHERE i.workspace_id = _workspace_id
    AND i.status IN ('sent', 'partially_paid', 'overdue')
    AND i.amount_due > 0
    AND (_currency IS NULL OR i.currency = _currency)
  ORDER BY i.due_date ASC, i.amount_due DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_receivables_report(UUID,CHAR) TO authenticated;
