ALTER TABLE customer_types ADD COLUMN IF NOT EXISTS earning_point NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS point_earn_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_amount NUMERIC(10,2) DEFAULT 0,
    redeem_point_value NUMERIC(10,2) DEFAULT 0,
    min_redeem_point NUMERIC(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure there is at least one row
INSERT INTO point_earn_policy (spend_amount, redeem_point_value, min_redeem_point)
SELECT 100, 0, 2000
WHERE NOT EXISTS (SELECT 1 FROM point_earn_policy);

GRANT ALL ON TABLE point_earn_policy TO anon;
GRANT ALL ON TABLE point_earn_policy TO authenticated;
GRANT ALL ON TABLE point_earn_policy TO service_role;
