-- Employee Module Database Schema

-- Create Designations Table
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: The employees table was created in store_module.sql previously. 
-- In the future, we may migrate it here. For now, it remains there.

-- Drop previous tables if they existed to ensure clean state
-- DROP TABLE IF EXISTS designations;

-- Grant permissions to Supabase API roles
GRANT ALL ON TABLE designations TO anon;
GRANT ALL ON TABLE designations TO authenticated;
GRANT ALL ON TABLE designations TO service_role;

-- Enable RLS and create a policy that allows all operations (for development)
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON designations;
CREATE POLICY "Enable all operations for all users" 
ON designations FOR ALL USING (true) WITH CHECK (true);

-- Drop previous employees table to allow schema recreation
DROP TABLE IF EXISTS employees CASCADE;

-- Create Employees Table (Updated schema)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    designation VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),
    contact_no VARCHAR(50),
    email VARCHAR(100),
    date_of_birth DATE,
    date_of_join DATE,
    salary DECIMAL(10,2),
    max_disc DECIMAL(5,2),
    max_special_disc DECIMAL(5,2),
    requisition_approval_limit DECIMAL(10,2),
    is_executive BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Attached Stores (Junction table for multiple stores)
CREATE TABLE IF NOT EXISTS employee_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, store_id)
);

-- User Menu Distribution (ERP Menu permissions)
CREATE TABLE IF NOT EXISTS user_menu_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint back to pos_user_permissions if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pos_user_permissions') THEN
        ALTER TABLE pos_user_permissions ADD CONSTRAINT pos_user_permissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant permissions
GRANT ALL ON TABLE employees TO anon;
GRANT ALL ON TABLE employees TO authenticated;
GRANT ALL ON TABLE employees TO service_role;

GRANT ALL ON TABLE employee_stores TO anon;
GRANT ALL ON TABLE employee_stores TO authenticated;
GRANT ALL ON TABLE employee_stores TO service_role;

GRANT ALL ON TABLE user_menu_permissions TO anon;
GRANT ALL ON TABLE user_menu_permissions TO authenticated;
GRANT ALL ON TABLE user_menu_permissions TO service_role;

-- RLS for employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON employees;
CREATE POLICY "Enable all operations for all users" ON employees FOR ALL USING (true) WITH CHECK (true);

-- RLS for employee_stores
ALTER TABLE employee_stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON employee_stores;
CREATE POLICY "Enable all operations for all users" ON employee_stores FOR ALL USING (true) WITH CHECK (true);

-- RLS for user_menu_permissions
ALTER TABLE user_menu_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON user_menu_permissions;
CREATE POLICY "Enable all operations for all users" ON user_menu_permissions FOR ALL USING (true) WITH CHECK (true);
