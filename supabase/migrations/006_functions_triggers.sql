-- ============================================================
-- 3i Logistics ERP — DB Functions & Triggers
-- ============================================================

-- ─── DOCUMENT NUMBER GENERATOR ────────────────────────────
-- Uses PostgreSQL sequences → atomic, no race conditions
-- Format: GRN-WH-2026-0001

CREATE OR REPLACE FUNCTION generate_doc_no(
  p_module TEXT,
  p_client TEXT,
  p_year   INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_seq_name TEXT;
  v_next_val BIGINT;
BEGIN
  v_seq_name := 'seq_' || p_module || '_' || p_client || '_' || p_year;

  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS %I START 1 INCREMENT 1 NO CYCLE',
    v_seq_name
  );

  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_val;

  RETURN p_module || '-' || p_client || '-' || p_year || '-' || LPAD(v_next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── DB SIZE CHECK ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS TEXT AS $$
  SELECT pg_size_pretty(pg_database_size(current_database()));
$$ LANGUAGE SQL SECURITY DEFINER;

-- ─── STOCK TRIGGER: GRN → stock + (on POSTED + miro_posted) ──
CREATE OR REPLACE FUNCTION update_stock_on_grn_miro()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire when BOTH: status = POSTED AND miro_posted flips to true
  -- Case 1: status just became POSTED and miro_posted already true
  -- Case 2: miro_posted just became true and status already POSTED
  IF (
    (NEW.status = 'POSTED' AND OLD.status != 'POSTED' AND NEW.miro_posted = true)
    OR
    (NEW.miro_posted = true AND OLD.miro_posted = false AND NEW.status = 'POSTED')
  ) THEN
    INSERT INTO stock_ledger (client_id, item_id, location_id, current_qty)
      SELECT
        NEW.client_id,
        gl.item_id,
        gl.put_away_location,
        gl.accepted_qty
      FROM grn_lines gl
      WHERE gl.grn_id = NEW.id
        AND gl.put_away_location IS NOT NULL
        AND gl.accepted_qty > 0
    ON CONFLICT (client_id, item_id, location_id)
      DO UPDATE SET
        current_qty        = stock_ledger.current_qty + EXCLUDED.current_qty,
        last_movement_type = 'GRN_IN',
        last_movement_date = now(),
        updated_at         = now();

    -- Log movements
    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, moved_by, moved_at
    )
    SELECT
      NEW.client_id, gl.item_id, gl.put_away_location, 'GRN_IN',
      'GRN', NEW.id, NEW.grn_no,
      gl.accepted_qty, NEW.approved_by, now()
    FROM grn_lines gl
    WHERE gl.grn_id = NEW.id
      AND gl.put_away_location IS NOT NULL
      AND gl.accepted_qty > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_grn_miro ON grn;
CREATE TRIGGER trg_stock_grn_miro
  AFTER UPDATE ON grn
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_grn_miro();

-- ─── STOCK TRIGGER: DC DISPATCHED → stock - ───────────────
CREATE OR REPLACE FUNCTION update_stock_on_dc_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DISPATCHED' AND OLD.status != 'DISPATCHED' THEN
    -- Subtract from stock
    UPDATE stock_ledger sl
      SET current_qty        = sl.current_qty - dl.dispatch_qty,
          reserved_qty       = GREATEST(0, sl.reserved_qty - dl.dispatch_qty),
          last_movement_type = 'DC_OUT',
          last_movement_date = now(),
          updated_at         = now()
      FROM dc_lines dl
      WHERE dl.dc_id      = NEW.id
        AND sl.item_id    = dl.item_id
        AND sl.location_id = dl.from_location
        AND sl.client_id  = NEW.client_id;

    -- Log movements
    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, moved_by, moved_at
    )
    SELECT
      NEW.client_id, dl.item_id, dl.from_location, 'DC_OUT',
      'DC', NEW.id, NEW.dc_no,
      -dl.dispatch_qty, NEW.created_by, now()
    FROM dc_lines dl
    WHERE dl.dc_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_dc_dispatch ON delivery_challans;
CREATE TRIGGER trg_stock_dc_dispatch
  AFTER UPDATE ON delivery_challans
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_dc_dispatch();

-- ─── STOCK TRIGGER: PRN POSTED → stock - ─────────────────
CREATE OR REPLACE FUNCTION update_stock_on_prn_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    UPDATE stock_ledger sl
      SET current_qty        = sl.current_qty - pl.return_qty,
          last_movement_type = 'PRN_OUT',
          last_movement_date = now(),
          updated_at         = now()
      FROM prn_lines pl
      WHERE pl.prn_id     = NEW.id
        AND sl.item_id    = pl.item_id
        AND sl.location_id = pl.return_location
        AND sl.client_id  = NEW.client_id;

    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, moved_by, moved_at
    )
    SELECT
      NEW.client_id, pl.item_id, pl.return_location, 'PRN_OUT',
      'PRN', NEW.id, NEW.prn_no,
      -pl.return_qty, NEW.approved_by, now()
    FROM prn_lines pl
    WHERE pl.prn_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_prn_post ON prn;
CREATE TRIGGER trg_stock_prn_post
  AFTER UPDATE ON prn
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_prn_post();

-- ─── STOCK TRIGGER: SRN POSTED → stock + (good only) ──────
CREATE OR REPLACE FUNCTION update_stock_on_srn_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    -- Only good-condition items go back to main stock
    UPDATE stock_ledger sl
      SET current_qty        = sl.current_qty + sl_line.returned_qty,
          last_movement_type = 'SRN_IN',
          last_movement_date = now(),
          updated_at         = now()
      FROM srn_lines sl_line
      WHERE sl_line.srn_id    = NEW.id
        AND sl_line.condition = 'Good'
        AND sl.item_id        = sl_line.item_id
        AND sl.location_id    = sl_line.return_location
        AND sl.client_id      = NEW.client_id;

    -- Insert new ledger rows for good items that don't exist yet
    INSERT INTO stock_ledger (client_id, item_id, location_id, current_qty)
      SELECT NEW.client_id, sl_line.item_id, sl_line.return_location, sl_line.returned_qty
      FROM srn_lines sl_line
      WHERE sl_line.srn_id    = NEW.id
        AND sl_line.condition = 'Good'
        AND sl_line.return_location IS NOT NULL
    ON CONFLICT (client_id, item_id, location_id) DO NOTHING;

    -- Damaged items go to damaged_stock (handled at app level for now)
    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, moved_by, moved_at
    )
    SELECT
      NEW.client_id, sl_line.item_id, sl_line.return_location,
      CASE sl_line.condition WHEN 'Good' THEN 'SRN_IN' ELSE 'SRN_DAMAGED' END,
      'SRN', NEW.id, NEW.srn_no,
      sl_line.returned_qty, NEW.received_by, now()
    FROM srn_lines sl_line
    WHERE sl_line.srn_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_srn_post ON srn;
CREATE TRIGGER trg_stock_srn_post
  AFTER UPDATE ON srn
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_srn_post();

-- ─── STOCK TRIGGER: ADJUSTMENT POSTED ─────────────────────
CREATE OR REPLACE FUNCTION update_stock_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    -- Direct set to physical_qty
    INSERT INTO stock_ledger (client_id, item_id, location_id, current_qty)
      SELECT NEW.client_id, al.item_id, al.location_id, al.physical_qty
      FROM adjustment_lines al
      WHERE al.adj_id = NEW.id
    ON CONFLICT (client_id, item_id, location_id)
      DO UPDATE SET
        current_qty        = EXCLUDED.current_qty,
        last_movement_type = 'ADJUSTMENT',
        last_movement_date = now(),
        updated_at         = now();

    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, moved_by, moved_at
    )
    SELECT
      NEW.client_id, al.item_id, al.location_id, 'ADJUSTMENT',
      'ADJ', NEW.id, NEW.adj_no,
      al.variance_qty, NEW.approved_by, now()
    FROM adjustment_lines al
    WHERE al.adj_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_adjustment ON stock_adjustments;
CREATE TRIGGER trg_stock_adjustment
  AFTER UPDATE ON stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_adjustment();

-- ─── STOCK TRIGGER: TRANSFER COMPLETED ────────────────────
CREATE OR REPLACE FUNCTION update_stock_on_transfer()
RETURNS TRIGGER AS $$
DECLARE
  v_qty_before NUMERIC;
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    SELECT current_qty INTO v_qty_before
    FROM stock_ledger
    WHERE item_id = NEW.item_id AND location_id = NEW.from_location_id AND client_id = NEW.client_id;

    -- Subtract from source location
    UPDATE stock_ledger
      SET current_qty        = current_qty - NEW.transfer_qty,
          last_movement_type = 'TRANSFER_OUT',
          last_movement_date = now(),
          updated_at         = now()
      WHERE item_id     = NEW.item_id
        AND location_id = NEW.from_location_id
        AND client_id   = NEW.client_id;

    -- Add to destination location
    INSERT INTO stock_ledger (client_id, item_id, location_id, current_qty)
      VALUES (NEW.client_id, NEW.item_id, NEW.to_location_id, NEW.transfer_qty)
    ON CONFLICT (client_id, item_id, location_id)
      DO UPDATE SET
        current_qty        = stock_ledger.current_qty + NEW.transfer_qty,
        last_movement_type = 'TRANSFER_IN',
        last_movement_date = now(),
        updated_at         = now();

    -- Log both legs
    INSERT INTO stock_movements (
      client_id, item_id, location_id, movement_type,
      reference_doc_type, reference_doc_id, reference_doc_no,
      qty_change, qty_before, qty_after, moved_by, moved_at
    ) VALUES
    (NEW.client_id, NEW.item_id, NEW.from_location_id, 'TRANSFER_OUT',
     'STR', NEW.id, NEW.str_no,
     -NEW.transfer_qty, v_qty_before, v_qty_before - NEW.transfer_qty,
     NEW.completed_by, now()),
    (NEW.client_id, NEW.item_id, NEW.to_location_id, 'TRANSFER_IN',
     'STR', NEW.id, NEW.str_no,
     NEW.transfer_qty, 0, NEW.transfer_qty,
     NEW.completed_by, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_transfer ON stock_transfers;
CREATE TRIGGER trg_stock_transfer
  AFTER UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_transfer();

-- ─── GATE PASS AUTO-CREATE: DC DISPATCHED ────────────────
CREATE OR REPLACE FUNCTION auto_create_gp_for_dc()
RETURNS TRIGGER AS $$
DECLARE
  v_gp_no TEXT;
BEGIN
  IF NEW.status = 'DISPATCHED' AND OLD.status != 'DISPATCHED' THEN
    v_gp_no := generate_doc_no('GP', NEW.client_id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

    INSERT INTO gate_passes (
      gp_no, gp_type, client_id,
      reference_doc_type, reference_doc_id, reference_doc_no,
      gate_pass_date, vehicle_no, driver_name, driver_phone,
      status, created_by
    ) VALUES (
      v_gp_no, 'OUTBOUND', NEW.client_id,
      'DC', NEW.id, NEW.dc_no,
      CURRENT_DATE, NEW.vehicle_no, NEW.driver_name, NEW.driver_phone,
      'OPEN', NEW.created_by
    );

    -- Copy line items
    INSERT INTO gate_pass_lines (gp_id, item_id, item_name, quantity, unit, condition_out)
      SELECT
        (SELECT id FROM gate_passes WHERE gp_no = v_gp_no),
        dl.item_id,
        i.item_name,
        dl.dispatch_qty,
        i.unit_of_measure,
        'Good'
      FROM dc_lines dl
      JOIN items i ON i.id = dl.item_id
      WHERE dl.dc_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_dc_gate_pass ON delivery_challans;
CREATE TRIGGER trg_dc_gate_pass
  AFTER UPDATE ON delivery_challans
  FOR EACH ROW EXECUTE FUNCTION auto_create_gp_for_dc();

-- ─── GATE PASS AUTO-CREATE: PRN POSTED ───────────────────
CREATE OR REPLACE FUNCTION auto_create_gp_for_prn()
RETURNS TRIGGER AS $$
DECLARE
  v_gp_no TEXT;
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    v_gp_no := generate_doc_no('GP', NEW.client_id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

    INSERT INTO gate_passes (
      gp_no, gp_type, client_id,
      reference_doc_type, reference_doc_id, reference_doc_no,
      gate_pass_date, vehicle_no, status, created_by
    ) VALUES (
      v_gp_no, 'RETURN_OUTBOUND', NEW.client_id,
      'PRN', NEW.id, NEW.prn_no,
      CURRENT_DATE, NEW.vehicle_no,
      'OPEN', NEW.created_by
    );

    INSERT INTO gate_pass_lines (gp_id, item_id, item_name, quantity, unit, condition_out)
      SELECT
        (SELECT id FROM gate_passes WHERE gp_no = v_gp_no),
        pl.item_id,
        i.item_name,
        pl.return_qty,
        i.unit_of_measure,
        'Good'
      FROM prn_lines pl
      JOIN items i ON i.id = pl.item_id
      WHERE pl.prn_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prn_gate_pass ON prn;
CREATE TRIGGER trg_prn_gate_pass
  AFTER UPDATE ON prn
  FOR EACH ROW EXECUTE FUNCTION auto_create_gp_for_prn();

-- ─── SO STOCK RESERVATION ────────────────────────────────
CREATE OR REPLACE FUNCTION reserve_stock_for_so(p_so_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_line  RECORD;
  v_avail NUMERIC;
  v_issues JSONB := '[]'::JSONB;
BEGIN
  PERFORM id FROM sales_orders WHERE id = p_so_id FOR UPDATE;

  FOR v_line IN
    SELECT sol.item_id, sol.confirmed_qty, i.item_name, i.sap_material_code
    FROM so_lines sol
    JOIN items i ON i.id = sol.item_id
    WHERE sol.so_id = p_so_id AND sol.confirmed_qty > 0
  LOOP
    SELECT COALESCE(SUM(available_qty), 0) INTO v_avail
    FROM stock_ledger
    WHERE item_id = v_line.item_id;

    IF v_avail >= v_line.confirmed_qty THEN
      UPDATE stock_ledger
        SET reserved_qty = reserved_qty + v_line.confirmed_qty,
            updated_at   = now()
        WHERE item_id = v_line.item_id;
    ELSE
      v_issues := v_issues || jsonb_build_object(
        'item_name', v_line.item_name,
        'sap_code',  v_line.sap_material_code,
        'requested', v_line.confirmed_qty,
        'available', v_avail,
        'shortage',  v_line.confirmed_qty - v_avail
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', jsonb_array_length(v_issues) = 0, 'issues', v_issues);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── PROMO STOCK TRIGGER: RECEIPT POSTED ─────────────────
CREATE OR REPLACE FUNCTION update_promo_stock_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    INSERT INTO promo_stock_ledger (client_id, promo_item_id, location_id, current_qty)
      SELECT NEW.client_id, prl.promo_item_id, prl.location_id, prl.received_qty
      FROM promo_receipt_lines prl
      WHERE prl.receipt_id = NEW.id AND prl.location_id IS NOT NULL
    ON CONFLICT (client_id, promo_item_id, location_id)
      DO UPDATE SET
        current_qty        = promo_stock_ledger.current_qty + EXCLUDED.current_qty,
        last_movement_type = 'RECEIPT_IN',
        last_movement_date = now(),
        updated_at         = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_promo_receipt ON promo_receipts;
CREATE TRIGGER trg_promo_receipt
  AFTER UPDATE ON promo_receipts
  FOR EACH ROW EXECUTE FUNCTION update_promo_stock_on_receipt();

-- ─── PROMO STOCK TRIGGER: DISTRIBUTION ───────────────────
CREATE OR REPLACE FUNCTION update_promo_stock_on_dist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DISTRIBUTED' AND OLD.status != 'DISTRIBUTED' THEN
    UPDATE promo_stock_ledger psl
      SET current_qty        = psl.current_qty - dl.distribute_qty,
          last_movement_type = 'DISTRIBUTION_OUT',
          last_movement_date = now(),
          updated_at         = now()
      FROM promo_distribution_lines dl
      WHERE dl.dist_id         = NEW.id
        AND psl.promo_item_id  = dl.promo_item_id
        AND psl.location_id    = dl.from_location;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_promo_dist ON promo_distributions;
CREATE TRIGGER trg_promo_dist
  AFTER UPDATE ON promo_distributions
  FOR EACH ROW EXECUTE FUNCTION update_promo_stock_on_dist();

-- ─── TRANSPORT CONTRACT: TRIP COUNT ──────────────────────
CREATE OR REPLACE FUNCTION increment_contract_trips()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_id IS NOT NULL AND OLD.contract_id IS NULL THEN
    UPDATE transport_contracts
      SET trips_used = trips_used + 1
      WHERE id = NEW.contract_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contract_trips ON transport_requests;
CREATE TRIGGER trg_contract_trips
  AFTER UPDATE ON transport_requests
  FOR EACH ROW EXECUTE FUNCTION increment_contract_trips();

-- ─── TRANSPORTER BILL: AUTO LEDGER ENTRY ─────────────────
CREATE OR REPLACE FUNCTION create_transporter_ledger_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- On ISSUED: debit expense, credit payable
  IF NEW.status = 'ISSUED' AND OLD.status = 'DRAFT' THEN
    INSERT INTO finance_ledger (
      client_id, entry_date, entry_type, account_head, sub_head,
      description, debit_amount, credit_amount,
      reference_doc_type, reference_doc_id
    )
    SELECT
      NEW.client_id, CURRENT_DATE, 'DEBIT',
      'Expense', 'Transport Cost',
      NEW.bill_no || ' — ' || t.transporter_name,
      NEW.total_amount, 0, 'TransporterBill', NEW.id
    FROM transporters t WHERE t.id = NEW.transporter_id;

    INSERT INTO finance_ledger (
      client_id, entry_date, entry_type, account_head, sub_head,
      description, debit_amount, credit_amount,
      reference_doc_type, reference_doc_id
    )
    SELECT
      NEW.client_id, CURRENT_DATE, 'CREDIT',
      'Payable', 'Transporter Payable',
      'Payable to: ' || t.transporter_name,
      0, NEW.total_amount, 'TransporterBill', NEW.id
    FROM transporters t WHERE t.id = NEW.transporter_id;
  END IF;

  -- On PAID: debit payable, credit bank/cash
  IF NEW.payment_status = 'Paid' AND OLD.payment_status != 'Paid' THEN
    INSERT INTO finance_ledger (
      client_id, entry_date, entry_type, account_head, sub_head,
      description, debit_amount, credit_amount,
      reference_doc_type, reference_doc_id
    ) VALUES
    (NEW.client_id, COALESCE(NEW.payment_date, CURRENT_DATE), 'DEBIT',
     'Payable', 'Transporter Payable',
     'Payment: ' || NEW.bill_no, NEW.total_amount, 0, 'TransporterBill', NEW.id),
    (NEW.client_id, COALESCE(NEW.payment_date, CURRENT_DATE), 'CREDIT',
     'Bank/Cash', COALESCE(NEW.payment_method, 'Cash'),
     'Payment to transporter: ' || NEW.bill_no, 0, NEW.total_amount, 'TransporterBill', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transporter_ledger ON transporter_bills;
CREATE TRIGGER trg_transporter_ledger
  AFTER UPDATE ON transporter_bills
  FOR EACH ROW EXECUTE FUNCTION create_transporter_ledger_entry();

-- ─── DC DISPATCH QTY VALIDATION ───────────────────────────
CREATE OR REPLACE FUNCTION check_dc_dispatch_qty()
RETURNS TRIGGER AS $$
DECLARE
  v_so_confirmed NUMERIC;
  v_already_dispatched NUMERIC;
BEGIN
  SELECT sol.confirmed_qty INTO v_so_confirmed
  FROM so_lines sol WHERE sol.id = NEW.so_line_id;

  SELECT COALESCE(SUM(dl.dispatch_qty), 0) INTO v_already_dispatched
  FROM dc_lines dl
  JOIN delivery_challans dc ON dc.id = dl.dc_id
  WHERE dl.so_line_id = NEW.so_line_id
    AND dl.id != COALESCE(NEW.id, gen_random_uuid())
    AND dc.status != 'CANCELLED';

  IF v_already_dispatched + NEW.dispatch_qty > v_so_confirmed THEN
    RAISE EXCEPTION 'Dispatch qty (%) exceeds SO confirmed qty (%). Already dispatched: %.',
      NEW.dispatch_qty, v_so_confirmed, v_already_dispatched;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dc_qty_check ON dc_lines;
CREATE TRIGGER trg_dc_qty_check
  BEFORE INSERT OR UPDATE ON dc_lines
  FOR EACH ROW EXECUTE FUNCTION check_dc_dispatch_qty();

-- ─── TRANSPORT: AUTO-EXPENSE ON DELIVERED ─────────────────
CREATE OR REPLACE FUNCTION auto_expense_on_transport_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_id UUID;
  v_exp_no TEXT;
BEGIN
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED'
     AND NEW.base_amount > 0 AND NEW.expense_id IS NULL THEN

    v_exp_no := generate_doc_no('EXP', COALESCE(NEW.client_id, '3I'), EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

    INSERT INTO expenses (
      expense_no, client_id, expense_date, expense_category,
      amount, vat_amount, payment_method, reference_no,
      vendor_name, description, status, created_by
    )
    SELECT
      v_exp_no,
      NEW.client_id,
      CURRENT_DATE,
      'Transport / Delivery Cost',
      NEW.base_amount + COALESCE(NEW.extra_charges, 0),
      COALESCE(NEW.vat_amount, 0),
      'Bank Transfer',
      NEW.trip_no,
      t.transporter_name,
      NEW.request_type || ': ' || COALESCE(NEW.trip_no, NEW.request_no)
        || ' | ' || NEW.from_location || ' → ' || NEW.to_location,
      'DRAFT',
      NEW.assigned_by
    FROM transporters t
    WHERE t.id = NEW.transporter_id
    RETURNING id INTO v_expense_id;

    UPDATE transport_requests SET expense_id = v_expense_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transport_auto_expense ON transport_requests;
CREATE TRIGGER trg_transport_auto_expense
  AFTER UPDATE ON transport_requests
  FOR EACH ROW EXECUTE FUNCTION auto_expense_on_transport_delivered();
