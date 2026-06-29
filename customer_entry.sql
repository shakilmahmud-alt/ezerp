CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    customer_type_id UUID REFERENCES customer_types(id),
    gender VARCHAR(20),
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    dob DATE,
    enrollment_date DATE,
    expire_date DATE,
    contact_no VARCHAR(50),
    alt_contact_no VARCHAR(50),
    email VARCHAR(255),
    card_no VARCHAR(50),
    address TEXT,
    shipping_address TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    special_date DATE,
    special_date_note VARCHAR(255),
    salesperson VARCHAR(100),
    store VARCHAR(100),
    wholesale_customer BOOLEAN DEFAULT false,
    sale_without_vat BOOLEAN DEFAULT false,
    credit_customer BOOLEAN DEFAULT false,
    credit_limit NUMERIC(10, 2) DEFAULT 0,
    store_customer BOOLEAN DEFAULT false,
    inactive BOOLEAN DEFAULT false,
    vat_reg_no VARCHAR(50),
    nid VARCHAR(50),
    tin VARCHAR(50),
    ref_person_name VARCHAR(100),
    ref_company VARCHAR(100),
    ref_designation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grant permissions to Supabase API roles
GRANT ALL ON TABLE customers TO anon;
GRANT ALL ON TABLE customers TO authenticated;
GRANT ALL ON TABLE customers TO service_role;

-- Enable RLS and create a policy that allows all operations (for development)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users" ON customers;
CREATE POLICY "Enable all operations for all users" 
ON customers 
FOR ALL 
USING (true) 
WITH CHECK (true);
