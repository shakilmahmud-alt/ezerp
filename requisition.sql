CREATE TABLE IF NOT EXISTS store_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_no VARCHAR(50) UNIQUE NOT NULL,
    shop_name VARCHAR(255),
    requisition_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    vendor VARCHAR(255),
    prepared_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Cancelled
    total_qty NUMERIC(10,2) DEFAULT 0,
    total_value NUMERIC(10,2) DEFAULT 0,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS store_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES store_requisitions(id) ON DELETE CASCADE,
    barcode VARCHAR(100),
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    uom VARCHAR(50),
    cpu NUMERIC(10,2) DEFAULT 0,
    mrp NUMERIC(10,2) DEFAULT 0,
    category VARCHAR(100),
    bal_qty NUMERIC(10,2) DEFAULT 0,
    stock_in_cs NUMERIC(10,2) DEFAULT 0,
    req_qty NUMERIC(10,2) DEFAULT 0,
    app_qty NUMERIC(10,2) DEFAULT 0,
    cost_value NUMERIC(10,2) DEFAULT 0,
    avg_days_sale NUMERIC(10,2) DEFAULT 0,
    days_remain NUMERIC(10,2) DEFAULT 0,
    style VARCHAR(100),
    carton_size NUMERIC(10,2) DEFAULT 1,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

GRANT ALL ON TABLE store_requisitions TO anon;
GRANT ALL ON TABLE store_requisitions TO authenticated;
GRANT ALL ON TABLE store_requisitions TO service_role;

GRANT ALL ON TABLE store_requisition_items TO anon;
GRANT ALL ON TABLE store_requisition_items TO authenticated;
GRANT ALL ON TABLE store_requisition_items TO service_role;
