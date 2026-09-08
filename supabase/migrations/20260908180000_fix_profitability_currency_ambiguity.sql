-- ============================================================================
-- Fix: Ambiguous "currency" column reference in get_profitability_summary
-- The currencies CTE column was shadowing the function's RETURNS TABLE column.
-- Fix: alias the CTE column as "cur" to eliminate the ambiguity.
-- ============================================================================

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
    SELECT rev.currency AS cur FROM rev
    UNION SELECT exp.currency AS cur FROM exp
  )
  SELECT
    c.cur::CHAR(3)                                                AS currency,
    COALESCE(r.total, 0)::NUMERIC(18,4)                          AS total_revenue,
    COALESCE(e.total, 0)::NUMERIC(18,4)                          AS total_expenses,
    (COALESCE(r.total, 0) - COALESCE(e.total, 0))::NUMERIC(18,4) AS net_profit,
    COALESCE(r.cnt, 0)                                            AS invoice_count,
    COALESCE(e.cnt, 0)                                            AS expense_count
  FROM currencies c
  LEFT JOIN rev r ON r.currency = c.cur
  LEFT JOIN exp e ON e.currency = c.cur
  ORDER BY c.cur;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_profitability_summary(UUID, DATE, DATE) TO authenticated;
