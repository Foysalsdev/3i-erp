-- ============================================================
-- 3i Logistics ERP — Initial Seed Data
-- Run AFTER all tables + RLS are created
-- ============================================================

-- ─── STEP 1: CLIENTS ──────────────────────────────────────
INSERT INTO clients (client_code, client_name, client_type, sap_enabled, warehouse_code, expense_categories, status)
VALUES
  ('WH', 'Whirlpool Bangladesh',  '3PL Client', true,  'RB02',
   ARRAY['Labour Cost','Transport / Delivery Cost','Storage / Space Charge','Equipment / Tool Cost','Utility Cost','Service Charge','Miscellaneous'],
   'Active'),
  ('RB', 'Robi Axiata',           '3PL Client', false, null,
   ARRAY['Labour Cost','Transport / Delivery Cost','Storage / Space Charge','Equipment / Tool Cost','Utility Cost','Service Charge','Miscellaneous'],
   'Active'),
  ('GD', 'Godrej Bangladesh',     '3PL Client', false, null,
   ARRAY['Labour Cost','Transport / Delivery Cost','Storage / Space Charge','Equipment / Tool Cost','Utility Cost','Service Charge','Miscellaneous'],
   'Active'),
  ('3I', '3i Logistics (Internal)', 'Internal', false, null,
   ARRAY['Labour Cost','Transport / Delivery Cost','Storage / Space Charge','Equipment / Tool Cost','Utility Cost','Service Charge','Miscellaneous'],
   'Active')
ON CONFLICT (client_code) DO NOTHING;

-- ─── STEP 2: WAREHOUSE ────────────────────────────────────
INSERT INTO warehouses (warehouse_name, warehouse_code, address)
VALUES ('3i Logistics Warehouse', 'RB02', 'Gazipur Industrial Area, Gazipur, Bangladesh')
ON CONFLICT (warehouse_code) DO NOTHING;

-- ─── STEP 3: ZONES (after warehouse inserted) ─────────────
DO $$
DECLARE
  v_wh_id UUID;
BEGIN
  SELECT id INTO v_wh_id FROM warehouses WHERE warehouse_code = 'RB02';

  INSERT INTO zones (warehouse_id, zone_name, zone_code, client_id, area_sqft)
  VALUES
    (v_wh_id, 'Zone A — Whirlpool Main',  'ZONE-A', 'WH', 5000),
    (v_wh_id, 'Zone B — Whirlpool Bulk',  'ZONE-B', 'WH', 3000),
    (v_wh_id, 'Zone C — Quarantine',      'ZONE-C', 'WH',  500),
    (v_wh_id, 'Zone D — Returns',         'ZONE-D', 'WH',  500)
  ON CONFLICT (zone_code) DO NOTHING;
END;
$$;

-- ─── STEP 4: RACKS ────────────────────────────────────────
DO $$
DECLARE
  v_zone_a UUID;
  v_zone_b UUID;
BEGIN
  SELECT id INTO v_zone_a FROM zones WHERE zone_code = 'ZONE-A';
  SELECT id INTO v_zone_b FROM zones WHERE zone_code = 'ZONE-B';

  INSERT INTO racks (zone_id, rack_name, rack_code, total_bins)
  VALUES
    (v_zone_a, 'Rack 01', 'A-RACK-01', 10),
    (v_zone_a, 'Rack 02', 'A-RACK-02', 10),
    (v_zone_a, 'Rack 03', 'A-RACK-03', 10),
    (v_zone_b, 'Rack 01', 'B-RACK-01', 8),
    (v_zone_b, 'Rack 02', 'B-RACK-02', 8)
  ON CONFLICT (rack_code) DO NOTHING;
END;
$$;

-- ─── STEP 5: BINS ─────────────────────────────────────────
DO $$
DECLARE
  v_rack UUID;
  v_bin_num INT;
BEGIN
  FOR v_rack IN SELECT id FROM racks LOOP
    FOR v_bin_num IN 1..5 LOOP
      INSERT INTO bins (rack_id, bin_code, bin_type, status)
      VALUES (
        v_rack,
        (SELECT rack_code FROM racks WHERE id = v_rack) || '-BIN-' || LPAD(v_bin_num::TEXT, 2, '0'),
        'Normal',
        'Available'
      ) ON CONFLICT (bin_code) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ─── STEP 6: SUPER ADMIN ROLE ─────────────────────────────
INSERT INTO roles (name, description, is_active)
VALUES ('Super Admin', 'Full system access — cannot be modified', true)
ON CONFLICT DO NOTHING;

-- ─── STEP 7: WAREHOUSE OPERATOR ROLE (sample) ────────────
INSERT INTO roles (name, description, is_active)
VALUES ('Warehouse Operator', 'GRN, DC entry and stock management', true)
ON CONFLICT DO NOTHING;

-- ─── STEP 8: FINANCE OFFICER ROLE (sample) ────────────────
INSERT INTO roles (name, description, is_active)
VALUES ('Finance Officer', 'Expense, Invoice, Payroll management', true)
ON CONFLICT DO NOTHING;

-- ─── STEP 9: PERMISSIONS FOR WAREHOUSE OPERATOR ───────────
DO $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Warehouse Operator';

  INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_approve, can_post, can_print)
  VALUES
    (v_role_id, 'po',              true,  false, false, false, false, true),
    (v_role_id, 'grn',             true,  true,  true,  false, false, true),
    (v_role_id, 'prn',             true,  true,  true,  false, false, true),
    (v_role_id, 'so',              true,  false, false, false, false, true),
    (v_role_id, 'dc',              true,  true,  true,  false, false, true),
    (v_role_id, 'srn',             true,  true,  true,  false, false, true),
    (v_role_id, 'gate_pass',       true,  false, false, false, false, true),
    (v_role_id, 'stock_ledger',    true,  false, false, false, false, true),
    (v_role_id, 'stock_transfer',  true,  true,  true,  false, false, true),
    (v_role_id, 'transport',       true,  true,  false, false, true,  true),
    (v_role_id, 'masters',         true,  false, false, false, false, false),
    (v_role_id, 'task',            true,  false, false, false, false, false)
  ON CONFLICT (role_id, module) DO NOTHING;

  INSERT INTO role_clients (role_id, client_id)
  VALUES (v_role_id, 'WH')
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── STEP 10: PERMISSIONS FOR FINANCE OFFICER ─────────────
DO $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Finance Officer';

  INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_approve, can_post, can_print)
  VALUES
    (v_role_id, 'expense',     true, true,  true,  false, true, true),
    (v_role_id, 'budget',      true, true,  true,  true,  false, true),
    (v_role_id, 'invoice',     true, true,  true,  true,  false, true),
    (v_role_id, 'payment',     true, true,  false, false, false, true),
    (v_role_id, 'ledger',      true, false, false, false, false, true),
    (v_role_id, 'payroll',     true, true,  true,  true,  false, true),
    (v_role_id, 'transport',   true, false, false, false, false, true),
    (v_role_id, 'reports',     true, false, false, false, false, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  INSERT INTO role_clients (role_id, client_id)
  VALUES (v_role_id, 'WH'), (v_role_id, 'RB'), (v_role_id, 'GD'), (v_role_id, '3I')
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── INSTRUCTIONS: ASSIGN SUPER ADMIN TO YOUR USER ────────
-- After creating your first user in Supabase Auth → Authentication → Users,
-- run this SQL (replace the email):
--
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT
--   (SELECT id FROM auth.users WHERE email = 'your@email.com'),
--   (SELECT id FROM roles WHERE name = 'Super Admin'),
--   (SELECT id FROM auth.users WHERE email = 'your@email.com');
