import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0]

  let processed = 0

  // 1. Overdue Invoice Alerts
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_no, client_id, due_date, total_amount')
    .lt('due_date', today)
    .not('status', 'in', '("PAID","CANCELLED")')

  for (const inv of overdueInvoices ?? []) {
    await supabase.from('notifications').insert({
      type: 'OVERDUE_INVOICE',
      title: `Overdue Invoice: ${inv.invoice_no}`,
      message: `Invoice ${inv.invoice_no} is overdue. Amount: ৳${inv.total_amount}`,
      reference_doc_type: 'Invoice',
      reference_doc_id: inv.id,
      reference_doc_no: inv.invoice_no,
    })
    processed++
  }

  // 2. Vehicle Document Expiry Alerts (30 days before)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, registration_no, fitness_expiry, tax_token_expiry, insurance_expiry')
    .eq('status', 'Active')
    .or(`fitness_expiry.lte.${thirtyDaysStr},tax_token_expiry.lte.${thirtyDaysStr},insurance_expiry.lte.${thirtyDaysStr}`)

  for (const v of vehicles ?? []) {
    const expiring: string[] = []
    if (v.fitness_expiry     && v.fitness_expiry     <= thirtyDaysStr) expiring.push(`Fitness: ${v.fitness_expiry}`)
    if (v.tax_token_expiry   && v.tax_token_expiry   <= thirtyDaysStr) expiring.push(`Tax Token: ${v.tax_token_expiry}`)
    if (v.insurance_expiry   && v.insurance_expiry   <= thirtyDaysStr) expiring.push(`Insurance: ${v.insurance_expiry}`)
    if (expiring.length > 0) {
      await supabase.from('notifications').insert({
        type: 'VEHICLE_EXPIRY',
        title: `Vehicle Document Expiring: ${v.registration_no}`,
        message: expiring.join(' | '),
        reference_doc_type: 'Vehicle',
        reference_doc_id: v.id,
      })
      processed++
    }
  }

  // 3. Driver License Expiry Alerts
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name, license_no, license_expiry')
    .eq('status', 'Active')
    .lte('license_expiry', thirtyDaysStr)

  for (const d of drivers ?? []) {
    await supabase.from('notifications').insert({
      type: 'DRIVER_LICENSE_EXPIRY',
      title: `Driver License Expiring: ${d.full_name}`,
      message: `${d.full_name} (${d.license_no}) expires: ${d.license_expiry}`,
      reference_doc_type: 'Driver',
      reference_doc_id: d.id,
    })
    processed++
  }

  // 4. Budget Exceeded Alerts (>80%)
  const currentMonth = new Date().getMonth() + 1
  const currentYear  = new Date().getFullYear()
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, client_id, expense_category, budget_amount, actual_spent')
    .eq('budget_month', currentMonth)
    .eq('budget_year', currentYear)

  for (const b of budgets ?? []) {
    if (b.budget_amount > 0 && b.actual_spent / b.budget_amount >= 0.8) {
      await supabase.from('notifications').insert({
        type: 'BUDGET_EXCEEDED',
        title: `Budget Alert: ${b.expense_category}`,
        message: `${b.expense_category} at ${Math.round(b.actual_spent / b.budget_amount * 100)}% of budget`,
        reference_doc_type: 'Budget',
        reference_doc_id: b.id,
      })
      processed++
    }
  }

  // 5. Overdue Transport Requests
  const { data: overdueTrips } = await supabase
    .from('transport_requests')
    .select('id, request_no, required_by, status')
    .lt('required_by', today)
    .not('status', 'in', '("DELIVERED","CLOSED","CANCELLED")')

  for (const t of overdueTrips ?? []) {
    await supabase.from('notifications').insert({
      type: 'TRANSPORT_OVERDUE',
      title: `Transport Overdue: ${t.request_no}`,
      message: `Required by ${t.required_by} — Status: ${t.status}`,
      reference_doc_type: 'Transport',
      reference_doc_id: t.id,
      reference_doc_no: t.request_no,
    })
    processed++
  }

  return new Response(
    JSON.stringify({ success: true, alerts_created: processed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
