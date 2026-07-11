CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    bank_commission DECIMAL(10,2) DEFAULT 0,
    bin VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    mfs BOOLEAN DEFAULT false,
    ec BOOLEAN DEFAULT false,
    pos BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL ON TABLE payment_methods TO anon;
GRANT ALL ON TABLE payment_methods TO authenticated;
GRANT ALL ON TABLE payment_methods TO service_role;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON payment_methods;
CREATE POLICY "Enable all operations for all users" ON payment_methods FOR ALL USING (true) WITH CHECK (true);
