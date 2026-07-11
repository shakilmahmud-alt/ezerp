-- Create Areas Table
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID REFERENCES areas(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    shop_type VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    email VARCHAR(255),
    city VARCHAR(100),
    contact_no VARCHAR(50),
    date_of_enrollment DATE,
    sale_on VARCHAR(50),
    vat_reg_no VARCHAR(100),
    dl_no VARCHAR(100),
    trade_lic_no VARCHAR(100),
    reference_store_code VARCHAR(100),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    sms_masking VARCHAR(100),
    web_sale BOOLEAN DEFAULT false,
    store_wise_sales_voucher BOOLEAN DEFAULT false,
    store_opening_time TIME,
    store_closing_time TIME,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create Terminals Table
CREATE TABLE IF NOT EXISTS terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    mac_address VARCHAR(255) NOT NULL,
    counter_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create Employees Table (Basic structure for POS distribution)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create POS User Permissions Table
CREATE TABLE IF NOT EXISTS pos_user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, employee_id)
);

-- Drop previous tables if they existed to ensure clean state
-- DROP TABLE IF EXISTS pos_user_permissions;
-- DROP TABLE IF EXISTS employees;
-- DROP TABLE IF EXISTS terminals;
-- DROP TABLE IF EXISTS stores;
-- DROP TABLE IF EXISTS areas;

-- Grant permissions to Supabase API roles
GRANT ALL ON TABLE areas TO anon;
GRANT ALL ON TABLE areas TO authenticated;
GRANT ALL ON TABLE areas TO service_role;

GRANT ALL ON TABLE stores TO anon;
GRANT ALL ON TABLE stores TO authenticated;
GRANT ALL ON TABLE stores TO service_role;

GRANT ALL ON TABLE terminals TO anon;
GRANT ALL ON TABLE terminals TO authenticated;
GRANT ALL ON TABLE terminals TO service_role;

GRANT ALL ON TABLE employees TO anon;
GRANT ALL ON TABLE employees TO authenticated;
GRANT ALL ON TABLE employees TO service_role;

GRANT ALL ON TABLE pos_user_permissions TO anon;
GRANT ALL ON TABLE pos_user_permissions TO authenticated;
GRANT ALL ON TABLE pos_user_permissions TO service_role;

-- Enable RLS and create a policy that allows all operations (for development)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON areas;
CREATE POLICY "Enable all operations for all users" 
ON areas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON stores;
CREATE POLICY "Enable all operations for all users" 
ON stores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON terminals;
CREATE POLICY "Enable all operations for all users" 
ON terminals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON employees;
CREATE POLICY "Enable all operations for all users" 
ON employees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pos_user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON pos_user_permissions;
CREATE POLICY "Enable all operations for all users" 
ON pos_user_permissions FOR ALL USING (true) WITH CHECK (true);

