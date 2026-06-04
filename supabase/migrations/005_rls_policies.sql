-- ============================================================
-- 3i Logistics ERP — Row Level Security Policies
-- Run AFTER tables are created
-- ============================================================

-- ─── HELPER FUNCTIONS ─────────────────────────────────────

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'Super Admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_accessible_clients()
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(rc.client_id)
  FROM role_clients rc
  JOIN user_roles ur ON ur.role_id = rc.role_id
  WHERE ur.user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = auth.uid()
      AND rp.module = p_module
      AND CASE p_action
        WHEN 'view'    THEN rp.can_view
        WHEN 'create'  THEN rp.can_create
        WHEN 'edit'    THEN rp.can_edit
        WHEN 'delete'  THEN rp.can_delete
        WHEN 'approve' THEN rp.can_approve
        WHEN 'post'    THEN rp.can_post
        WHEN 'print'   THEN rp.can_print
        ELSE false
      END = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ─── ENABLE RLS ON ALL TABLES ─────────────────────────────

ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_input_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index           ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favourites        ENABLE ROW LEVEL SECURITY;

ALTER TABLE warehouses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE racks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements        ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_lines               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_lines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE prn                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prn_lines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_lines               ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dc_lines               ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_pass_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE srn                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE srn_lines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_cancels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_count_lines      ENABLE ROW LEVEL SECURITY;

ALTER TABLE expenses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;

ALTER TABLE transporters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_bills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_contracts    ENABLE ROW LEVEL SECURITY;

ALTER TABLE promo_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_stock_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_receipt_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_distributions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_distribution_lines ENABLE ROW LEVEL SECURITY;

-- ─── CLIENTS ──────────────────────────────────────────────
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (client_code = ANY(get_accessible_clients()) OR is_super_admin());
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (is_super_admin());
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (is_super_admin());

-- ─── ROLES & PERMISSIONS (everyone reads, Super Admin writes) ──
CREATE POLICY "roles_select"       ON roles              FOR SELECT USING (true);
CREATE POLICY "roles_write"        ON roles              FOR ALL    USING (is_super_admin());
CREATE POLICY "role_perms_select"  ON role_permissions   FOR SELECT USING (true);
CREATE POLICY "role_perms_write"   ON role_permissions   FOR ALL    USING (is_super_admin());
CREATE POLICY "role_fp_select"     ON role_field_permissions FOR SELECT USING (true);
CREATE POLICY "role_fp_write"      ON role_field_permissions FOR ALL USING (is_super_admin());
CREATE POLICY "role_clients_select" ON role_clients      FOR SELECT USING (true);
CREATE POLICY "role_clients_write"  ON role_clients      FOR ALL    USING (is_super_admin());
CREATE POLICY "user_roles_select"  ON user_roles         FOR SELECT USING (true);
CREATE POLICY "user_roles_write"   ON user_roles         FOR ALL    USING (is_super_admin());

-- ─── USER PREFERENCES (own only) ──────────────────────────
CREATE POLICY "prefs_own" ON user_preferences
  USING (user_id = auth.uid());

-- ─── USER INPUT HISTORY (own only) ────────────────────────
CREATE POLICY "history_own" ON user_input_history
  USING (user_id = auth.uid());

-- ─── SAVED FILTERS (own only) ─────────────────────────────
CREATE POLICY "filters_own" ON saved_filters
  USING (user_id = auth.uid());

-- ─── USER FAVOURITES (own only) ───────────────────────────
CREATE POLICY "fav_own" ON user_favourites
  USING (user_id = auth.uid());

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR role_id IN (SELECT role_id FROM user_roles WHERE user_id = auth.uid())
    OR is_super_admin()
  );
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid() OR is_super_admin());

-- ─── AUDIT LOGS (append-only, immutable) ──────────────────
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (is_super_admin() OR user_id = auth.uid());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- NO UPDATE or DELETE policies → immutable

-- ─── ATTACHMENTS ──────────────────────────────────────────
CREATE POLICY "attach_select" ON attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "attach_insert" ON attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attach_delete" ON attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR is_super_admin());

-- ─── SEARCH INDEX (all authenticated) ─────────────────────
CREATE POLICY "search_select" ON search_index FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "search_insert" ON search_index FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── WAREHOUSE HIERARCHY (all authenticated can view masters) ──
CREATE POLICY "wh_select" ON warehouses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wh_write"  ON warehouses FOR ALL   USING (is_super_admin() OR has_permission('masters','create'));
CREATE POLICY "zones_select" ON zones   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zones_write"  ON zones   FOR ALL    USING (is_super_admin() OR has_permission('masters','create'));
CREATE POLICY "racks_select" ON racks   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "racks_write"  ON racks   FOR ALL    USING (is_super_admin() OR has_permission('masters','create'));
CREATE POLICY "bins_select"  ON bins    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bins_write"   ON bins    FOR ALL    USING (is_super_admin() OR has_permission('masters','create'));

-- ─── MASTERS (client-isolated) ────────────────────────────
-- Suppliers
CREATE POLICY "sup_select" ON suppliers FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());
CREATE POLICY "sup_insert" ON suppliers FOR INSERT
  WITH CHECK (has_permission('masters','create') OR is_super_admin());
CREATE POLICY "sup_update" ON suppliers FOR UPDATE
  USING (has_permission('masters','edit') OR is_super_admin());
CREATE POLICY "sup_delete" ON suppliers FOR DELETE USING (is_super_admin());

-- Customers
CREATE POLICY "cust_select" ON customers FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());
CREATE POLICY "cust_insert" ON customers FOR INSERT
  WITH CHECK (has_permission('masters','create') OR is_super_admin());
CREATE POLICY "cust_update" ON customers FOR UPDATE
  USING (has_permission('masters','edit') OR is_super_admin());
CREATE POLICY "cust_delete" ON customers FOR DELETE USING (is_super_admin());

-- Items
CREATE POLICY "items_select" ON items FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());
CREATE POLICY "items_insert" ON items FOR INSERT
  WITH CHECK (has_permission('masters','create') OR is_super_admin());
CREATE POLICY "items_update" ON items FOR UPDATE
  USING (has_permission('masters','edit') OR is_super_admin());
CREATE POLICY "items_delete" ON items FOR DELETE USING (is_super_admin());

-- ─── STOCK LEDGER (read-only for users, triggers only write) ──
CREATE POLICY "stock_select" ON stock_ledger FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('stock_ledger','view') OR is_super_admin());
-- No INSERT/UPDATE/DELETE — only DB triggers write to stock_ledger

CREATE POLICY "stock_mov_select" ON stock_movements FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());

-- ─── PURCHASE ORDERS ──────────────────────────────────────
CREATE POLICY "po_select" ON purchase_orders FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('po','view') OR is_super_admin());
CREATE POLICY "po_insert" ON purchase_orders FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('po','create') OR is_super_admin());
CREATE POLICY "po_update" ON purchase_orders FOR UPDATE
  USING (
    (has_permission('po','edit') AND status = 'DRAFT')
    OR (has_permission('po','approve') AND status = 'SUBMITTED')
    OR is_super_admin()
  );
CREATE POLICY "po_delete" ON purchase_orders FOR DELETE USING (is_super_admin());

CREATE POLICY "po_lines_select" ON po_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = po_lines.po_id AND (po.client_id = ANY(get_accessible_clients()) OR is_super_admin())));
CREATE POLICY "po_lines_write" ON po_lines FOR ALL
  USING (is_super_admin() OR has_permission('po','create') OR has_permission('po','edit'));

-- ─── GRN ──────────────────────────────────────────────────
CREATE POLICY "grn_select" ON grn FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('grn','view') OR is_super_admin());
CREATE POLICY "grn_insert" ON grn FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('grn','create') OR is_super_admin());
CREATE POLICY "grn_update" ON grn FOR UPDATE
  USING (
    (has_permission('grn','edit') AND status = 'DRAFT')
    OR (has_permission('grn','approve') AND status IN ('SUBMITTED','APPROVED'))
    OR (has_permission('grn','post'))
    OR is_super_admin()
  );
CREATE POLICY "grn_delete" ON grn FOR DELETE USING (is_super_admin());

CREATE POLICY "grn_lines_all" ON grn_lines FOR ALL
  USING (is_super_admin() OR has_permission('grn','create') OR has_permission('grn','edit'));

-- ─── PRN ──────────────────────────────────────────────────
CREATE POLICY "prn_select" ON prn FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('prn','view') OR is_super_admin());
CREATE POLICY "prn_insert" ON prn FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('prn','create') OR is_super_admin());
CREATE POLICY "prn_update" ON prn FOR UPDATE
  USING ((has_permission('prn','edit') AND status = 'DRAFT') OR has_permission('prn','approve') OR has_permission('prn','post') OR is_super_admin());
CREATE POLICY "prn_delete" ON prn FOR DELETE USING (is_super_admin());
CREATE POLICY "prn_lines_all" ON prn_lines FOR ALL
  USING (is_super_admin() OR has_permission('prn','create') OR has_permission('prn','edit'));

-- ─── SALES ORDERS ─────────────────────────────────────────
CREATE POLICY "so_select" ON sales_orders FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('so','view') OR is_super_admin());
CREATE POLICY "so_insert" ON sales_orders FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('so','create') OR is_super_admin());
CREATE POLICY "so_update" ON sales_orders FOR UPDATE
  USING ((has_permission('so','edit') AND status = 'DRAFT') OR has_permission('so','approve') OR is_super_admin());
CREATE POLICY "so_delete" ON sales_orders FOR DELETE USING (is_super_admin());
CREATE POLICY "so_lines_all" ON so_lines FOR ALL
  USING (is_super_admin() OR has_permission('so','create') OR has_permission('so','edit'));

-- ─── DELIVERY CHALLANS ────────────────────────────────────
CREATE POLICY "dc_select" ON delivery_challans FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('dc','view') OR is_super_admin());
CREATE POLICY "dc_insert" ON delivery_challans FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('dc','create') OR is_super_admin());
CREATE POLICY "dc_update" ON delivery_challans FOR UPDATE
  USING ((has_permission('dc','edit') AND status = 'DRAFT') OR has_permission('dc','approve') OR is_super_admin());
CREATE POLICY "dc_delete" ON delivery_challans FOR DELETE USING (is_super_admin());
CREATE POLICY "dc_lines_all" ON dc_lines FOR ALL
  USING (is_super_admin() OR has_permission('dc','create') OR has_permission('dc','edit'));

-- ─── GATE PASSES ──────────────────────────────────────────
CREATE POLICY "gp_select" ON gate_passes FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('gate_pass','view') OR is_super_admin());
CREATE POLICY "gp_insert" ON gate_passes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gp_update" ON gate_passes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "gp_delete" ON gate_passes FOR DELETE USING (is_super_admin());
CREATE POLICY "gp_lines_all" ON gate_pass_lines FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── SRN ──────────────────────────────────────────────────
CREATE POLICY "srn_select" ON srn FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('srn','view') OR is_super_admin());
CREATE POLICY "srn_insert" ON srn FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('srn','create') OR is_super_admin());
CREATE POLICY "srn_update" ON srn FOR UPDATE
  USING ((has_permission('srn','edit') AND status = 'DRAFT') OR has_permission('srn','approve') OR is_super_admin());
CREATE POLICY "srn_delete" ON srn FOR DELETE USING (is_super_admin());
CREATE POLICY "srn_lines_all" ON srn_lines FOR ALL
  USING (is_super_admin() OR has_permission('srn','create') OR has_permission('srn','edit'));

-- ─── INVOICE CANCELS ──────────────────────────────────────
CREATE POLICY "ic_all" ON invoice_cancels FOR ALL
  USING (has_permission('invoice_cancel','create') OR is_super_admin());

-- ─── EXCHANGES ────────────────────────────────────────────
CREATE POLICY "exc_select" ON exchanges FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('exchange','view') OR is_super_admin());
CREATE POLICY "exc_write" ON exchanges FOR ALL
  USING (has_permission('exchange','create') OR has_permission('exchange','edit') OR is_super_admin());
CREATE POLICY "exc_delete" ON exchanges FOR DELETE USING (is_super_admin());

-- ─── DAMAGED STOCK ────────────────────────────────────────
CREATE POLICY "dmg_select" ON damaged_stock FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('damaged_stock','view') OR is_super_admin());
CREATE POLICY "dmg_write"  ON damaged_stock FOR ALL
  USING (has_permission('damaged_stock','create') OR is_super_admin());

-- ─── STOCK ADJUSTMENTS ────────────────────────────────────
CREATE POLICY "adj_select" ON stock_adjustments FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('stock_adjustment','view') OR is_super_admin());
CREATE POLICY "adj_write"  ON stock_adjustments FOR ALL
  USING (has_permission('stock_adjustment','create') OR has_permission('stock_adjustment','approve') OR is_super_admin());
CREATE POLICY "adj_delete" ON stock_adjustments FOR DELETE USING (is_super_admin());
CREATE POLICY "adj_lines_all" ON adjustment_lines FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── STOCK TRANSFERS ──────────────────────────────────────
CREATE POLICY "str_select" ON stock_transfers FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('stock_transfer','view') OR is_super_admin());
CREATE POLICY "str_write" ON stock_transfers FOR ALL
  USING (has_permission('stock_transfer','create') OR is_super_admin());
CREATE POLICY "str_delete" ON stock_transfers FOR DELETE USING (is_super_admin());

-- ─── CYCLE COUNTS ─────────────────────────────────────────
CREATE POLICY "cyc_select" ON cycle_counts FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('cycle_count','view') OR is_super_admin());
CREATE POLICY "cyc_write" ON cycle_counts FOR ALL
  USING (has_permission('cycle_count','create') OR has_permission('cycle_count','approve') OR is_super_admin());
CREATE POLICY "cyc_lines_all" ON cycle_count_lines FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── FINANCE ──────────────────────────────────────────────
CREATE POLICY "exp_select" ON expenses FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('expense','view') OR is_super_admin());
CREATE POLICY "exp_write"  ON expenses FOR ALL
  USING (has_permission('expense','create') OR has_permission('expense','approve') OR is_super_admin());
CREATE POLICY "exp_delete" ON expenses FOR DELETE USING (is_super_admin());

CREATE POLICY "budget_select" ON budgets FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('budget','view') OR is_super_admin());
CREATE POLICY "budget_write"  ON budgets FOR ALL
  USING (has_permission('budget','create') OR has_permission('budget','approve') OR is_super_admin());

CREATE POLICY "inv_select" ON invoices FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('invoice','view') OR is_super_admin());
CREATE POLICY "inv_write"  ON invoices FOR ALL
  USING (has_permission('invoice','create') OR has_permission('invoice','approve') OR is_super_admin());
CREATE POLICY "inv_delete" ON invoices FOR DELETE USING (is_super_admin());
CREATE POLICY "inv_lines_all" ON invoice_lines FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "inv_pay_all"   ON invoice_payments FOR ALL
  USING (has_permission('payment','create') OR is_super_admin());

CREATE POLICY "ledger_select" ON finance_ledger FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('ledger','view') OR is_super_admin());
CREATE POLICY "ledger_insert" ON finance_ledger FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── HR ───────────────────────────────────────────────────
CREATE POLICY "emp_select" ON employees FOR SELECT
  USING (has_permission('employee','view') OR is_super_admin());
CREATE POLICY "emp_write"  ON employees FOR ALL
  USING (has_permission('employee','create') OR has_permission('employee','edit') OR is_super_admin());
CREATE POLICY "emp_delete" ON employees FOR DELETE USING (is_super_admin());

CREATE POLICY "att_select" ON attendance FOR SELECT
  USING (has_permission('attendance','view') OR is_super_admin());
CREATE POLICY "att_write"  ON attendance FOR ALL
  USING (has_permission('attendance','create') OR is_super_admin());

CREATE POLICY "leave_select" ON leave_requests FOR SELECT
  USING (has_permission('leave','view') OR is_super_admin() OR
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_write"  ON leave_requests FOR ALL
  USING (has_permission('leave','create') OR has_permission('leave','approve') OR is_super_admin());

CREATE POLICY "payroll_select" ON payrolls FOR SELECT
  USING (has_permission('payroll','view') OR is_super_admin());
CREATE POLICY "payroll_write"  ON payrolls FOR ALL
  USING (has_permission('payroll','create') OR has_permission('payroll','approve') OR is_super_admin());
CREATE POLICY "payroll_lines_all" ON payroll_lines FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "labour_select" ON labour_logs FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('labour','view') OR is_super_admin());
CREATE POLICY "labour_write"  ON labour_logs FOR ALL
  USING (has_permission('labour','create') OR is_super_admin());

CREATE POLICY "task_select" ON tasks FOR SELECT
  USING (assigned_to = auth.uid() OR has_permission('task','view') OR is_super_admin());
CREATE POLICY "task_write"  ON tasks FOR ALL
  USING (has_permission('task','create') OR has_permission('task','edit') OR is_super_admin());

-- ─── TRANSPORT MASTERS (all authenticated can view) ────────
CREATE POLICY "trans_select" ON transporters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "trans_write"  ON transporters FOR ALL
  USING (has_permission('transport','create') OR is_super_admin());
CREATE POLICY "veh_select" ON vehicles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "veh_write"  ON vehicles FOR ALL
  USING (has_permission('transport','create') OR is_super_admin());
CREATE POLICY "drv_select" ON drivers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "drv_write"  ON drivers FOR ALL
  USING (has_permission('transport','create') OR is_super_admin());

-- ─── TRANSPORT REQUESTS ────────────────────────────────────
CREATE POLICY "trq_select" ON transport_requests FOR SELECT
  USING (
    is_super_admin()
    OR has_permission('transport','view')
    OR created_by = auth.uid()
  );
CREATE POLICY "trq_insert" ON transport_requests FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND has_permission('transport','create') OR is_super_admin());
CREATE POLICY "trq_update" ON transport_requests FOR UPDATE
  USING (
    is_super_admin()
    OR (has_permission('transport','edit') AND status = 'PENDING APPROVAL')
    OR has_permission('transport','approve')
    OR has_permission('transport','post')
  );
CREATE POLICY "trq_delete" ON transport_requests FOR DELETE USING (is_super_admin());

CREATE POLICY "tal_select" ON transport_activity_log FOR SELECT
  USING (
    is_super_admin()
    OR has_permission('transport','view')
    OR added_by = auth.uid()
    OR EXISTS (SELECT 1 FROM transport_requests tr WHERE tr.id = transport_activity_log.request_id AND tr.created_by = auth.uid())
  );
CREATE POLICY "tal_insert" ON transport_activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND has_permission('transport','view'));

-- ─── TRANSPORTER BILLS ─────────────────────────────────────
CREATE POLICY "tbill_select" ON transporter_bills FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND (has_permission('transport','view') OR is_super_admin()));
CREATE POLICY "tbill_insert" ON transporter_bills FOR INSERT
  WITH CHECK (client_id = ANY(get_accessible_clients()) AND (has_permission('transport','post') OR is_super_admin()));
CREATE POLICY "tbill_update" ON transporter_bills FOR UPDATE
  USING ((has_permission('transport','post') AND status = 'DRAFT') OR is_super_admin());
CREATE POLICY "tbill_delete" ON transporter_bills FOR DELETE USING (is_super_admin());

-- ─── TRANSPORT CONTRACTS ───────────────────────────────────
CREATE POLICY "tcon_select" ON transport_contracts FOR SELECT
  USING (has_permission('transport','view') OR is_super_admin());
CREATE POLICY "tcon_write"  ON transport_contracts FOR ALL
  USING (has_permission('transport','approve') OR is_super_admin());

-- ─── PROMOTIONAL ───────────────────────────────────────────
CREATE POLICY "pi_select" ON promo_items FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());
CREATE POLICY "pi_write"  ON promo_items FOR ALL
  USING (has_permission('promotional','create') OR is_super_admin());

CREATE POLICY "psl_select" ON promo_stock_ledger FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('promotional','view') OR is_super_admin());

CREATE POLICY "psm_select" ON promo_stock_movements FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) OR is_super_admin());

CREATE POLICY "pr_select" ON promo_receipts FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('promotional','view') OR is_super_admin());
CREATE POLICY "pr_write"  ON promo_receipts FOR ALL
  USING (has_permission('promotional','create') OR is_super_admin());
CREATE POLICY "prl_all" ON promo_receipt_lines FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "pd_select" ON promo_distributions FOR SELECT
  USING (client_id = ANY(get_accessible_clients()) AND has_permission('promotional','view') OR is_super_admin());
CREATE POLICY "pd_write"  ON promo_distributions FOR ALL
  USING (has_permission('promotional','create') OR has_permission('promotional','approve') OR is_super_admin());
CREATE POLICY "pdl_all" ON promo_distribution_lines FOR ALL USING (auth.uid() IS NOT NULL);
