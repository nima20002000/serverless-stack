-- Optimize Dashboard Stats Performance
-- Creates database functions for efficient revenue aggregation

-- Function to get total revenue (sum of all completed transactions)
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE status = 'COMPLETED';
$$;

-- Function to get monthly revenue (sum of completed transactions for a given month)
CREATE OR REPLACE FUNCTION get_monthly_revenue(month_start TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE status = 'COMPLETED'
    AND "createdAt" >= month_start;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_total_revenue() IS 'Returns total revenue from all completed transactions';
COMMENT ON FUNCTION get_monthly_revenue(TIMESTAMPTZ) IS 'Returns revenue from completed transactions since the specified date';
