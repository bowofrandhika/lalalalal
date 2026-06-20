-- Add packaging enum type
DO $$ BEGIN
    CREATE TYPE packaging_type AS ENUM ('SW', 'MB', 'LB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add buyer shortcode + is_active if missing
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS buyer_code_short VARCHAR(3);

-- Insert default buyers if not exists
INSERT INTO buyers (buyer_code, buyer_name, buyer_code_short, is_active)
VALUES 
    ('BEL', 'Belshina', 'BEL', true),
    ('KAM', 'Kamatyres', 'KAM', true),
    ('SNI', 'SNI', 'SNI', true)
ON CONFLICT (buyer_code) DO UPDATE SET 
    buyer_name = EXCLUDED.buyer_name,
    buyer_code_short = EXCLUDED.buyer_code_short,
    is_active = EXCLUDED.is_active;

-- Alter work_orders: add deadline, packaging, quantity in kg
ALTER TABLE work_orders 
    ADD COLUMN IF NOT EXISTS deadline DATE,
    ADD COLUMN IF NOT EXISTS packaging packaging_type DEFAULT 'SW',
    ADD COLUMN IF NOT EXISTS qty_kg NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completion_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completion_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completion_confirmed_by UUID REFERENCES auth.users(id);

-- Alter production_sessions: add new fields
ALTER TABLE production_sessions
    ADD COLUMN IF NOT EXISTS shift_label VARCHAR(20),
    ADD COLUMN IF NOT EXISTS line_label VARCHAR(10),
    ADD COLUMN IF NOT EXISTS target_kg NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_kg NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES app_users(id),
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Pre-production checklist items v2
CREATE TABLE IF NOT EXISTS pre_production_checklist_items_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES production_sessions(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    initial_condition VARCHAR(10) CHECK (initial_condition IN ('OK', 'NG')),
    final_condition VARCHAR(10) CHECK (final_condition IN ('OK', 'NG')),
    remarks TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pre_production_checklist_items_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_checklist_v2" ON pre_production_checklist_items_v2
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_checklist_v2" ON pre_production_checklist_items_v2
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_checklist_v2" ON pre_production_checklist_items_v2
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_checklist_v2" ON pre_production_checklist_items_v2
    FOR DELETE TO authenticated USING (true);

-- Production log session tab data
CREATE TABLE IF NOT EXISTS production_log_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES production_sessions(id) ON DELETE CASCADE UNIQUE,
    foreman_id UUID REFERENCES app_users(id),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_log_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pls" ON production_log_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Material identification
CREATE TABLE IF NOT EXISTS production_material_id (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES production_sessions(id) ON DELETE CASCADE UNIQUE,
    room TEXT,
    deck TEXT,
    update_date DATE,
    visual_condition VARCHAR(20) CHECK (visual_condition IN ('Clean', 'Moderate', 'Dirty')),
    line_cleaning VARCHAR(20) CHECK (line_cleaning IN ('Clean', 'Moderate', 'Dirty')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_material_id ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pmid" ON production_material_id FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Process flow (press & weighing + total product)
CREATE TABLE IF NOT EXISTS production_process_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES production_sessions(id) ON DELETE CASCADE UNIQUE,
    avg_cake_weight NUMERIC(8,3),
    variation TEXT,
    press_remarks TEXT,
    bale_qty INTEGER DEFAULT 0,
    pallet_qty INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_process_flow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ppf" ON production_process_flow FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fuel consumption
CREATE TABLE IF NOT EXISTS production_fuel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES production_sessions(id) ON DELETE CASCADE UNIQUE,
    diesel_start NUMERIC(10,2) DEFAULT 0,
    diesel_end NUMERIC(10,2) DEFAULT 0,
    pks_consumption NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_fuel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pf" ON production_fuel FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WO completion notifications
CREATE TABLE IF NOT EXISTS wo_completion_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    session_id UUID REFERENCES production_sessions(id) ON DELETE SET NULL,
    total_kg NUMERIC(12,2),
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wo_completion_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_wocn" ON wo_completion_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
