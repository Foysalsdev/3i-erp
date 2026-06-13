import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { db, useQuery, useMutation, useQueryClient, MASTERS_STALE } from '@/lib/rq'
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
import { SAPPagination } from '@/components/ui/SAPPagination'
import type { TableColumn } from '@/types'

interface Customer {
  id: string; client_id: string; customer_name: string
  customer_code: string | null; sap_customer_code: string | null
  customer_type: string | null; contact_person: string | null
  phone: string | null; city: string | null; status: string
}

const schema = z.object({
  client_id:          z.string().min(1,'Required'),
  customer_name:      z.string().min(2,'Required'),
  customer_code:      z.string().optional(),
  sap_customer_code:  z.string().optional(),
  customer_type:      z.string().default('Dealer'),
  contact_person:     z.string().optional(),
  phone:              z.string().optional(),
  email:              z.string().email('Invalid email').optional().or(z.literal('')),
  billing_address:    z.string().optional(),
  delivery_address:   z.string().optional(),
  city:               z.string().optional(),
  district:           z.string().optional(),
  payment_terms:      z.string().default('Cash'),
  status:             z.string().default('Active'),
  remarks:            z.string().optional(),
})
type Form = z.infer<typeof schema>

const TYPE_OPTS    = ['Dealer','Retailer','Corporate','Individual'].map(v=>({value:v,label:v}))
const STATUS_OPTS  = ['Active','Inactive'].map(v=>({value:v,label:v}))
const PAYMENT_OPTS = ['Cash','7 Days','15 Days','30 Days','60 Days'].map(v=>({value:v,label:v}))

const columns: TableColumn<Customer>[] = [
  { key:'customer_name',     label:'Customer Name', sortable:true },
  { key:'customer_code',     label:'Code',          render: v=><span>{String(v??'—')}</span> },
  { key:'sap_customer_code', label:'SAP Code',      render: v=><span className="font-mono text-xs">{String(v??'—')}</span> },
  { key:'customer_type',     label:'Type',          render: v=><span>{String(v??'—')}</span> },
  { key:'phone',             label:'Phone',         render: v=><span>{String(v??'—')}</span> },
  { key:'status',            label:'Status',        render: v=><SAPBadge status={String(v)} /> },
]

export function CustomersPage() {
  const { showToast, activeClient } = useAppStore()
  const qc        = useQueryClient()
  const canCreate = usePermission('customers','can_create')
  const canEdit   = usePermission('customers','can_edit')
  const canDelete = usePermission('customers','can_delete')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Customer|null>(null)
  const [viewItem, setViewItem]         = useState<Customer|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer|null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState:{errors} } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { client_id:activeClient, status:'Active', customer_type:'Dealer', payment_terms:'Cash' },
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', activeClient, page, pageSize, search],
    queryFn: async () => {
      let q = db.from('customers')
        .select('id,client_id,customer_name,customer_code,sap_customer_code,customer_type,contact_person,phone,city,status', { count:'exact' })
        .eq('client_id', activeClient).order('customer_name').range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`customer_name.ilike.%${search}%,customer_code.ilike.%${search}%,sap_customer_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { customers: data??[], total: count??0 }
    },
    staleTime: MASTERS_STALE,
    placeholderData: (prev:any)=>prev,
  })

  const customers = data?.customers ?? []
  const total     = data?.total     ?? 0

  const saveMutation = useMutation({
    mutationFn: async (form: Form) => {
      const payload = { client_id:form.client_id, customer_name:form.customer_name,
        customer_code:form.customer_code||null, sap_customer_code:form.sap_customer_code||null,
        customer_type:form.customer_type, contact_person:form.contact_person||null,
        phone:form.phone||null, email:form.email||null, billing_address:form.billing_address||null,
        delivery_address:form.delivery_address||null, city:form.city||null,
        district:form.district||null, payment_terms:form.payment_terms,
        status:form.status, remarks:form.remarks||null }
      if (editItem) {
        const {error} = await db.from('customers').update(payload).eq('id',editItem.id)
        if (error) throw error
        await auditLog('UPDATE','customers',editItem.id,editItem.customer_name)
      } else {
        const {error} = await db.from('customers').insert([payload])
        if (error) throw error
        await auditLog('CREATE','customers','',form.customer_name)
      }
    },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['customers']}); showToast(editItem?'Customer updated.':'Customer created.','success'); setModalOpen(false) },
    onError: (err)=>handleSupabaseError(err,'Save Customer'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (c:Customer)=>{ const {error}=await db.from('customers').delete().eq('id',c.id); if(error)throw error; await auditLog('DELETE','customers',c.id,c.customer_name) },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['customers']}); showToast('Customer deleted.','success'); setDeleteTarget(null) },
    onError: (err)=>handleSupabaseError(err,'Delete Customer'),
  })

  function openNew() { setEditItem(null); reset({client_id:activeClient,status:'Active',customer_type:'Dealer',payment_terms:'Cash'}); setModalOpen(true) }
  function openEdit(c:Customer) {
    setEditItem(c)
    reset({client_id:c.client_id,customer_name:c.customer_name,customer_code:c.customer_code??'',
      sap_customer_code:c.sap_customer_code??'',customer_type:c.customer_type??'Dealer',
      contact_person:c.contact_person??'',phone:c.phone??'',city:c.city??'',status:c.status})
    setModalOpen(true)
  }

  const actionCol: TableColumn<Customer> = {
    key:'actions',label:'Actions',sticky:true,
    render:(_,row)=>(
      <div className="flex items-center gap-1">
        <button onClick={()=>setViewItem(row)} className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"><Eye size={15}/></button>
        {canEdit&&<button onClick={()=>openEdit(row)} className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"><Edit size={15}/></button>}
        {canDelete&&<button onClick={()=>setDeleteTarget(row)} className="p-1.5 rounded text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>}
      </div>
    ),
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#EFF6FF] rounded-lg"><Users size={20} className="text-[#2563EB]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Customer Master</h1>
            <p className="text-sm text-[#64748B]">{total} customer{total!==1?'s':''} · {activeClient}{isFetching&&!isLoading&&<span className="ml-2 text-[#94A3B8]">↻</span>}</p>
          </div>
        </div>
        {canCreate&&<SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Customer</SAPButton>}
      </div>

      <input type="text" placeholder="Search by name, code or SAP code..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-md border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"/>

      <div>
        <SAPTable columns={[...columns,actionCol]} data={customers} loading={isLoading} rowKey="id"
          emptyMessage="No customers found"
          emptyAction={canCreate?<SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Customer</SAPButton>:undefined}/>
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit — ${editItem.customer_name}`:'New Customer'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(d=>saveMutation.mutate(d))} loading={saveMutation.isPending}>
            {editItem?'Save Changes':'Create Customer'}
          </SAPButton>
        </>}>
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Basic Info" cols={2}>
            <SAPFormRow><SAPInput label="Customer Name" required error={errors.customer_name?.message} {...register('customer_name')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Customer Code" {...register('customer_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="SAP Customer Code" placeholder="SAP-UNIQUE" {...register('sap_customer_code')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Customer Type" options={TYPE_OPTS} value={watch('customer_type')} onChange={v=>setValue('customer_type',v)}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Payment Terms" options={PAYMENT_OPTS} value={watch('payment_terms')} onChange={v=>setValue('payment_terms',v)}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Contact" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('phone')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Email" type="email" {...register('email')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="City" {...register('city')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="District" {...register('district')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Address" cols={1}>
            <SAPTextarea label="Billing Address" rows={2} {...register('billing_address')}/>
            <SAPTextarea label="Delivery Address" rows={2} {...register('delivery_address')}/>
            <SAPTextarea label="Remarks" rows={2} {...register('remarks')}/>
          </SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Customer — ${viewItem?.customer_name??''}`} size="md"
        footer={<>{canEdit&&viewItem&&<SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}<SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton></>}>
        {viewItem&&(<div className="grid grid-cols-2 gap-4">
          {[['Name',viewItem.customer_name],['Code',viewItem.customer_code],['SAP Code',viewItem.sap_customer_code],['Type',viewItem.customer_type],['Phone',viewItem.phone],['City',viewItem.city],['Status',viewItem.status]]
            .filter(([,v])=>v).map(([l,v])=>(<div key={String(l)}><p className="text-xs text-[#94A3B8] mb-0.5">{String(l)}</p><p className="text-sm font-medium text-[#1E293B]">{String(v)}</p></div>))}</div>)}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget)}
        title="Delete Customer" message={`Delete "${deleteTarget?.customer_name}"?`}
        confirmLabel="Delete" loading={deleteMutation.isPending}/>
    </div>
  )
}
