-- ============================================================
-- 3i Logistics ERP — Database Indexes
-- ============================================================

-- Document numbers (unique + fast lookup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_po_po_no         ON purchase_orders(po_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_grn_grn_no        ON grn(grn_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_so_so_no          ON sales_orders(so_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dc_dc_no          ON delivery_challans(dc_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_srn_srn_no        ON srn(srn_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prn_prn_no        ON prn(prn_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_gp_no          ON gate_passes(gp_no);

-- SAP codes (global unique + fast lookup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sap_material ON items(sap_material_code)
  WHERE sap_material_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_sap_code ON customers(sap_customer_code)
  WHERE sap_customer_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grn_sap_grn_no     ON grn(sap_grn_no)
  WHERE sap_grn_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grn_sap_miro_no    ON grn(sap_miro_no)
  WHERE sap_miro_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dc_sap_invoice_no  ON delivery_challans(sap_invoice_no)
  WHERE sap_invoice_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exc_sap_job_id     ON exchanges(sap_job_id)
  WHERE sap_job_id IS NOT NULL;

-- Client filtering (every transaction table)
CREATE INDEX IF NOT EXISTS idx_grn_client_id     ON grn(client_id);
CREATE INDEX IF NOT EXISTS idx_so_client_id      ON sales_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_dc_client_id      ON delivery_challans(client_id);
CREATE INDEX IF NOT EXISTS idx_items_client_id   ON items(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client   ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client   ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_po_client_id      ON purchase_orders(client_id);

-- Date filtering
CREATE INDEX IF NOT EXISTS idx_grn_received_date  ON grn(received_date);
CREATE INDEX IF NOT EXISTS idx_so_order_date      ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_dc_delivery_date   ON delivery_challans(delivery_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_invoices_date      ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_grn_status     ON grn(status);
CREATE INDEX IF NOT EXISTS idx_so_status      ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_dc_status      ON delivery_challans(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_trq_status     ON transport_requests(status);

-- Stock ledger (queried constantly)
CREATE INDEX IF NOT EXISTS idx_stock_item_client  ON stock_ledger(item_id, client_id);
CREATE INDEX IF NOT EXISTS idx_stock_location     ON stock_ledger(location_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread   ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notif_created  ON notifications(created_at DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_module   ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at DESC);

-- Transport
CREATE INDEX IF NOT EXISTS idx_trq_client     ON transport_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_trq_date       ON transport_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_trq_created_by ON transport_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_tal_request    ON transport_activity_log(request_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment  ON transporter_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_trans    ON transporter_bills(transporter_id);
CREATE INDEX IF NOT EXISTS idx_bills_date     ON transporter_bills(bill_date);

-- Search index
CREATE INDEX IF NOT EXISTS idx_search_doc_no   ON search_index(doc_no);
CREATE INDEX IF NOT EXISTS idx_search_sap      ON search_index(sap_ref_1, sap_ref_2, sap_ref_3);
CREATE INDEX IF NOT EXISTS idx_search_client   ON search_index(client_id);

-- Promo
CREATE INDEX IF NOT EXISTS idx_promo_ledger_item   ON promo_stock_ledger(promo_item_id);
CREATE INDEX IF NOT EXISTS idx_promo_ledger_client ON promo_stock_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_promo_dist_date     ON promo_distributions(dist_date);

-- User history
CREATE INDEX IF NOT EXISTS idx_user_history_lookup ON user_input_history(user_id, module, field_name);
