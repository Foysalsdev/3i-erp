-- ============================================================
-- 3i Logistics ERP — Finance, HR, Transport, Promo Tables
-- ============================================================

-- ─── EXPENSES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_no       TEXT NOT NULL UNIQUE,
  client_id        TEXT NOT NULL REFERENCES clients(client_code),
  expense_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_category TEXT NOT NULL,
  expense_sub_type TEXT,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  vat_amount       NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) GENERATED ALWAYS AS (amount + vat_amount) STORED,
  payment_method   TEXT DEFAULT 'Cash',
  reference_no     TEXT,
  vendor_name      TEXT,
  invoice_no       TEXT,
  period_from      DATE,
  period_to        DATE,
  description      TEXT,
  attachment_urls  TEXT[],
  budget_id        UUID,
  status           TEXT DEFAULT 'DRAFT',
  approved_by      UUID REFERENCES auth.users,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── BUDGETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT NOT NULL REFERENCES clients(client_code),
  budget_year      INTEGER NOT NULL,
  budget_month     INTEGER NOT NULL CHECK (budget_month BETWEEN 1 AND 12),
  expense_category TEXT NOT NULL,
  budget_amount    NUMERIC(12,2) NOT NULL,
  actual_spent     NUMERIC(12,2) DEFAULT 0,
  variance         NUMERIC(12,2) GENERATED ALWAYS AS (budget_amount - actual_spent) STORED,
  status           TEXT DEFAULT 'DRAFT',
  approved_by      UUID REFERENCES auth.users,
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, budget_year, budget_month, expense_category)
);

-- ─── INVOICES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      TEXT NOT NULL UNIQUE,
  client_id       TEXT NOT NULL REFERENCES clients(client_code),
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_period  TEXT,
  due_date        DATE,
  billing_address TEXT,
  payment_terms   TEXT,
  subtotal        NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  vat_percent     NUMERIC DEFAULT 15,
  vat_amount      NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'DRAFT',
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices ON DELETE CASCADE,
  service_type TEXT,
  description  TEXT,
  qty          NUMERIC DEFAULT 1,
  unit         TEXT DEFAULT 'Month',
  rate         NUMERIC(12,2) DEFAULT 0,
  amount       NUMERIC(12,2) GENERATED ALWAYS AS (qty * rate) STORED
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid     NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
  payment_method  TEXT DEFAULT 'Bank Transfer',
  transaction_ref TEXT,
  bank_name       TEXT,
  remarks         TEXT,
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── FINANCE LEDGER ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           TEXT REFERENCES clients(client_code),
  entry_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type          TEXT NOT NULL CHECK (entry_type IN ('DEBIT','CREDIT')),
  account_head        TEXT NOT NULL,
  sub_head            TEXT,
  reference_doc_type  TEXT,
  reference_doc_id    UUID,
  description         TEXT,
  debit_amount        NUMERIC(12,2) DEFAULT 0,
  credit_amount       NUMERIC(12,2) DEFAULT 0,
  currency            TEXT DEFAULT 'BDT',
  created_by          UUID REFERENCES auth.users,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── EMPLOYEES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_code          TEXT NOT NULL UNIQUE,
  full_name         TEXT NOT NULL,
  designation       TEXT,
  department        TEXT DEFAULT 'Warehouse',
  assigned_client   TEXT[],
  join_date         DATE,
  employment_type   TEXT DEFAULT 'Permanent',
  phone             TEXT,
  email             TEXT,
  nid_no            TEXT,
  address           TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  bank_name         TEXT,
  bank_account      TEXT,
  basic_salary      NUMERIC(12,2) DEFAULT 0,
  house_allowance   NUMERIC(12,2) DEFAULT 0,
  transport_allow   NUMERIC(12,2) DEFAULT 0,
  medical_allow     NUMERIC(12,2) DEFAULT 0,
  other_allow       NUMERIC(12,2) DEFAULT 0,
  gross_salary      NUMERIC(12,2) GENERATED ALWAYS AS (
    basic_salary + house_allowance + transport_allow + medical_allow + other_allow
  ) STORED,
  provident_fund    NUMERIC(12,2) DEFAULT 0,
  status            TEXT DEFAULT 'Active',
  photo_url         TEXT,
  user_id           UUID REFERENCES auth.users,
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── ATTENDANCE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees,
  attendance_date DATE NOT NULL,
  status          TEXT DEFAULT 'Present',
  in_time         TIME,
  out_time        TIME,
  overtime_hours  NUMERIC DEFAULT 0,
  remarks         TEXT,
  marked_by       UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, attendance_date)
);

-- ─── LEAVE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees,
  leave_type  TEXT DEFAULT 'Annual',
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  total_days  INTEGER GENERATED ALWAYS AS (to_date - from_date + 1) STORED,
  reason      TEXT,
  status      TEXT DEFAULT 'PENDING',
  approved_by UUID REFERENCES auth.users,
  remarks     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── PAYROLL ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payrolls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_no    TEXT NOT NULL UNIQUE,
  payroll_month TEXT NOT NULL,
  process_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'DRAFT',
  approved_by   UUID REFERENCES auth.users,
  total_gross   NUMERIC(12,2) DEFAULT 0,
  total_deduction NUMERIC(12,2) DEFAULT 0,
  total_net     NUMERIC(12,2) DEFAULT 0,
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id      UUID NOT NULL REFERENCES payrolls ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees,
  present_days    INTEGER DEFAULT 0,
  absent_days     INTEGER DEFAULT 0,
  overtime_hours  NUMERIC DEFAULT 0,
  basic_salary    NUMERIC(12,2) DEFAULT 0,
  house_allow     NUMERIC(12,2) DEFAULT 0,
  transport_allow NUMERIC(12,2) DEFAULT 0,
  medical_allow   NUMERIC(12,2) DEFAULT 0,
  other_allow     NUMERIC(12,2) DEFAULT 0,
  overtime_pay    NUMERIC(12,2) DEFAULT 0,
  gross_salary    NUMERIC(12,2) DEFAULT 0,
  tax_deduction   NUMERIC(12,2) DEFAULT 0,
  pf_deduction    NUMERIC(12,2) DEFAULT 0,
  absent_deduction NUMERIC(12,2) DEFAULT 0,
  other_deduction NUMERIC(12,2) DEFAULT 0,
  net_salary      NUMERIC(12,2) DEFAULT 0,
  payment_method  TEXT DEFAULT 'Bank',
  payment_status  TEXT DEFAULT 'Pending',
  payment_date    DATE,
  remarks         TEXT
);

-- ─── LABOUR LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labour_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_log_no   TEXT NOT NULL UNIQUE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id       TEXT REFERENCES clients(client_code),
  work_type       TEXT DEFAULT 'Loading',
  labour_source   TEXT,
  total_labours   INTEGER DEFAULT 0,
  working_hours   NUMERIC DEFAULT 0,
  rate_per_labour NUMERIC(12,2) DEFAULT 0,
  total_cost      NUMERIC(12,2) GENERATED ALWAYS AS (total_labours * working_hours * rate_per_labour) STORED,
  billing_type    TEXT DEFAULT 'Daily',
  supervisor      UUID REFERENCES employees,
  remarks         TEXT,
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── TASKS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_no         TEXT NOT NULL UNIQUE,
  task_title      TEXT NOT NULL,
  task_type       TEXT DEFAULT 'Custom',
  client_id       TEXT REFERENCES clients(client_code),
  assigned_to     UUID NOT NULL REFERENCES auth.users,
  due_date        DATE,
  due_time        TIME,
  priority        TEXT DEFAULT 'Normal',
  status          TEXT DEFAULT 'PENDING',
  description     TEXT,
  checklist_items JSONB DEFAULT '[]',
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES auth.users,
  remarks         TEXT,
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSPORTERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transporters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_code TEXT NOT NULL UNIQUE,
  transporter_name TEXT NOT NULL,
  transporter_type TEXT NOT NULL DEFAULT 'Third-party Truck',
  contact_person   TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  service_areas    TEXT[],
  payment_terms    TEXT DEFAULT 'Monthly',
  rate_type        TEXT DEFAULT 'Per Trip',
  base_rate        NUMERIC(12,2) DEFAULT 0,
  vat_applicable   BOOLEAN DEFAULT false,
  status           TEXT DEFAULT 'Active',
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── VEHICLES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_code     TEXT NOT NULL UNIQUE,
  registration_no  TEXT NOT NULL UNIQUE,
  vehicle_type     TEXT DEFAULT 'Covered Van',
  ownership        TEXT DEFAULT 'Own',
  transporter_id   UUID REFERENCES transporters,
  brand            TEXT,
  model            TEXT,
  capacity_kg      NUMERIC,
  capacity_cft     NUMERIC,
  driver_id        UUID,
  fitness_expiry   DATE,
  tax_token_expiry DATE,
  insurance_expiry DATE,
  status           TEXT DEFAULT 'Active',
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── DRIVERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_code      TEXT NOT NULL UNIQUE,
  full_name        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  nid_no           TEXT,
  license_no       TEXT NOT NULL,
  license_type     TEXT DEFAULT 'Professional',
  license_expiry   DATE,
  employment_type  TEXT DEFAULT 'Own Staff',
  transporter_id   UUID REFERENCES transporters,
  employee_id      UUID REFERENCES employees,
  address          TEXT,
  emergency_contact TEXT,
  emergency_phone  TEXT,
  photo_url        TEXT,
  status           TEXT DEFAULT 'Active',
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSPORT REQUESTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no          TEXT NOT NULL UNIQUE,
  trip_no             TEXT UNIQUE,
  client_id           TEXT REFERENCES clients(client_code),
  request_type        TEXT NOT NULL DEFAULT 'OUTBOUND',
  request_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  required_by         DATE NOT NULL,
  priority            TEXT DEFAULT 'Normal',
  reference_doc_type  TEXT,
  reference_doc_id    UUID,
  reference_doc_no    TEXT,
  from_location       TEXT NOT NULL,
  to_location         TEXT NOT NULL,
  cargo_description   TEXT,
  total_packages      INTEGER,
  total_weight_kg     NUMERIC,
  special_instruction TEXT,
  requester_note      TEXT,
  approval_status     TEXT DEFAULT 'PENDING APPROVAL',
  approved_by         UUID REFERENCES auth.users,
  approved_at         TIMESTAMPTZ,
  manager_comment     TEXT,
  rejection_reason    TEXT,
  transporter_id      UUID REFERENCES transporters,
  vehicle_id          UUID REFERENCES vehicles,
  vehicle_reg_no      TEXT,
  driver_id           UUID REFERENCES drivers,
  driver_name         TEXT,
  driver_phone        TEXT,
  rate_type           TEXT,
  base_amount         NUMERIC(12,2),
  extra_charges       NUMERIC(12,2) DEFAULT 0,
  extra_remarks       TEXT,
  vat_amount          NUMERIC(12,2) DEFAULT 0,
  total_amount        NUMERIC(12,2) GENERATED ALWAYS AS (
    COALESCE(base_amount,0) + COALESCE(extra_charges,0) + COALESCE(vat_amount,0)
  ) STORED,
  contract_id         UUID,
  officer_note        TEXT,
  assigned_by         UUID REFERENCES auth.users,
  assigned_at         TIMESTAMPTZ,
  payment_status      TEXT DEFAULT 'Unpaid',
  payment_date        DATE,
  payment_method      TEXT,
  expense_id          UUID REFERENCES expenses,
  status              TEXT DEFAULT 'PENDING APPROVAL',
  created_by          UUID REFERENCES auth.users,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES transport_requests,
  status_from TEXT,
  status_to   TEXT,
  comment     TEXT,
  added_by    UUID REFERENCES auth.users,
  added_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSPORTER BILLS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS transporter_bills (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no          TEXT NOT NULL UNIQUE,
  bill_type        TEXT NOT NULL DEFAULT 'TRANSPORT BILL',
  request_id       UUID REFERENCES transport_requests,
  client_id        TEXT REFERENCES clients(client_code),
  transporter_id   UUID REFERENCES transporters,
  trip_no          TEXT,
  vehicle_reg_no   TEXT,
  driver_name      TEXT,
  from_location    TEXT,
  to_location      TEXT,
  delivery_date    DATE,
  cn_no            TEXT,
  cn_date          DATE,
  courier_tracking TEXT,
  parcel_description TEXT,
  parcel_weight_kg NUMERIC,
  parcel_dimensions TEXT,
  rate_type        TEXT,
  base_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_charges    NUMERIC(12,2) DEFAULT 0,
  extra_breakdown  JSONB,
  vat_percent      NUMERIC DEFAULT 0,
  vat_amount       NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) GENERATED ALWAYS AS (base_amount + extra_charges + vat_amount) STORED,
  bill_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE,
  payment_status   TEXT DEFAULT 'Unpaid',
  paid_amount      NUMERIC(12,2) DEFAULT 0,
  payment_date     DATE,
  payment_method   TEXT,
  transaction_ref  TEXT,
  payment_remarks  TEXT,
  expense_id       UUID REFERENCES expenses,
  status           TEXT DEFAULT 'DRAFT',
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Unique: one active bill per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_request_id_active
  ON transporter_bills(request_id)
  WHERE status != 'CANCELLED';

-- ─── TRANSPORT CONTRACTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no     TEXT NOT NULL UNIQUE,
  client_id       TEXT REFERENCES clients(client_code),
  transporter_id  UUID REFERENCES transporters,
  contract_month  TEXT NOT NULL,
  contract_from   DATE NOT NULL,
  contract_to     DATE NOT NULL,
  service_scope   TEXT,
  monthly_amount  NUMERIC(12,2) NOT NULL,
  vat_amount      NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) GENERATED ALWAYS AS (monthly_amount + vat_amount) STORED,
  trips_included  INTEGER,
  trips_used      INTEGER DEFAULT 0,
  extra_trip_rate NUMERIC(12,2),
  status          TEXT DEFAULT 'ACTIVE',
  expense_id      UUID REFERENCES expenses,
  remarks         TEXT,
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── PROMO ITEMS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT REFERENCES clients(client_code),
  item_name     TEXT NOT NULL,
  item_code     TEXT NOT NULL UNIQUE,
  category      TEXT DEFAULT 'Other',
  description   TEXT,
  size          TEXT,
  color         TEXT,
  unit          TEXT DEFAULT 'PCS',
  image_url     TEXT,
  reorder_level NUMERIC DEFAULT 0,
  status        TEXT DEFAULT 'Active',
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── PROMO STOCK LEDGER ───────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_stock_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          TEXT REFERENCES clients(client_code),
  promo_item_id      UUID NOT NULL REFERENCES promo_items,
  location_id        UUID NOT NULL REFERENCES bins,
  current_qty        NUMERIC(12,3) DEFAULT 0 CHECK (current_qty >= 0),
  last_movement_type TEXT,
  last_movement_date TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, promo_item_id, location_id)
);

-- ─── PROMO STOCK MOVEMENTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_stock_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          TEXT,
  promo_item_id      UUID REFERENCES promo_items,
  location_id        UUID REFERENCES bins,
  movement_type      TEXT NOT NULL,
  reference_doc_type TEXT,
  reference_doc_id   UUID,
  reference_doc_no   TEXT,
  qty_change         NUMERIC(12,3) NOT NULL,
  moved_by           UUID REFERENCES auth.users,
  moved_at           TIMESTAMPTZ DEFAULT now()
);

-- ─── PROMO RECEIPTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_receipts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no     TEXT NOT NULL UNIQUE,
  client_id      TEXT REFERENCES clients(client_code),
  receipt_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  received_from  TEXT,
  campaign_name  TEXT,
  vehicle_no     TEXT,
  received_by    UUID REFERENCES auth.users,
  remarks        TEXT,
  status         TEXT DEFAULT 'DRAFT',
  created_by     UUID REFERENCES auth.users,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_receipt_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id    UUID NOT NULL REFERENCES promo_receipts ON DELETE CASCADE,
  promo_item_id UUID NOT NULL REFERENCES promo_items,
  received_qty  NUMERIC(12,3) NOT NULL CHECK (received_qty > 0),
  location_id   UUID REFERENCES bins,
  remarks       TEXT
);

-- ─── PROMO DISTRIBUTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_distributions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dist_no           TEXT NOT NULL UNIQUE,
  client_id         TEXT REFERENCES clients(client_code),
  dist_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  dist_type         TEXT NOT NULL DEFAULT 'DEALER/CUSTOMER',
  campaign_name     TEXT,
  recipient_type    TEXT,
  customer_id       UUID REFERENCES customers,
  recipient_name    TEXT,
  recipient_phone   TEXT,
  recipient_address TEXT,
  event_name        TEXT,
  event_location    TEXT,
  event_date        DATE,
  employee_id       UUID REFERENCES employees,
  staff_name        TEXT,
  purpose           TEXT,
  approved_by       UUID REFERENCES auth.users,
  remarks           TEXT,
  status            TEXT DEFAULT 'DRAFT',
  created_by        UUID REFERENCES auth.users,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_distribution_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dist_id        UUID NOT NULL REFERENCES promo_distributions ON DELETE CASCADE,
  promo_item_id  UUID NOT NULL REFERENCES promo_items,
  distribute_qty NUMERIC(12,3) NOT NULL CHECK (distribute_qty > 0),
  from_location  UUID REFERENCES bins,
  remarks        TEXT
);
