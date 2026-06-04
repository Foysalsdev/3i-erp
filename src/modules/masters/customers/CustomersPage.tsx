import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Edit, Trash2, UserCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { db } from '@/lib/db'
import { usePermission } from '@/hooks/usePermission'
import { useAppStore } from '@/stores/appStore'
import { auditLog } from '@/lib/auditLog'
import { handleSupabaseError } from '@/lib/errorHandler'
import { SAPButton } from '@/components/ui/SAPButton'
import { SAPBadge } from '@/components/ui/SAPBadge'
import { SAPTable } from '@/components/ui/SAPTable'
import { SAPModal, ConfirmDialog } from '@/components/ui/SAPModal'
import { SAPInput } from '@/components/ui/SAPInput'
import { SAPSelect } from '@/components/ui/SAPSelect'
import { SAPTextarea } from '@/components/ui/SAPTextarea'
import { SAPFormSection, SAPFormRow } from '@/components/ui/SAPFormLayout'
import { SAPFilterBar } from '@/components/ui/SAPFilterBar'
import { SAPPagination } from '@/components/ui/SAPPagination'
import type { TableColumn, SelectOption } from '@/types'

interface Customer {
  id: string; client_id: string; customer_name: string; customer_code: string
  sap_customer_code: string|null; customer_type: string|null; contact_person: string|null
  phone: string|null; email: string|null; billing_address: string|null
  delivery_address: string|null; city: string|null; district: string|null
  payment_terms: string|null; credit_limit: number; status: string
}

const TYPE_OPTS: SelectOption[] = [
  { value:'Dealer',label:'Dealer' },{ value:'Retailer',label:'Retailer' },
  { value:'Corporate',label:'Corporate' },{ value:'Individual',label:'Individual' },
]
const PAYMENT_OPTS: SelectOption[] = [
  { value:'Cash',label:'Cash' },{ value:'7 Days',label:'7 Days' },
  { value:'15 Days',label:'15 Days' },{ value:'30 Days',label:'30 Days' },{ value:'60 Days',label:'60 Days' },
]
const STATUS_OPTS: SelectOption[] = [
  { value:'Active',label:'Active' },{ value:'Inactive',label:'Inactive' },
]

const schema = z.object({
  customer_code:     z.string().min(1,'Required'),
  sap_customer_code: z.string().optional(),
  customer_name:     z.string().min(2,'Required'),
  customer_type:     z.string().default('Dealer'),
  contact_person:    z.string().optional(),
  phone:             z.string().optional(),
  email:             z.string().email('Invalid email').optional().or(z.literal('')),
  billing_address:   z.string().optional(),
  delivery_address:  z.string().optional(),
  city:              z.string().optional(),
  district:          z.string().optional(),
  division:          z.string().optional(),
  tin_number:        z.string().optional(),
  vat_number:        z.string().optional(),
  credit_limit:      z.string().default('0'),
  payment_terms:     z.string().default('30 Days'),
  status:            z.string().default('Active'),
  remarks:           z.string().optional(),
})
type Form = z.infer<typeof schema>

const columns: TableColumn<Customer>[] = [
  { key:'customer_code',     label:'Code',     sortable:true, width:'120px' },
  { key:'sap_customer_code', label:'SAP Code', sortable:true, render: v=><span className="font-mono text-sap-sm">{String(v??'—')}</span> },
  { key:'customer_name',     label:'Name',     sortable:true },
  { key:'customer_type',     label:'Type',     sortable:true, render: v=><span>{String(v??'—')}</span> },
  { key:'phone',             label:'Phone',    render: v=><span>{String(v??'—')}</span> },
  { key:'city',              label:'City',     render: v=><span>{String(v??'—')}</span> },
  { key:'status',            label:'Status',   render: v=><SAPBadge status={String(v)} /> },
]

export function CustomersPage() {
  const { showToast, activeClient } = useAppStore()
  const canCreate = usePermission('customers','can_create')
  const canEdit   = usePermission('customers','can_edit')
  const canDelete = usePermission('customers','can_delete')

  const [customers, setCustomers]       = useState<Customer[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [filters, setFilters]           = useState({ search:'', status:'', type:'' })
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Customer|null>(null)
  const [viewItem, setViewItem]         = useState<Customer|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer|null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [sapCodeError, setSapCodeError] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { payment_terms:'30 Days', status:'Active', customer_type:'Dealer', credit_limit:'0' },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let q = db('customers')
        .select('id,client_id,customer_name,customer_code,sap_customer_code,customer_type,contact_person,phone,email,billing_address,delivery_address,city,district,payment_terms,credit_limit,status', { count:'exact' })
        .eq('client_id', activeClient)
        .order('customer_name')
        .range((page-1)*pageSize, page*pageSize-1)
      if (filters.search) q = q.or(`customer_name.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%,sap_customer_code.ilike.%${filters.search}%`)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.type)   q = q.eq('customer_type', filters.type)
      const { data, count, error } = await q
      if (error) throw error
      setCustomers(data ?? [])
      setTotal(count ?? 0)
    } catch(err) { handleSupabaseError(err,'Fetch Customers') }
    finally { setLoading(false) }
  }, [page, pageSize, filters, activeClient])

  useEffect(() => { fetchData() }, [fetchData])

  async function checkSapUnique(code: string) {
    if (!code.trim()) { setSapCodeError(''); return }
    const { data } = await db('customers').select('id').eq('sap_customer_code', code.trim()).maybeSingle()
    if (data && data.id !== editItem?.id) setSapCodeError('SAP Customer Code already exists.')
    else setSapCodeError('')
  }

  function openNew() {
    setEditItem(null); setSapCodeError('')
    reset({ payment_terms:'30 Days', status:'Active', customer_type:'Dealer', credit_limit:'0' })
    setModalOpen(true)
  }
  function openEdit(c: Customer) {
    setEditItem(c); setSapCodeError('')
    reset({ customer_code:c.customer_code, sap_customer_code:c.sap_customer_code??'',
      customer_name:c.customer_name, customer_type:c.customer_type??'Dealer',
      contact_person:c.contact_person??'', phone:c.phone??'', email:c.email??'',
      billing_address:c.billing_address??'', delivery_address:c.delivery_address??'',
      city:c.city??'', district:c.district??'',
      payment_terms:c.payment_terms??'30 Days', credit_limit:String(c.credit_limit??0), status:c.status })
    setModalOpen(true)
  }

  async function onSubmit(data: Form) {
    if (sapCodeError) { showToast('Fix SAP code error first.','error'); return }
    setSaving(true)
    try {
      const payload = {
        client_id:         activeClient,
        customer_code:     data.customer_code,
        sap_customer_code: data.sap_customer_code?.trim()||null,
        customer_name:     data.customer_name,
        customer_type:     data.customer_type,
        contact_person:    data.contact_person||null,
        phone:             data.phone||null,
        email:             data.email||null,
        billing_address:   data.billing_address||null,
        delivery_address:  data.delivery_address||null,
        city:              data.city||null,
        district:          data.district||null,
        division:          data.division||null,
        tin_number:        data.tin_number||null,
        vat_number:        data.vat_number||null,
        credit_limit:      Number(data.credit_limit)||0,
        payment_terms:     data.payment_terms,
        status:            data.status,
        remarks:           data.remarks||null,
      }
      if (editItem) {
        const { error } = await db('customers').update(payload).eq('id', editItem.id)
        if (error) throw error
        await auditLog('UPDATE','customers',editItem.id,editItem.customer_code)
        showToast(`Customer ${data.customer_code} updated.`,'success')
      } else {
        const { data:created, error } = await db('customers').insert(payload).select('id').single()
        if (error) throw error
        await auditLog('CREATE','customers',created.id,data.customer_code)
        showToast(`Customer ${data.customer_code} created.`,'success')
      }
      setModalOpen(false); fetchData()
    } catch(err) { handleSupabaseError(err,'Save Customer') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await db('customers').delete().eq('id', deleteTarget.id)
      if (error) throw error
      await auditLog('DELETE','customers',deleteTarget.id,deleteTarget.customer_code)
      showToast('Customer deleted.','success')
      setDeleteTarget(null); fetchData()
    } catch(err) { handleSupabaseError(err,'Delete Customer') }
    finally { setDeleting(false) }
  }

  const actionCol: TableColumn<Customer> = {
    key:'actions', label:'Actions', sticky:true,
    render:(_,row)=>(
      <div className="flex items-center gap-1">
        <button onClick={()=>setViewItem(row)} className="p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-blue hover:bg-sap-blueLight" title="View"><Eye size={15}/></button>
        {canEdit   && <button onClick={()=>openEdit(row)} className="p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-blue hover:bg-sap-blueLight" title="Edit"><Edit size={15}/></button>}
        {canDelete && <button onClick={()=>setDeleteTarget(row)} className="p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-error hover:bg-sap-errorLight" title="Delete"><Trash2 size={15}/></button>}
      </div>
    ),
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sap-blueLight rounded-sap"><UserCheck size={20} className="text-sap-blue"/></div>
          <div>
            <h1 className="text-sap-xl font-bold text-sap-text">Customer Master</h1>
            <p className="text-sap-sm text-sap-textSecondary">{activeClient} · {total} customer{total!==1?'s':''}</p>
          </div>
        </div>
        {canCreate && <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Customer</SAPButton>}
      </div>

      <SAPFilterBar
        fields={[
          { key:'search', label:'Search', type:'text',   placeholder:'Name, Code, SAP Code...' },
          { key:'type',   label:'Type',   type:'select', options:TYPE_OPTS },
          { key:'status', label:'Status', type:'select', options:STATUS_OPTS },
        ]}
        values={filters}
        onChange={(k,v)=>setFilters(f=>({...f,[k]:v}))}
        onSearch={()=>{setPage(1);fetchData()}}
        onClear={()=>{setFilters({search:'',status:'',type:''});setPage(1)}}
        loading={loading}
      />

      <div>
        <SAPTable columns={[...columns,actionCol]} data={customers} loading={loading} rowKey="id"
          emptyMessage="No customers found"
          emptyAction={canCreate ? <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add Customer</SAPButton> : undefined}
        />
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit Customer — ${editItem.customer_code}`:'New Customer'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saving}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>{editItem?'Save Changes':'Create Customer'}</SAPButton>
        </>}
      >
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Identification" cols={2}>
            <SAPFormRow><SAPInput label="Customer Code" required disabled={!!editItem} error={errors.customer_code?.message} {...register('customer_code')}/></SAPFormRow>
            <SAPFormRow>
              <SAPInput label="SAP Customer Code" placeholder="e.g. 88000015"
                error={sapCodeError||errors.sap_customer_code?.message}
                hint="SAP-UNIQUE — globally unique"
                {...register('sap_customer_code')}
                onBlur={e=>checkSapUnique(e.target.value)}
              />
            </SAPFormRow>
            <SAPFormRow span={2}><SAPInput label="Customer Name" required error={errors.customer_name?.message} {...register('customer_name')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Customer Type" options={TYPE_OPTS} value={watch('customer_type')} onChange={v=>setValue('customer_type',v)}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Contact & Location" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('phone')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Email" type="email" error={errors.email?.message} {...register('email')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="City" {...register('city')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="District" {...register('district')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Division" {...register('division')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Billing Address" rows={2} {...register('billing_address')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Delivery Address" rows={2} {...register('delivery_address')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Financial" cols={2}>
            <SAPFormRow><SAPInput label="TIN Number" {...register('tin_number')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="VAT Number" {...register('vat_number')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Payment Terms" options={PAYMENT_OPTS} value={watch('payment_terms')} onChange={v=>setValue('payment_terms',v)}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Credit Limit (BDT)" type="number" min="0" {...register('credit_limit')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="" cols={1}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Customer — ${viewItem?.customer_code??''}`} size="md"
        footer={<>
          {canEdit && viewItem && <SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}
      >
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {([['Code',viewItem.customer_code],['SAP Code',viewItem.sap_customer_code],
                ['Name',viewItem.customer_name],['Type',viewItem.customer_type],
                ['Phone',viewItem.phone],['Email',viewItem.email],
                ['City',viewItem.city],['District',viewItem.district],
                ['Payment Terms',viewItem.payment_terms],['Status',viewItem.status],
              ] as [string,string|null][]).filter(([,v])=>v).map(([l,v])=>(
                <div key={l}><p className="text-sap-xs text-sap-textSecondary">{l}</p><p className="text-sap-md font-medium">{v}</p></div>
              ))}
            </div>
            {viewItem.billing_address && <div><p className="text-sap-xs text-sap-textSecondary">Billing Address</p><p className="text-sap-md">{viewItem.billing_address}</p></div>}
          </div>
        )}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Customer" message={`Delete "${deleteTarget?.customer_name}"? Cannot be undone.`}
        confirmLabel="Delete" loading={deleting}/>
    </div>
  )
}
