import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit, Trash2, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase as _supabase } from '@/lib/supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any
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
  client_code: string; client_name: string; client_type: string | null
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
  { key:'client_code',   label:'Code',        sortable:true, width:'80px' },
  { key:'client_name',   label:'Client Name', sortable:true },
  { key:'client_type',   label:'Type',        sortable:true },
  { key:'contact_phone', label:'Phone',       render: v => <span>{String(v??'—')}</span> },
  { key:'sap_enabled',   label:'SAP',         render: v => <SAPBadge status={v ? 'Active' : 'Inactive'} /> },
  { key:'status',        label:'Status',      render: v => <SAPBadge status={String(v)} /> },
]

export function ClientsPage() {
  const { showToast } = useAppStore()
  const qc            = useQueryClient()
  const canCreate     = usePermission('clients','can_create')
  const canEdit       = usePermission('clients','can_edit')
  const canDelete     = usePermission('clients','can_delete')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Client|null>(null)
  const [viewItem, setViewItem]         = useState<Client|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client|null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { sap_enabled:false, status:'Active', client_type:'3PL Client' },
  })
  const sapEnabled = watch('sap_enabled')

  // ── React Query fetch — cached 5min, refetches on focus/reconnect ──
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['clients', page, pageSize, search],
    queryFn: async () => {
      let q = supabase
        .from('clients')
        .select('client_code,client_name,client_type,address,contact_person,contact_phone,contact_email,sap_enabled,sap_company_code,warehouse_code,status,remarks', { count:'exact' })
        .order('client_code')
        .range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`client_name.ilike.%${search}%,client_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { clients: data ?? [], total: count ?? 0 }
    },
    staleTime: 5 * 60 * 1000,   // 5 min cache — no refetch on every tab switch
    placeholderData: prev => prev, // keep showing old data while fetching new
  })

  const clients = data?.clients ?? []
  const total   = data?.total   ?? 0
  const loading = isLoading     // only true on FIRST load (no cached data)

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: async (form: Form) => {
      const payload = {
        client_name:      form.client_name,
        client_type:      form.client_type,
        address:          form.address||null,
        contact_person:   form.contact_person||null,
        contact_phone:    form.contact_phone||null,
        contact_email:    form.contact_email||null,
        sap_enabled:      form.sap_enabled,
        sap_company_code: form.sap_enabled ? (form.sap_company_code||null) : null,
        warehouse_code:   form.sap_enabled ? (form.warehouse_code||null)   : null,
        status:           form.status,
        remarks:          form.remarks||null,
      }
      if (editItem) {
        const { error } = await supabase.from('clients').update(payload).eq('client_code', editItem.client_code)
        if (error) throw error
        await auditLog('UPDATE','clients', editItem.client_code, editItem.client_code)
      } else {
        const { error } = await supabase.from('clients').insert([{ ...payload, client_code: form.client_code.toUpperCase() }])
        if (error) throw error
        await auditLog('CREATE','clients', form.client_code, form.client_code)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      showToast(editItem ? 'Client updated.' : 'Client created.', 'success')
      setModalOpen(false)
    },
    onError: (err) => handleSupabaseError(err, 'Save Client'),
  })

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: async (c: Client) => {
      const { error } = await supabase.from('clients').delete().eq('client_code', c.client_code)
      if (error) throw error
      await auditLog('DELETE','clients', c.client_code, c.client_code)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      showToast('Client deleted.','success')
      setDeleteTarget(null)
    },
    onError: (err) => handleSupabaseError(err,'Delete Client'),
  })

  function openNew() {
    setEditItem(null)
    reset({ sap_enabled:false, status:'Active', client_type:'3PL Client' })
    setModalOpen(true)
  }
  function openEdit(c: Client) {
    setEditItem(c)
    reset({
      client_code:c.client_code, client_name:c.client_name, client_type:c.client_type??'3PL Client',
      address:c.address??'', contact_person:c.contact_person??'', contact_phone:c.contact_phone??'',
      contact_email:c.contact_email??'', sap_enabled:c.sap_enabled,
      sap_company_code:c.sap_company_code??'', warehouse_code:c.warehouse_code??'',
      status:c.status, remarks:c.remarks??'',
    })
    setModalOpen(true)
  }

  const actionCol: TableColumn<Client> = {
    key:'actions', label:'Actions', sticky:true,
    render:(_,row) => (
      <div className="flex items-center gap-1">
        <button onClick={()=>setViewItem(row)}
          className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          title="View"><Eye size={15}/></button>
        {canEdit && <button onClick={()=>openEdit(row)}
          className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          title="Edit"><Edit size={15}/></button>}
        {canDelete && <button onClick={()=>setDeleteTarget(row)}
          className="p-1.5 rounded text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"><Trash2 size={15}/></button>}
      </div>
    ),
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#EFF6FF] rounded-lg">
            <Building2 size={20} className="text-[#2563EB]"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Client Master</h1>
            <p className="text-sm text-[#64748B]">
              {total} client{total!==1?'s':''}
              {isFetching && !isLoading && <span className="ml-2 text-[#94A3B8]">↻</span>}
            </p>
          </div>
        </div>
        {canCreate && (
          <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>
            New Client
          </SAPButton>
        )}
      </div>

      {/* Search */}
      <input
        type="text" placeholder="Search by name or code..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-md border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
      />

      {/* Table */}
      <div>
        <SAPTable
          columns={[...columns, actionCol]}
          data={clients}
          loading={loading}
          rowKey="client_code"
          emptyMessage="No clients found"
          emptyAction={canCreate
            ? <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Client</SAPButton>
            : undefined
          }
        />
        <SAPPagination page={page} pageSize={pageSize} total={total}
          onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {/* Create/Edit Modal */}
      <SAPModal
        open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem ? `Edit Client — ${editItem.client_code}` : 'New Client'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(d=>saveMutation.mutate(d))} loading={saveMutation.isPending}>
            {editItem ? 'Save Changes' : 'Create Client'}
          </SAPButton>
        </>}
      >
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Basic Information" cols={2}>
            <SAPFormRow>
              <SAPInput label="Client Code" required placeholder="WH / RB / GD / 3I"
                disabled={!!editItem} error={errors.client_code?.message} {...register('client_code')}/>
            </SAPFormRow>
            <SAPFormRow>
              <SAPInput label="Client Name" required error={errors.client_name?.message} {...register('client_name')}/>
            </SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Client Type" options={TYPE_OPTS} value={watch('client_type')} onChange={v=>setValue('client_type',v)}/>
            </SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/>
            </SAPFormRow>
          </SAPFormSection>

          <SAPFormSection title="Contact" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('contact_phone')}/></SAPFormRow>
            <SAPFormRow>
              <SAPInput label="Email" type="email" error={errors.contact_email?.message} {...register('contact_email')}/>
            </SAPFormRow>
            <SAPFormRow span={2}>
              <SAPTextarea label="Address" rows={2} {...register('address')}/>
            </SAPFormRow>
          </SAPFormSection>

          <SAPFormSection title="SAP Integration" cols={2}>
            <SAPFormRow span={2}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={()=>setValue('sap_enabled',!sapEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${sapEnabled?'bg-[#2563EB]':'bg-[#E2E8F0]'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${sapEnabled?'translate-x-5':'translate-x-0.5'}`}/>
                </div>
                <span className="text-sm text-[#1E293B]">SAP Integration Enabled</span>
              </label>
            </SAPFormRow>
            {sapEnabled && <>
              <SAPFormRow><SAPInput label="SAP Company Code" {...register('sap_company_code')}/></SAPFormRow>
              <SAPFormRow><SAPInput label="Warehouse Code" placeholder="e.g. RB02" {...register('warehouse_code')}/></SAPFormRow>
            </>}
          </SAPFormSection>

          <SAPFormSection title="" cols={1}>
            <SAPTextarea label="Remarks" rows={2} {...register('remarks')}/>
          </SAPFormSection>
        </form>
      </SAPModal>

      {/* View Modal */}
      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)}
        title={`Client — ${viewItem?.client_code??''}`} size="md"
        footer={<>
          {canEdit && viewItem && (
            <SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>
          )}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}
      >
        {viewItem && (
          <div className="grid grid-cols-2 gap-4">
            {([
              ['Code',viewItem.client_code],['Name',viewItem.client_name],
              ['Type',viewItem.client_type],['Status',viewItem.status],
              ['Contact',viewItem.contact_person],['Phone',viewItem.contact_phone],
              ['Email',viewItem.contact_email],['SAP',viewItem.sap_enabled?'Enabled':'Disabled'],
              ['Company Code',viewItem.sap_company_code],['Warehouse',viewItem.warehouse_code],
              ['Remarks',viewItem.remarks],
            ] as [string,string|null|boolean][])
              .filter(([,v])=>v!==null&&v!==undefined&&v!=='')
              .map(([l,v])=>(
                <div key={String(l)}>
                  <p className="text-xs text-[#94A3B8] mb-0.5">{String(l)}</p>
                  <p className="text-sm font-medium text-[#1E293B]">{String(v)}</p>
                </div>
              ))
            }
          </div>
        )}
      </SAPModal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget)}
        title="Delete Client"
        message={`Delete "${deleteTarget?.client_name}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleteMutation.isPending}
      />
    </div>
  )
}
