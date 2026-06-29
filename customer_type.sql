CREATE TABLE IF NOT EXISTS customer_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    promo_price VARCHAR(50) NOT NULL DEFAULT 'MRP',
    scan_card_on_sale BOOLEAN DEFAULT false,
    send_sms_to_customer BOOLEAN DEFAULT false,
    visible_in_pos BOOLEAN DEFAULT false,
    other_promotion_applicable BOOLEAN DEFAULT false,
    accounts_head_creation BOOLEAN DEFAULT false,
    welcome_sms BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grant permissions to Supabase API roles
GRANT ALL ON TABLE customer_types TO anon;
GRANT ALL ON TABLE customer_types TO authenticated;
GRANT ALL ON TABLE customer_types TO service_role;

-- Enable RLS and create a policy that allows all operations (for development)
ALTER TABLE customer_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users" ON customer_types;
CREATE POLICY "Enable all operations for all users" 
ON customer_types 
FOR ALL 
USING (true) 
WITH CHECK (true);
