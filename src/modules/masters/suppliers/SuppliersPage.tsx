import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Edit, Trash2, Truck } from 'lucide-react'
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

interface Supplier {
  id: string; client_id: string; supplier_name: string; supplier_code: string
  contact_person: string|null; phone: string|null; email: string|null
  address: string|null; city: string|null; country: string|null
  payment_terms: string|null; status: string
}

const PAYMENT_OPTS: SelectOption[] = [
  { value:'Cash',label:'Cash' },{ value:'7 Days',label:'7 Days' },
  { value:'15 Days',label:'15 Days' },{ value:'30 Days',label:'30 Days' },{ value:'60 Days',label:'60 Days' },
]
const STATUS_OPTS: SelectOption[] = [
  { value:'Active',label:'Active' },{ value:'Inactive',label:'Inactive' },{ value:'Blacklisted',label:'Blacklisted' },
]

const schema = z.object({
  supplier_code:  z.string().min(1,'Required').max(20),
  supplier_name:  z.string().min(2,'Required'),
  contact_person: z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  address:        z.string().optional(),
  city:           z.string().optional(),
  country:        z.string().default('Bangladesh'),
  trade_license:  z.string().optional(),
  tin_number:     z.string().optional(),
  vat_number:     z.string().optional(),
  bank_name:      z.string().optional(),
  bank_account:   z.string().optional(),
  bank_branch:    z.string().optional(),
  payment_terms:  z.string().default('30 Days'),
  status:         z.string().default('Active'),
  remarks:        z.string().optional(),
})
type Form = z.infer<typeof schema>

const columns: TableColumn<Supplier>[] = [
  { key:'supplier_code', label:'Code',    sortable:true, width:'120px' },
  { key:'supplier_name', label:'Name',    sortable:true },
  { key:'contact_person',label:'Contact', render: v=><span>{String(v??'—')}</span> },
  { key:'phone',         label:'Phone',   render: v=><span>{String(v??'—')}</span> },
  { key:'city',          label:'City',    render: v=><span>{String(v??'—')}</span> },
  { key:'payment_terms', label:'Terms',   render: v=><span>{String(v??'—')}</span> },
  { key:'status',        label:'Status',  render: v=><SAPBadge status={String(v)} /> },
]

export function SuppliersPage() {
  const { showToast, activeClient } = useAppStore()
  const canCreate = usePermission('suppliers','can_create')
  const canEdit   = usePermission('suppliers','can_edit')
  const canDelete = usePermission('suppliers','can_delete')

  const [suppliers, setSuppliers]       = useState<Supplier[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [filters, setFilters]           = useState({ search:'', status:'' })
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Supplier|null>(null)
  const [viewItem, setViewItem]         = useState<Supplier|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier|null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { payment_terms:'30 Days', status:'Active', country:'Bangladesh' },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let q = db('suppliers')
        .select('id,client_id,supplier_name,supplier_code,contact_person,phone,email,address,city,country,payment_terms,status', { count:'exact' })
        .eq('client_id', activeClient)
        .order('supplier_name')
        .range((page-1)*pageSize, page*pageSize-1)
      if (filters.search) q = q.or(`supplier_name.ilike.%${filters.search}%,supplier_code.ilike.%${filters.search}%`)
      if (filters.status)  q = q.eq('status', filters.status)
      const { data, count, error } = await q
      if (error) throw error
      setSuppliers(data ?? [])
      setTotal(count ?? 0)
    } catch(err) { handleSupabaseError(err,'Fetch Suppliers') }
    finally { setLoading(false) }
  }, [page, pageSize, filters, activeClient])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchData])

  function openNew() {
    setEditItem(null)
    reset({ payment_terms:'30 Days', status:'Active', country:'Bangladesh' })
    setModalOpen(true)
  }
  function openEdit(s: Supplier) {
    setEditItem(s)
    reset({ supplier_code:s.supplier_code, supplier_name:s.supplier_name,
      contact_person:s.contact_person??'', phone:s.phone??'', email:s.email??'',
      address:s.address??'', city:s.city??'', country:s.country??'Bangladesh',
      payment_terms:s.payment_terms??'30 Days', status:s.status })
    setModalOpen(true)
  }

  async function onSubmit(data: Form) {
    setSaving(true)
    try {
      const payload = {
        client_id:      activeClient,
        supplier_code:  data.supplier_code,
        supplier_name:  data.supplier_name,
        contact_person: data.contact_person||null,
        phone:          data.phone||null,
        email:          data.email||null,
        address:        data.address||null,
        city:           data.city||null,
        country:        data.country||'Bangladesh',
        trade_license:  data.trade_license||null,
        tin_number:     data.tin_number||null,
        vat_number:     data.vat_number||null,
        bank_name:      data.bank_name||null,
        bank_account:   data.bank_account||null,
        bank_branch:    data.bank_branch||null,
        payment_terms:  data.payment_terms,
        status:         data.status,
        remarks:        data.remarks||null,
      }
      if (editItem) {
        const { error } = await db('suppliers').update(payload).eq('id', editItem.id)
        if (error) throw error
        await auditLog('UPDATE','suppliers',editItem.id,editItem.supplier_code)
        showToast(`Supplier ${data.supplier_code} updated.`,'success')
      } else {
        const { data:created, error } = await db('suppliers').insert(payload).select('id').single()
        if (error) throw error
        await auditLog('CREATE','suppliers',created.id,data.supplier_code)
        showToast(`Supplier ${data.supplier_code} created.`,'success')
      }
      setModalOpen(false); fetchData()
    } catch(err) { handleSupabaseError(err,'Save Supplier') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await db('suppliers').delete().eq('id', deleteTarget.id)
      if (error) throw error
      await auditLog('DELETE','suppliers',deleteTarget.id,deleteTarget.supplier_code)
      showToast('Supplier deleted.','success')
      setDeleteTarget(null); fetchData()
    } catch(err) { handleSupabaseError(err,'Delete Supplier') }
    finally { setDeleting(false) }
  }

  const actionCol: TableColumn<Supplier> = {
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
          <div className="p-2 bg-sap-blueLight rounded-sap"><Truck size={20} className="text-sap-blue"/></div>
          <div>
            <h1 className="text-sap-xl font-bold text-sap-text">Supplier Master</h1>
            <p className="text-sap-sm text-sap-textSecondary">{activeClient} · {total} supplier{total!==1?'s':''}</p>
          </div>
        </div>
        {canCreate && <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Supplier</SAPButton>}
      </div>

      <SAPFilterBar
        fields={[
          { key:'search', label:'Search', type:'text',   placeholder:'Name or code...' },
          { key:'status', label:'Status', type:'select', options:STATUS_OPTS },
        ]}
        values={filters}
        onChange={(k,v)=>setFilters(f=>({...f,[k]:v}))}
        onSearch={()=>{setPage(1);fetchData()}}
        onClear={()=>{setFilters({search:'',status:''});setPage(1)}}
        loading={loading}
      />

      <div>
        <SAPTable columns={[...columns,actionCol]} data={suppliers} loading={loading} rowKey="id"
          emptyMessage="No suppliers found"
          emptyAction={canCreate ? <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add Supplier</SAPButton> : undefined}
        />
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit Supplier — ${editItem.supplier_code}`:'New Supplier'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saving}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>{editItem?'Save Changes':'Create Supplier'}</SAPButton>
        </>}
      >
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Basic Information" cols={2}>
            <SAPFormRow><SAPInput label="Supplier Code" required disabled={!!editItem} error={errors.supplier_code?.message} {...register('supplier_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Supplier Name" required error={errors.supplier_name?.message} {...register('supplier_name')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Payment Terms" options={PAYMENT_OPTS} value={watch('payment_terms')} onChange={v=>setValue('payment_terms',v)}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Contact" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('phone')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Email" type="email" error={errors.email?.message} {...register('email')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="City" {...register('city')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Country" {...register('country')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Address" rows={2} {...register('address')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Legal & Banking" cols={2}>
            <SAPFormRow><SAPInput label="Trade License" {...register('trade_license')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="TIN Number" {...register('tin_number')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="VAT Number" {...register('vat_number')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Bank Name" {...register('bank_name')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Bank Account" {...register('bank_account')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Bank Branch" {...register('bank_branch')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="" cols={1}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Supplier — ${viewItem?.supplier_code??''}`} size="md"
        footer={<>
          {canEdit && viewItem && <SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}
      >
        {viewItem && (
          <div className="grid grid-cols-2 gap-4">
            {([['Code',viewItem.supplier_code],['Name',viewItem.supplier_name],
              ['Contact',viewItem.contact_person],['Phone',viewItem.phone],
              ['Email',viewItem.email],['City',viewItem.city],
              ['Country',viewItem.country],['Payment Terms',viewItem.payment_terms],
              ['Status',viewItem.status],
            ] as [string,string|null][]).filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-sap-xs text-sap-textSecondary">{l}</p><p className="text-sap-md font-medium">{v}</p></div>
            ))}
            {viewItem.address && <div className="col-span-2"><p className="text-sap-xs text-sap-textSecondary">Address</p><p className="text-sap-md">{viewItem.address}</p></div>}
          </div>
        )}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Supplier" message={`Delete "${deleteTarget?.supplier_name}"? Cannot be undone.`}
        confirmLabel="Delete" loading={deleting}/>
    </div>
  )
}

