import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Edit, Trash2, Building2 } from 'lucide-react'
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
import { SAPPagination } from '@/components/ui/SAPPagination'
import type { TableColumn } from '@/types'

interface Client {
  id: string; client_code: string; client_name: string; client_type: string | null
  address: string | null; contact_person: string | null; contact_phone: string | null
  contact_email: string | null; sap_enabled: boolean; sap_company_code: string | null
  warehouse_code: string | null; status: string; remarks: string | null
}

const schema = z.object({
  client_code:      z.string().min(1,'Required').max(10),
  client_name:      z.string().min(2,'Required'),
  client_type:      z.string().default('3PL Client'),
  address:          z.string().optional(),
  contact_person:   z.string().optional(),
  contact_phone:    z.string().optional(),
  contact_email:    z.string().email('Invalid email').optional().or(z.literal('')),
  sap_enabled:      z.boolean().default(false),
  sap_company_code: z.string().optional(),
  warehouse_code:   z.string().optional(),
  status:           z.string().default('Active'),
  remarks:          z.string().optional(),
})
type Form = z.infer<typeof schema>

const STATUS_OPTS = [{ value:'Active',label:'Active' },{ value:'Inactive',label:'Inactive' }]
const TYPE_OPTS   = [{ value:'3PL Client',label:'3PL Client' },{ value:'Internal',label:'Internal' }]

const columns: TableColumn<Client>[] = [
  { key:'client_code',  label:'Code',        sortable:true, width:'80px' },
  { key:'client_name',  label:'Client Name', sortable:true },
  { key:'client_type',  label:'Type',        sortable:true },
  { key:'contact_phone',label:'Phone',       render: v => <span>{String(v??'—')}</span> },
  { key:'sap_enabled',  label:'SAP',         render: v => <SAPBadge status={v ? 'Active' : 'Inactive'} /> },
  { key:'status',       label:'Status',      render: v => <SAPBadge status={String(v)} /> },
]

export function ClientsPage() {
  const { showToast } = useAppStore()
  const canCreate = usePermission('clients','can_create')
  const canEdit   = usePermission('clients','can_edit')
  const canDelete = usePermission('clients','can_delete')

  const [clients, setClients]           = useState<Client[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Client|null>(null)
  const [viewItem, setViewItem]         = useState<Client|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client|null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { sap_enabled:false, status:'Active', client_type:'3PL Client' },
  })
  const sapEnabled = watch('sap_enabled')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let q = db('clients')
        .select('id,client_code,client_name,client_type,address,contact_person,contact_phone,contact_email,sap_enabled,sap_company_code,warehouse_code,status,remarks', { count:'exact' })
        .order('client_code')
        .range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`client_name.ilike.%${search}%,client_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      setClients(data ?? [])
      setTotal(count ?? 0)
    } catch(err) { handleSupabaseError(err,'Fetch Clients') }
    finally { setLoading(false) }
  }, [page, pageSize, search])

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
    reset({ sap_enabled:false, status:'Active', client_type:'3PL Client' })
    setModalOpen(true)
  }
  function openEdit(c: Client) {
    setEditItem(c)
    reset({ client_code:c.client_code, client_name:c.client_name, client_type:c.client_type??'3PL Client',
      address:c.address??'', contact_person:c.contact_person??'', contact_phone:c.contact_phone??'',
      contact_email:c.contact_email??'', sap_enabled:c.sap_enabled, sap_company_code:c.sap_company_code??'',
      warehouse_code:c.warehouse_code??'', status:c.status, remarks:c.remarks??'' })
    setModalOpen(true)
  }

  async function onSubmit(data: Form) {
    setSaving(true)
    try {
      const payload = {
        client_code:      data.client_code.toUpperCase(),
        client_name:      data.client_name,
        client_type:      data.client_type,
        address:          data.address||null,
        contact_person:   data.contact_person||null,
        contact_phone:    data.contact_phone||null,
        contact_email:    data.contact_email||null,
        sap_enabled:      data.sap_enabled,
        sap_company_code: data.sap_enabled ? (data.sap_company_code||null) : null,
        warehouse_code:   data.sap_enabled ? (data.warehouse_code||null)   : null,
        status:           data.status,
        remarks:          data.remarks||null,
      }
      if (editItem) {
        const { error } = await db('clients').update(payload).eq('id', editItem.id)
        if (error) throw error
        await auditLog('UPDATE','clients',editItem.id,editItem.client_code)
        showToast(`Client ${data.client_code} updated.`,'success')
      } else {
        const { data:created, error } = await db('clients').insert(payload).select('id').single()
        if (error) throw error
        await auditLog('CREATE','clients', created.id, data.client_code)
        showToast(`Client ${data.client_code} created.`,'success')
      }
      setModalOpen(false); fetchData()
    } catch(err) { handleSupabaseError(err,'Save Client') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await db('clients').delete().eq('id', deleteTarget.id)
      if (error) throw error
      await auditLog('DELETE','clients',deleteTarget.id,deleteTarget.client_code)
      showToast('Client deleted.','success')
      setDeleteTarget(null); fetchData()
    } catch(err) { handleSupabaseError(err,'Delete Client') }
    finally { setDeleting(false) }
  }

  const actionCol: TableColumn<Client> = {
    key:'actions', label:'Actions', sticky:true,
    render:(_,row) => (
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
          <div className="p-2 bg-sap-blueLight rounded-sap"><Building2 size={20} className="text-sap-blue"/></div>
          <div>
            <h1 className="text-sap-xl font-bold text-sap-text">Client Master</h1>
            <p className="text-sap-sm text-sap-textSecondary">{total} client{total!==1?'s':''}</p>
          </div>
        </div>
        {canCreate && <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Client</SAPButton>}
      </div>

      <input type="text" placeholder="Search by name or code..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-sap-sm border border-sap-border px-3 py-2 text-sap-md focus:outline-none focus:border-sap-blue focus:shadow-sap-focus"
      />

      <div>
        <SAPTable columns={[...columns,actionCol]} data={clients} loading={loading} rowKey="id"
          emptyMessage="No clients found"
          emptyAction={canCreate ? <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Client</SAPButton> : undefined}
        />
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit Client — ${editItem.client_code}`:'New Client'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saving}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>{editItem?'Save Changes':'Create Client'}</SAPButton>
        </>}
      >
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Basic Information" cols={2}>
            <SAPFormRow><SAPInput label="Client Code" required placeholder="WH/RB/GD/3I" disabled={!!editItem} error={errors.client_code?.message} {...register('client_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Client Name" required error={errors.client_name?.message} {...register('client_name')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Client Type" options={TYPE_OPTS} value={watch('client_type')} onChange={v=>setValue('client_type',v)}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Contact" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('contact_phone')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Email" type="email" error={errors.contact_email?.message} {...register('contact_email')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Address" rows={2} {...register('address')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="SAP Integration" cols={2}>
            <SAPFormRow span={2}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={()=>setValue('sap_enabled',!sapEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${sapEnabled?'bg-sap-blue':'bg-sap-border'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${sapEnabled?'translate-x-5':'translate-x-0.5'}`}/>
                </div>
                <span className="text-sap-md">SAP Integration Enabled</span>
              </label>
            </SAPFormRow>
            {sapEnabled && <>
              <SAPFormRow><SAPInput label="SAP Company Code" {...register('sap_company_code')}/></SAPFormRow>
              <SAPFormRow><SAPInput label="Warehouse Code" placeholder="e.g. RB02" {...register('warehouse_code')}/></SAPFormRow>
            </>}
          </SAPFormSection>
          <SAPFormSection title="" cols={1}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Client — ${viewItem?.client_code??''}`} size="md"
        footer={<>
          {canEdit && viewItem && <SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}
      >
        {viewItem && (
          <div className="grid grid-cols-2 gap-4">
            {([['Code',viewItem.client_code],['Name',viewItem.client_name],['Type',viewItem.client_type],
              ['Status',viewItem.status],['Contact',viewItem.contact_person],['Phone',viewItem.contact_phone],
              ['Email',viewItem.contact_email],['SAP',viewItem.sap_enabled?'Enabled':'Disabled'],
              ['Company Code',viewItem.sap_company_code],['Warehouse',viewItem.warehouse_code],
            ] as [string,string|null][]).filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-sap-xs text-sap-textSecondary">{l}</p><p className="text-sap-md font-medium">{v}</p></div>
            ))}
          </div>
        )}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Client" message={`Delete "${deleteTarget?.client_name}"? Cannot be undone.`}
        confirmLabel="Delete" loading={deleting}/>
    </div>
  )
}

