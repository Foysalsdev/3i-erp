import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Warehouse } from 'lucide-react'
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

interface WarehouseRow {
  id: string; warehouse_name: string; warehouse_code: string
  address: string|null; total_area_sqft: number|null; status: string
}

const schema = z.object({
  warehouse_name:  z.string().min(2,'Required'),
  warehouse_code:  z.string().min(1,'Required'),
  address:         z.string().optional(),
  total_area_sqft: z.number().optional(),
  status:          z.string().default('Active'),
  remarks:         z.string().optional(),
})
type Form = z.infer<typeof schema>

const STATUS_OPTS = ['Active','Inactive'].map(v=>({value:v,label:v}))

const columns: TableColumn<WarehouseRow>[] = [
  { key:'warehouse_code', label:'Code',    sortable:true, width:'100px' },
  { key:'warehouse_name', label:'Name',    sortable:true },
  { key:'address',        label:'Address', render: v=><span className="text-xs">{String(v??'—')}</span> },
  { key:'total_area_sqft',label:'Area',   render: v=><span>{v ? `${v} sqft` : '—'}</span> },
  { key:'status',         label:'Status', render: v=><SAPBadge status={String(v)} /> },
]

export function WarehousesPage() {
  const { showToast } = useAppStore()
  const qc        = useQueryClient()
  const canCreate = usePermission('warehouses','can_create')
  const canEdit   = usePermission('warehouses','can_edit')
  const canDelete = usePermission('warehouses','can_delete')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<WarehouseRow|null>(null)
  const [viewItem, setViewItem]         = useState<WarehouseRow|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WarehouseRow|null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState:{errors} } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { status:'Active' },
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['warehouses', page, pageSize, search],
    queryFn: async () => {
      let q = db.from('warehouses')
        .select('id,warehouse_name,warehouse_code,address,total_area_sqft,status', { count:'exact' })
        .order('warehouse_code').range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`warehouse_name.ilike.%${search}%,warehouse_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { warehouses: data??[], total: count??0 }
    },
    staleTime: MASTERS_STALE,
    placeholderData: (prev:any)=>prev,
  })

  const warehouses = data?.warehouses ?? []
  const total      = data?.total      ?? 0

  const saveMutation = useMutation({
    mutationFn: async (form: Form) => {
      const payload = { warehouse_name:form.warehouse_name, warehouse_code:form.warehouse_code,
        address:form.address||null, total_area_sqft:form.total_area_sqft||null,
        status:form.status, remarks:form.remarks||null }
      if (editItem) {
        const {error}=await db.from('warehouses').update(payload).eq('id',editItem.id)
        if(error)throw error
        await auditLog('UPDATE','warehouses',editItem.id,editItem.warehouse_name)
      } else {
        const {error}=await db.from('warehouses').insert([payload])
        if(error)throw error
        await auditLog('CREATE','warehouses','',form.warehouse_name)
      }
    },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['warehouses']}); showToast(editItem?'Warehouse updated.':'Warehouse created.','success'); setModalOpen(false) },
    onError: (err)=>handleSupabaseError(err,'Save Warehouse'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (w:WarehouseRow)=>{ const {error}=await db.from('warehouses').delete().eq('id',w.id); if(error)throw error; await auditLog('DELETE','warehouses',w.id,w.warehouse_name) },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['warehouses']}); showToast('Warehouse deleted.','success'); setDeleteTarget(null) },
    onError: (err)=>handleSupabaseError(err,'Delete Warehouse'),
  })

  function openNew() { setEditItem(null); reset({status:'Active'}); setModalOpen(true) }
  function openEdit(w:WarehouseRow) {
    setEditItem(w)
    reset({warehouse_name:w.warehouse_name,warehouse_code:w.warehouse_code,
      address:w.address??'',total_area_sqft:w.total_area_sqft??undefined,status:w.status})
    setModalOpen(true)
  }

  const actionCol: TableColumn<WarehouseRow> = {
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
          <div className="p-2 bg-[#EFF6FF] rounded-lg"><Warehouse size={20} className="text-[#2563EB]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Warehouse Master</h1>
            <p className="text-sm text-[#64748B]">{total} warehouse{total!==1?'s':''}{isFetching&&!isLoading&&<span className="ml-2 text-[#94A3B8]">↻</span>}</p>
          </div>
        </div>
        {canCreate&&<SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Warehouse</SAPButton>}
      </div>

      <input type="text" placeholder="Search warehouses..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-md border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"/>

      <div>
        <SAPTable columns={[...columns,actionCol]} data={warehouses} loading={isLoading} rowKey="id"
          emptyMessage="No warehouses found"
          emptyAction={canCreate?<SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add Warehouse</SAPButton>:undefined}/>
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit — ${editItem.warehouse_name}`:'New Warehouse'} size="md"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(d=>saveMutation.mutate(d))} loading={saveMutation.isPending}>
            {editItem?'Save Changes':'Create Warehouse'}
          </SAPButton>
        </>}>
        <form className="space-y-4" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Warehouse Info" cols={2}>
            <SAPFormRow><SAPInput label="Warehouse Name" required error={errors.warehouse_name?.message} {...register('warehouse_name')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Warehouse Code" required placeholder="e.g. RB02" error={errors.warehouse_code?.message} {...register('warehouse_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Total Area (sqft)" type="number" {...register('total_area_sqft',{valueAsNumber:true})}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Address" rows={2} {...register('address')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormRow>
          </SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Warehouse — ${viewItem?.warehouse_code??''}`} size="md"
        footer={<>{canEdit&&viewItem&&<SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}<SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton></>}>
        {viewItem&&(<div className="grid grid-cols-2 gap-4">
          {[['Code',viewItem.warehouse_code],['Name',viewItem.warehouse_name],['Area',viewItem.total_area_sqft?`${viewItem.total_area_sqft} sqft`:null],['Address',viewItem.address],['Status',viewItem.status]]
            .filter(([,v])=>v).map(([l,v])=>(<div key={String(l)}><p className="text-xs text-[#94A3B8] mb-0.5">{String(l)}</p><p className="text-sm font-medium text-[#1E293B]">{String(v)}</p></div>))}</div>)}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget)}
        title="Delete Warehouse" message={`Delete "${deleteTarget?.warehouse_name}"?`}
        confirmLabel="Delete" loading={deleteMutation.isPending}/>
    </div>
  )
}
