-- =========================================================
-- FULL SYSTEM SCHEMA (DRAFT)
-- =========================================================

-- Ensure the extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Items Table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    uom TEXT,
    location TEXT,
    type TEXT,
    source TEXT,
    department TEXT,
    opening_stock INTEGER DEFAULT 0,
    last_price DECIMAL DEFAULT 0,
    avg_price DECIMAL DEFAULT 0,
    safety_stock INTEGER DEFAULT 0,
    on_hand_stock INTEGER DEFAULT 0,
    issued_qty INTEGER DEFAULT 0,
    received_qty INTEGER DEFAULT 0,
    last_issued TIMESTAMP WITH TIME ZONE,
    last_received TIMESTAMP WITH TIME ZONE,
    last_issued_qty INTEGER DEFAULT 0,
    last_issued_date TIMESTAMP WITH TIME ZONE,
    last_received_qty INTEGER DEFAULT 0,
    last_received_date TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    cost_center TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Requisitions Table
CREATE TABLE IF NOT EXISTS requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_no TEXT UNIQUE NOT NULL,
    reference TEXT,
    header_text TEXT,
    type TEXT,
    status TEXT DEFAULT 'Pending',
    total_value DECIMAL DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    req_by_name TEXT,
    req_by_id TEXT,
    req_by_dept TEXT,
    req_by_section TEXT,
    req_by_sub_section TEXT,
    req_by_shift TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no TEXT UNIQUE NOT NULL,
    reference TEXT,
    header_text TEXT,
    supplier_name TEXT,
    supplier_id UUID REFERENCES suppliers(id),
    status TEXT DEFAULT 'Pending',
    total_value DECIMAL DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Move Orders Table
CREATE TABLE IF NOT EXISTS move_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mo_no TEXT UNIQUE NOT NULL,
    reference TEXT,
    header_text TEXT,
    department TEXT,
    employee_name TEXT,
    dept TEXT,
    employee_id TEXT,
    section TEXT,
    sub_section TEXT,
    shift TEXT,
    status TEXT DEFAULT 'Pending',
    total_value DECIMAL DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    note TEXT,
    requested_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Goods Receive Notes (GRN) Table
CREATE TABLE IF NOT EXISTS grns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_no TEXT UNIQUE NOT NULL,
    document_date DATE,
    receive_date DATE,
    transaction_type TEXT,
    source_type TEXT,
    source_ref TEXT,
    header_text TEXT,
    invoice_no TEXT,
    bl_mushok_no TEXT,
    bl_container TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Cost Centers Table
CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Cycle Counting Table
CREATE TABLE IF NOT EXISTS cycle_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT,
    sku TEXT,
    item_name TEXT,
    location TEXT,
    uom TEXT,
    physical_qty INTEGER DEFAULT 0,
    system_qty INTEGER DEFAULT 0,
    pending_receive INTEGER DEFAULT 0,
    pending_issue INTEGER DEFAULT 0,
    short_over INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    username TEXT UNIQUE,
    password TEXT DEFAULT '123456',
    office_id TEXT,
    contact_number TEXT,
    department TEXT,
    role_template TEXT,
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'Active',
    last_login TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    granular_permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_sku TEXT NOT NULL,
    item_code TEXT,
    type TEXT NOT NULL, -- 'Receive' or 'Issue'
    quantity INTEGER NOT NULL,
    unit_price DECIMAL DEFAULT 0,
    reference_no TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Inventory Update Function
CREATE OR REPLACE FUNCTION public.update_item_stock(
    item_sku text, 
    qty_change integer, 
    is_receive boolean, 
    ref_no text DEFAULT NULL, 
    dept text DEFAULT NULL, 
    unit_price decimal DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_code TEXT;
BEGIN
    -- Get item code for reference
    SELECT code INTO v_item_code FROM items WHERE sku = item_sku LIMIT 1;

    IF is_receive THEN
        UPDATE items 
        SET avg_price = CASE 
                WHEN (on_hand_stock + qty_change) > 0 
                THEN ((COALESCE(on_hand_stock, 0) * COALESCE(avg_price, last_price, 0)) + (qty_change * COALESCE(unit_price, 0))) / (COALESCE(on_hand_stock, 0) + qty_change)
                ELSE COALESCE(unit_price, avg_price, last_price, 0)
            END,
            on_hand_stock = on_hand_stock + qty_change,
            received_qty = COALESCE(received_qty, 0) + qty_change,
            last_received = NOW(),
            last_price = COALESCE(unit_price, last_price)
        WHERE sku = item_sku;

        INSERT INTO transactions (item_sku, item_code, type, quantity, reference_no, department, unit_price)
        VALUES (item_sku, v_item_code, 'Receive', qty_change, ref_no, dept, COALESCE(unit_price, 0));
    ELSE
        UPDATE items 
        SET on_hand_stock = on_hand_stock + qty_change,
            issued_qty = COALESCE(issued_qty, 0) + ABS(qty_change),
            last_issued = NOW()
        WHERE sku = item_sku;

        INSERT INTO transactions (item_sku, item_code, type, quantity, reference_no, department, unit_price)
        SELECT item_sku, v_item_code, 'Issue', ABS(qty_change), ref_no, dept, COALESCE(avg_price, last_price, 0)
        FROM items WHERE sku = item_sku;
    END IF;
END;
$$;

-- 12. Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Simple "Allow All" policies for development
CREATE POLICY "Allow all" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON requisitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON move_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON grns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cost_centers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cycle_counts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- 13. Initial Data
INSERT INTO cost_centers (name, department)
VALUES 
    ('Maintenance', 'Operations'),
    ('Security', 'Admin'),
    ('Safety', 'EHS'),
    ('QC', 'Quality'),
    ('PDI', 'Operations'),
    ('Paint Shop', 'Production'),
    ('Outbound Logistic', 'Supply Chain'),
    ('MMT', 'Operations'),
    ('Medical', 'HR'),
    ('IT', 'Technology'),
    ('HR', 'Human Resources'),
    ('Finance', 'Accounts'),
    ('Civil', 'Maintenance'),
    ('Audit', 'Management'),
    ('Assembly', 'Production'),
    ('Admin', 'Administration')
ON CONFLICT (name) DO NOTHING;

-- FORCE CACHE RELOAD
NOTIFY pgrst, 'reload schema';
