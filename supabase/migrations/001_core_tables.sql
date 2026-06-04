-- ============================================================
-- 3i Logistics ERP — Core Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── CLIENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code      TEXT NOT NULL UNIQUE,  -- WH / RB / GD / 3I
  client_name      TEXT NOT NULL,
  client_type      TEXT DEFAULT '3PL Client',
  address          TEXT,
  contact_person   TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  sap_enabled      BOOLEAN DEFAULT false,
  sap_company_code TEXT,
  warehouse_code   TEXT,
  expense_categories TEXT[],
  status           TEXT DEFAULT 'Active',
  remarks          TEXT,
  created_by       UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── ROLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  login_from  TIME,
  login_to    TIME,
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES auth.users,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── USER ROLES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users,
  role_id     UUID NOT NULL REFERENCES roles,
  assigned_by UUID REFERENCES auth.users,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)  -- one role per user
);

-- ─── ROLE CLIENT ACCESS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS role_clients (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id   UUID NOT NULL REFERENCES roles ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(client_code),
  UNIQUE (role_id, client_id)
);

-- ─── ROLE PERMISSIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     UUID NOT NULL REFERENCES roles ON DELETE CASCADE,
  module      TEXT NOT NULL,
  can_view    BOOLEAN DEFAULT false,
  can_create  BOOLEAN DEFAULT false,
  can_edit    BOOLEAN DEFAULT false,
  can_delete  BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_post    BOOLEAN DEFAULT false,
  can_print   BOOLEAN DEFAULT false,
  UNIQUE (role_id, module)
);

-- ─── ROLE FIELD PERMISSIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS role_field_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id    UUID NOT NULL REFERENCES roles ON DELETE CASCADE,
  module     TEXT NOT NULL,
  field_name TEXT NOT NULL,
  can_view   BOOLEAN DEFAULT true,
  can_edit   BOOLEAN DEFAULT true,
  UNIQUE (role_id, module, field_name)
);

-- ─── USER PREFERENCES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users UNIQUE,
  default_client   TEXT REFERENCES clients(client_code),
  dashboard_layout JSONB,
  column_prefs     JSONB,
  default_filters  JSONB,
  items_per_page   INTEGER DEFAULT 25,
  date_format      TEXT DEFAULT 'DD/MM/YYYY',
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── USER INPUT HISTORY (smart suggestions) ───────────────
CREATE TABLE IF NOT EXISTS user_input_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users,
  module     TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value      TEXT NOT NULL,
  used_count INTEGER DEFAULT 1,
  last_used  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, module, field_name, value)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users,
  role_id             UUID REFERENCES roles,
  type                TEXT NOT NULL,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  reference_doc_type  TEXT,
  reference_doc_id    UUID,
  reference_doc_no    TEXT,
  is_read             BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users,
  user_name      TEXT,
  user_role      TEXT,
  action         TEXT NOT NULL,
  module         TEXT NOT NULL,
  record_id      UUID,
  record_no      TEXT,
  old_values     JSONB,
  new_values     JSONB,
  changed_fields TEXT[],
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── ATTACHMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module           TEXT NOT NULL,
  record_id        UUID NOT NULL,
  record_no        TEXT,
  file_name        TEXT NOT NULL,
  file_type        TEXT,
  file_size        INTEGER,
  google_drive_id  TEXT,
  google_drive_url TEXT,
  uploaded_by      UUID REFERENCES auth.users,
  uploaded_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── SEARCH INDEX ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_index (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type     TEXT NOT NULL,
  doc_id       UUID NOT NULL,
  doc_no       TEXT,
  sap_ref_1    TEXT,
  sap_ref_2    TEXT,
  sap_ref_3    TEXT,
  client_id    TEXT,
  item_ref     TEXT,
  customer_ref TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── SAVED FILTERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users,
  module      TEXT NOT NULL,
  filter_name TEXT NOT NULL,
  filter_data JSONB NOT NULL,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, module, filter_name)
);

-- ─── USER FAVOURITES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favourites (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users,
  doc_type TEXT NOT NULL,
  doc_id   UUID NOT NULL,
  doc_no   TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, doc_type, doc_id)
);
