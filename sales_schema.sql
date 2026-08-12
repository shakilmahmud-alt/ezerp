-- SQL Schema for EG ERP POS Sales, Payments, Exchange, Returns, Requisitions, Purchase Receive & Purchase Return System
-- Run this script in Supabase SQL Editor

-- 1. Create Sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(255) UNIQUE NOT NULL,
    shop_id UUID,
    shop_name VARCHAR(255),
    terminal_name VARCHAR(255),
    customer_id UUID,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(50),
    total_qty NUMERIC(12,2) DEFAULT 0.00,
    sub_total NUMERIC(12,2) DEFAULT 0.00,
    vat_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    net_payable NUMERIC(12,2) DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    change_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_type VARCHAR(100) DEFAULT 'Cash',
    cashier_id UUID,
    cashier_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Sale Items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(255),
    unit_price NUMERIC(12,2) DEFAULT 0.00,
    quantity NUMERIC(12,2) DEFAULT 1.00,
    vat_percent NUMERIC(5,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    total_price NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Sales Returns table (Customer Returns)
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no VARCHAR(255) UNIQUE NOT NULL,
    original_invoice_no VARCHAR(255),
    shop_name VARCHAR(255),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    total_return_qty NUMERIC(12,2) DEFAULT 0.00,
    total_return_amount NUMERIC(12,2) DEFAULT 0.00,
    net_refund_amount NUMERIC(12,2) DEFAULT 0.00,
    return_type VARCHAR(50) DEFAULT 'Customer Return',
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Sales Return Items table
CREATE TABLE IF NOT EXISTS public.sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    product_id UUID,
    barcode VARCHAR(255),
    product_name VARCHAR(255),
    unit_price NUMERIC(12,2) DEFAULT 0.00,
    qty NUMERIC(12,2) DEFAULT 1.00,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Store Requisitions table
CREATE TABLE IF NOT EXISTS public.store_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_no VARCHAR(255) UNIQUE NOT NULL,
    shop_id UUID,
    shop_name VARCHAR(255) NOT NULL,
    requisition_date DATE DEFAULT CURRENT_DATE,
    vendor VARCHAR(255) DEFAULT 'N/A',
    prepared_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    total_qty NUMERIC(12,2) DEFAULT 0.00,
    total_value NUMERIC(12,2) DEFAULT 0.00,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Store Requisition Items table
CREATE TABLE IF NOT EXISTS public.store_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.store_requisitions(id) ON DELETE CASCADE,
    barcode VARCHAR(255),
    product_code VARCHAR(255),
    product_name VARCHAR(255),
    uom VARCHAR(50) DEFAULT 'Pcs',
    cpu NUMERIC(12,2) DEFAULT 0.00,
    mrp NUMERIC(12,2) DEFAULT 0.00,
    category VARCHAR(255),
    bal_qty NUMERIC(12,2) DEFAULT 0.00,
    stock_in_cs NUMERIC(12,2) DEFAULT 0.00,
    req_qty NUMERIC(12,2) DEFAULT 0.00,
    app_qty NUMERIC(12,2) DEFAULT 0.00,
    cost_value NUMERIC(12,2) DEFAULT 0.00,
    avg_days_sale NUMERIC(12,2) DEFAULT 0.00,
    days_remain NUMERIC(12,2) DEFAULT 0.00,
    style VARCHAR(255),
    carton_size NUMERIC(12,2) DEFAULT 1.00,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Create Purchase Receives table
CREATE TABLE IF NOT EXISTS public.purchase_receives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID,
    purchase_order_id UUID,
    from_date DATE,
    to_date DATE,
    purchase_date DATE,
    last_challan_no VARCHAR(255),
    reference_no VARCHAR(255),
    delivery_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Saved',
    total_value NUMERIC(12,2) DEFAULT 0.00,
    total_discount NUMERIC(12,2) DEFAULT 0.00,
    free_amount NUMERIC(12,2) DEFAULT 0.00,
    vat_amount NUMERIC(12,2) DEFAULT 0.00,
    sub_total NUMERIC(12,2) DEFAULT 0.00,
    additional_discount NUMERIC(12,2) DEFAULT 0.00,
    additional_cost NUMERIC(12,2) DEFAULT 0.00,
    net_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Create Purchase Receive Items table
CREATE TABLE IF NOT EXISTS public.purchase_receive_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_receive_id UUID REFERENCES public.purchase_receives(id) ON DELETE CASCADE,
    product_id UUID,
    po_qty NUMERIC(12,2) DEFAULT 0.00,
    rcv_qty NUMERIC(12,2) DEFAULT 0.00,
    pur_price NUMERIC(12,2) DEFAULT 0.00,
    sale_price NUMERIC(12,2) DEFAULT 0.00,
    disc_percent NUMERIC(5,2) DEFAULT 0.00,
    free_qty NUMERIC(12,2) DEFAULT 0.00,
    line_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Create Purchase Returns table (Vendor Returns)
CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID,
    purchase_receive_id UUID,
    store_id UUID,
    store_name VARCHAR(255),
    return_date DATE DEFAULT CURRENT_DATE,
    challan_no VARCHAR(255),
    reference_no VARCHAR(255),
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Create Purchase Return Items table
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_return_id UUID REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
    product_id UUID,
    return_qty NUMERIC(12,2) DEFAULT 0.00,
    cost_price NUMERIC(12,2) DEFAULT 0.00,
    sale_price NUMERIC(12,2) DEFAULT 0.00,
    line_amount NUMERIC(12,2) DEFAULT 0.00,
    return_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Create Store Stocks table (Store-specific inventory)
CREATE TABLE IF NOT EXISTS public.store_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    stock_qty NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(store_id, product_id)
);

-- Permissions
GRANT ALL ON public.sales TO anon, authenticated, service_role;
GRANT ALL ON public.sale_items TO anon, authenticated, service_role;
GRANT ALL ON public.sales_returns TO anon, authenticated, service_role;
GRANT ALL ON public.sales_return_items TO anon, authenticated, service_role;
GRANT ALL ON public.store_requisitions TO anon, authenticated, service_role;
GRANT ALL ON public.store_requisition_items TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_receives TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_receive_items TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_returns TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_return_items TO anon, authenticated, service_role;
GRANT ALL ON public.store_stocks TO anon, authenticated, service_role;

ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisition_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receive_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stocks DISABLE ROW LEVEL SECURITY;
