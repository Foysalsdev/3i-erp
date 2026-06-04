-- ============================================================
-- 3i Logistics ERP — Warehouse & Inventory Tables
-- ============================================================

-- ─── WAREHOUSE HIERARCHY ──────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name TEXT NOT NULL,
  warehouse_code TEXT NOT NULL UNIQUE,  -- RB02 (SAP-UNIQUE)
  address        TEXT,
  total_area_sqft NUMERIC,
  created_by     UUID REFERENCES auth.users,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses,
  zone_name    TEXT NOT NULL,
  zone_code    TEXT NOT NULL UNIQUE,
  client_id    TEXT REFERENCES clients(client_code),
  area_sqft    NUMERIC,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS racks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     UUID NOT NULL REFERENCES zones,
  rack_name   TEXT NOT NULL,
  rack_code   TEXT NOT NULL UNIQUE,
  total_bins  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bins (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id   UUID NOT NULL REFERENCES racks,
  bin_code  TEXT NOT NULL UNIQUE,
  bin_type  TEXT DEFAULT 'Normal',
  capacity  NUMERIC,
  status    TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SUPPLIERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      TEXT REFERENCES clients(client_code),
  supplier_name  TEXT NOT NULL,
  supplier_code  TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  city           TEXT,
  country        TEXT DEFAULT 'Bangladesh',
  trade_license  TEXT,
  tin_number     TEXT,
  vat_number     TEXT,
  bank_name      TEXT,
  bank_account   TEXT,
  bank_branch    TEXT,
  payment_terms  TEXT DEFAULT '30 Days',
  status         TEXT DEFAULT 'Active',
  remarks        TEXT,
  created_by     UUID REFERENCES auth.users,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── CUSTOMERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT REFERENCES clients(client_code),
  customer_name     TEXT NOT NULL,
  customer_code     TEXT NOT NULL UNIQUE,
  sap_customer_code TEXT UNIQUE,   -- SAP-UNIQUE: global unique constraint
  customer_type     TEXT DEFAULT 'Dealer',
  contact_person    TEXT,
  phone             TEXT,
  email             TEXT,
  billing_address   TEXT,
  delivery_address  TEXT,
  city              TEXT,
  district          TEXT,
  division          TEXT,
  tin_number        TEXT,
  vat_number        TEXT,
  credit_limit      NUMERIC DEFAULT 0,
  payment_terms     TEXT DEFAULT '30 Days',
  status            TEXT DEFAULT 'Active',
  remarks           TEXT,
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── ITEMS / SKU MASTER ───────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT REFERENCES clients(client_code),
  sku               TEXT NOT NULL,
  sap_material_code TEXT UNIQUE,   -- SAP-UNIQUE: global unique constraint
  item_name         TEXT NOT NULL,
  item_description  TEXT,
  category          TEXT,
  sub_category      TEXT,
  unit_of_measure   TEXT DEFAULT 'PCS',
  brand             TEXT,
  model_no          TEXT,
  color             TEXT,
  weight_kg         NUMERIC,
  dimensions        TEXT,
  hsn_code          TEXT,
  reorder_level     NUMERIC DEFAULT 0,
  max_stock         NUMERIC,
  image_url         TEXT,
  status            TEXT DEFAULT 'Active',
  remarks           TEXT,
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, sku)
);

-- ─── STOCK LEDGER ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          TEXT REFERENCES clients(client_code),
  item_id            UUID NOT NULL REFERENCES items,
  location_id        UUID NOT NULL REFERENCES bins,
  current_qty        NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (current_qty >= 0),
  reserved_qty       NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  available_qty      NUMERIC(12,3) GENERATED ALWAYS AS (current_qty - reserved_qty) STORED,
  last_movement_type TEXT,
  last_movement_date TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, item_id, location_id)
);

-- ─── STOCK MOVEMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          TEXT,
  item_id            UUID REFERENCES items,
  location_id        UUID REFERENCES bins,
  movement_type      TEXT NOT NULL,
  reference_doc_type TEXT,
  reference_doc_id   UUID,
  reference_doc_no   TEXT,
  qty_change         NUMERIC(12,3) NOT NULL,
  qty_before         NUMERIC(12,3),
  qty_after          NUMERIC(12,3),
  moved_by           UUID REFERENCES auth.users,
  moved_at           TIMESTAMPTZ DEFAULT now()
);

-- ─── PURCHASE ORDERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no            TEXT NOT NULL UNIQUE,
  client_id        TEXT NOT NULL REFERENCES clients(client_code),
  supplier_id      UUID NOT NULL REFERENCES suppliers,
  po_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  currency         TEXT DEFAULT 'BDT',
  payment_terms    TEXT,
  delivery_address TEXT,
  notes            TEXT,
  subtotal         NUMERIC(12,2) DEFAULT 0,
  vat_percent      NUMERIC DEFAULT 0,
  vat_amount       NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) DEFAULT 0,
  status           TEXT DEFAULT 'DRAFT',
  approved_by      UUID REFERENCES auth.users,
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id       UUID NOT NULL REFERENCES purchase_orders ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items,
  ordered_qty NUMERIC(12,3) NOT NULL CHECK (ordered_qty > 0),
  unit_price  NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (ordered_qty * unit_price) STORED,
  remarks     TEXT
);

-- ─── GRN ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grn (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_no            TEXT NOT NULL UNIQUE,
  client_id         TEXT NOT NULL REFERENCES clients(client_code),
  po_id             UUID REFERENCES purchase_orders,
  supplier_id       UUID NOT NULL REFERENCES suppliers,
  received_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_no        TEXT,
  driver_name       TEXT,
  lr_no             TEXT,
  dc_no_supplier    TEXT,
  sap_grn_no        TEXT UNIQUE,
  sap_miro_no       TEXT UNIQUE,
  miro_date         DATE,
  miro_posted       BOOLEAN DEFAULT false,
  warehouse_id      UUID REFERENCES warehouses,
  subtotal          NUMERIC(12,2) DEFAULT 0,
  total_amount      NUMERIC(12,2) DEFAULT 0,
  status            TEXT DEFAULT 'DRAFT',
  remarks           TEXT,
  approved_by       UUID REFERENCES auth.users,
  approved_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grn_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id           UUID NOT NULL REFERENCES grn ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES items,
  po_line_id       UUID REFERENCES po_lines,
  received_qty     NUMERIC(12,3) NOT NULL CHECK (received_qty >= 0),
  accepted_qty     NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (accepted_qty <= received_qty),
  rejected_qty     NUMERIC(12,3) GENERATED ALWAYS AS (received_qty - accepted_qty) STORED,
  rejection_reason TEXT,
  unit_price       NUMERIC(12,2) DEFAULT 0,
  put_away_location UUID REFERENCES bins,
  batch_no         TEXT,
  expiry_date      DATE,
  qc_checked_by    UUID REFERENCES auth.users,
  qc_check_date    DATE,
  qc_checklist     JSONB,
  qc_photo_urls    TEXT[],
  qc_remarks       TEXT,
  remarks          TEXT
);

-- ─── PRN ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prn (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prn_no        TEXT NOT NULL UNIQUE,
  client_id     TEXT NOT NULL REFERENCES clients(client_code),
  grn_id        UUID NOT NULL REFERENCES grn,
  supplier_id   UUID NOT NULL REFERENCES suppliers,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason TEXT,
  sap_doc_no    TEXT UNIQUE,
  vehicle_no    TEXT,
  status        TEXT DEFAULT 'DRAFT',
  remarks       TEXT,
  approved_by   UUID REFERENCES auth.users,
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prn_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prn_id          UUID NOT NULL REFERENCES prn ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items,
  grn_line_id     UUID REFERENCES grn_lines,
  return_qty      NUMERIC(12,3) NOT NULL CHECK (return_qty > 0),
  unit_price      NUMERIC(12,2) DEFAULT 0,
  return_location UUID REFERENCES bins,
  remarks         TEXT
);

-- ─── SALES ORDERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_no            TEXT NOT NULL UNIQUE,
  client_id        TEXT NOT NULL REFERENCES clients(client_code),
  customer_id      UUID NOT NULL REFERENCES customers,
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  priority         TEXT DEFAULT 'Normal',
  order_type       TEXT DEFAULT 'Regular',
  reference_no     TEXT,
  billing_address  TEXT,
  delivery_address TEXT,
  payment_terms    TEXT,
  subtotal         NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount  NUMERIC(12,2) DEFAULT 0,
  vat_percent      NUMERIC DEFAULT 0,
  vat_amount       NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) DEFAULT 0,
  notes            TEXT,
  status           TEXT DEFAULT 'DRAFT',
  approved_by      UUID REFERENCES auth.users,
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS so_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id              UUID NOT NULL REFERENCES sales_orders ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES items,
  ordered_qty        NUMERIC(12,3) NOT NULL CHECK (ordered_qty > 0),
  confirmed_qty      NUMERIC(12,3) DEFAULT 0,
  unit_price         NUMERIC(12,2) DEFAULT 0,
  total_price        NUMERIC(12,2) GENERATED ALWAYS AS (confirmed_qty * unit_price) STORED,
  warehouse_location UUID REFERENCES bins,
  remarks            TEXT
);

-- ─── DELIVERY CHALLANS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_challans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dc_no            TEXT NOT NULL UNIQUE,
  client_id        TEXT NOT NULL REFERENCES clients(client_code),
  so_id            UUID NOT NULL REFERENCES sales_orders,
  customer_id      UUID NOT NULL REFERENCES customers,
  delivery_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_no       TEXT,
  driver_name      TEXT,
  driver_phone     TEXT,
  lr_no            TEXT,
  delivery_address TEXT,
  sap_invoice_no   TEXT UNIQUE,
  sap_invoice_date DATE,
  status           TEXT DEFAULT 'DRAFT',
  received_by      TEXT,
  received_at      TIMESTAMPTZ,
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dc_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dc_id         UUID NOT NULL REFERENCES delivery_challans ON DELETE CASCADE,
  so_line_id    UUID NOT NULL REFERENCES so_lines,
  item_id       UUID NOT NULL REFERENCES items,
  dispatch_qty  NUMERIC(12,3) NOT NULL CHECK (dispatch_qty > 0),
  serial_nos    TEXT,
  from_location UUID REFERENCES bins,
  remarks       TEXT
);

-- ─── GATE PASS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gate_passes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_no             TEXT NOT NULL UNIQUE,
  gp_type           TEXT NOT NULL,  -- OUTBOUND / RETURN_OUTBOUND
  client_id         TEXT REFERENCES clients(client_code),
  reference_doc_type TEXT,
  reference_doc_id  UUID,
  reference_doc_no  TEXT,
  gate_pass_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  gate_pass_time    TIME DEFAULT now()::TIME,
  vehicle_no        TEXT,
  driver_name       TEXT,
  driver_phone      TEXT,
  driver_nid        TEXT,
  transporter       TEXT,
  total_qty         NUMERIC(12,3) DEFAULT 0,
  total_packages    INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'OPEN',
  guard_name        TEXT,
  guard_in_time     TIME,
  guard_out_time    TIME,
  guard_remarks     TEXT,
  remarks           TEXT,
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gate_pass_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id          UUID NOT NULL REFERENCES gate_passes ON DELETE CASCADE,
  item_id        UUID REFERENCES items,
  item_name      TEXT,
  quantity       NUMERIC(12,3) DEFAULT 0,
  unit           TEXT,
  package_type   TEXT DEFAULT 'Carton',
  condition_out  TEXT DEFAULT 'Good',
  remarks        TEXT
);

-- ─── SRN ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS srn (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  srn_no        TEXT NOT NULL UNIQUE,
  client_id     TEXT NOT NULL REFERENCES clients(client_code),
  dc_id         UUID NOT NULL REFERENCES delivery_challans,
  customer_id   UUID NOT NULL REFERENCES customers,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  return_type   TEXT DEFAULT 'Damaged',
  sap_doc_no    TEXT UNIQUE,
  vehicle_no    TEXT,
  received_by   UUID REFERENCES auth.users,
  status        TEXT DEFAULT 'DRAFT',
  remarks       TEXT,
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS srn_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  srn_id          UUID NOT NULL REFERENCES srn ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items,
  dc_line_id      UUID REFERENCES dc_lines,
  returned_qty    NUMERIC(12,3) NOT NULL CHECK (returned_qty > 0),
  condition       TEXT DEFAULT 'Good',
  return_location UUID REFERENCES bins,
  photo_urls      TEXT[],
  remarks         TEXT
);

-- ─── INVOICE CANCEL ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_cancels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancel_no         TEXT NOT NULL UNIQUE,
  dc_id             UUID NOT NULL REFERENCES delivery_challans,
  sap_invoice_no    TEXT,
  sap_cancel_doc_no TEXT UNIQUE,
  cancel_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  cancel_reason     TEXT,
  cancel_remarks    TEXT,
  cancelled_by      UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── EXCHANGE / REPLACEMENT ───────────────────────────────
CREATE TABLE IF NOT EXISTS exchanges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exc_no           TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL DEFAULT 'EXCHANGE',
  client_id        TEXT REFERENCES clients(client_code),
  customer_id      UUID REFERENCES customers,
  so_id            UUID REFERENCES sales_orders,
  srn_id           UUID REFERENCES srn,
  request_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  sap_job_id       TEXT UNIQUE,
  complaint_type   TEXT,
  complaint_details TEXT,
  priority         TEXT DEFAULT 'Normal',
  old_item_id      UUID REFERENCES items,
  old_qty          NUMERIC(12,3),
  old_serial_no    TEXT,
  old_condition    TEXT,
  old_return_location UUID REFERENCES bins,
  new_item_id      UUID REFERENCES items,
  new_qty          NUMERIC(12,3),
  new_serial_no    TEXT,
  dispatch_location UUID REFERENCES bins,
  dispatch_date    DATE,
  vehicle_no       TEXT,
  status           TEXT DEFAULT 'DRAFT',
  approved_by      UUID REFERENCES auth.users,
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── DAMAGED STOCK ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS damaged_stock (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_no           TEXT NOT NULL UNIQUE,
  client_id           TEXT REFERENCES clients(client_code),
  item_id             UUID NOT NULL REFERENCES items,
  source_type         TEXT DEFAULT 'Manual',
  source_doc_id       UUID,
  source_doc_no       TEXT,
  damage_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity            NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  location_id         UUID REFERENCES bins,
  damage_type         TEXT DEFAULT 'Customer Return',
  condition_detail    TEXT,
  photo_urls          TEXT[],
  disposition         TEXT DEFAULT 'Pending',
  disposition_date    DATE,
  disposition_by      UUID REFERENCES auth.users,
  disposition_remarks TEXT,
  status              TEXT DEFAULT 'QUARANTINE',
  created_by          UUID REFERENCES auth.users,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── STOCK ADJUSTMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adj_no         TEXT NOT NULL UNIQUE,
  client_id      TEXT REFERENCES clients(client_code),
  adj_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  adj_type       TEXT NOT NULL DEFAULT 'INCREASE',
  reason         TEXT,
  reference_no   TEXT,
  cycle_count_id UUID,
  approved_by    UUID REFERENCES auth.users,
  remarks        TEXT,
  status         TEXT DEFAULT 'DRAFT',
  created_by     UUID REFERENCES auth.users,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adjustment_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adj_id       UUID NOT NULL REFERENCES stock_adjustments ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES items,
  location_id  UUID NOT NULL REFERENCES bins,
  system_qty   NUMERIC(12,3) DEFAULT 0,
  physical_qty NUMERIC(12,3) NOT NULL,
  variance_qty NUMERIC(12,3) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
  remarks      TEXT
);

-- ─── STOCK TRANSFERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  str_no           TEXT NOT NULL UNIQUE,
  client_id        TEXT REFERENCES clients(client_code),
  transfer_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  from_location_id UUID NOT NULL REFERENCES bins,
  to_location_id   UUID NOT NULL REFERENCES bins,
  item_id          UUID NOT NULL REFERENCES items,
  transfer_qty     NUMERIC(12,3) NOT NULL CHECK (transfer_qty > 0),
  reason           TEXT,
  remarks          TEXT,
  status           TEXT DEFAULT 'DRAFT',
  completed_by     UUID REFERENCES auth.users,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── CYCLE COUNTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_counts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cyc_no              TEXT NOT NULL UNIQUE,
  client_id           TEXT REFERENCES clients(client_code),
  count_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  count_type          TEXT DEFAULT 'Full Count',
  zone_id             UUID REFERENCES zones,
  rack_id             UUID REFERENCES racks,
  assigned_to         UUID REFERENCES auth.users,
  supervisor          UUID REFERENCES auth.users,
  start_time          TIMESTAMPTZ,
  end_time            TIMESTAMPTZ,
  variance_threshold  NUMERIC DEFAULT 2,
  status              TEXT DEFAULT 'PLANNED',
  remarks             TEXT,
  created_by          UUID REFERENCES auth.users,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycle_count_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cyc_id           UUID NOT NULL REFERENCES cycle_counts ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES items,
  location_id      UUID REFERENCES bins,
  system_qty       NUMERIC(12,3) DEFAULT 0,
  first_count_qty  NUMERIC(12,3),
  recount_qty      NUMERIC(12,3),
  final_qty        NUMERIC(12,3),
  variance_qty     NUMERIC(12,3) GENERATED ALWAYS AS (COALESCE(final_qty,0) - system_qty) STORED,
  needs_recount    BOOLEAN DEFAULT false,
  counter_name     TEXT,
  counted_at       TIMESTAMPTZ,
  remarks          TEXT
);
