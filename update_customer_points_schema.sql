-- ==============================================================================
-- Schema update for Customer Loyalty Points & Point Earning Policy
-- ==============================================================================

-- 1. Ensure customer_types has earning_point
ALTER TABLE customer_types ADD COLUMN IF NOT EXISTS earning_point NUMERIC(10,2) DEFAULT 0;

-- 2. Ensure point_earn_policy exists
CREATE TABLE IF NOT EXISTS point_earn_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_amount NUMERIC(10,2) DEFAULT 100,
    redeem_point_value NUMERIC(10,2) DEFAULT 0,
    min_redeem_point NUMERIC(10,2) DEFAULT 2000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO point_earn_policy (spend_amount, redeem_point_value, min_redeem_point)
SELECT 100, 0, 2000
WHERE NOT EXISTS (SELECT 1 FROM point_earn_policy);

-- 3. Add point balance and lifetime points to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_earn_point NUMERIC(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_redeem_point NUMERIC(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_point NUMERIC(12,2) DEFAULT 0;

-- 4. Add earned points column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS earned_points NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS redeem_points NUMERIC(10,2) DEFAULT 0;

-- 5. Point Transaction History (Ledger) Table (Optional & Recommended)
CREATE TABLE IF NOT EXISTS customer_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100),
    sale_id UUID,
    transaction_type VARCHAR(50) DEFAULT 'EARN', -- 'EARN', 'REDEEM', 'ADJUSTMENT'
    points NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(12,2) DEFAULT 0,
    balance_after NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Permissions
GRANT ALL ON TABLE point_earn_policy TO anon, authenticated, service_role;
GRANT ALL ON TABLE customers TO anon, authenticated, service_role;
GRANT ALL ON TABLE sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE customer_point_transactions TO anon, authenticated, service_role;
