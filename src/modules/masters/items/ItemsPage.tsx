import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Box } from 'lucide-react'
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

interface Item {
  id: string; client_id: string; sku: string; item_name: string
  sap_material_code: string|null; category: string|null
  unit_of_measure: string|null; status: string
}

const schema = z.object({
  client_id:         z.string().min(1,'Required'),
  sku:               z.string().min(1,'Required'),
  item_name:         z.string().min(2,'Required'),
  sap_material_code: z.string().optional(),
  item_description:  z.string().optional(),
  category:          z.string().optional(),
  unit_of_measure:   z.string().default('PCS'),
  brand:             z.string().optional(),
  model_no:          z.string().optional(),
  hsn_code:          z.string().optional(),
  reorder_level:     z.number().default(0),
  status:            z.string().default('Active'),
  remarks:           z.string().optional(),
})
type Form = z.infer<typeof schema>

const UOM_OPTS    = ['PCS','SET','BOX','KG','MTR'].map(v=>({value:v,label:v}))
const STATUS_OPTS = ['Active','Inactive','Discontinued'].map(v=>({value:v,label:v}))

const columns: TableColumn<Item>[] = [
  { key:'sku',               label:'SKU',          sortable:true },
  { key:'item_name',         label:'Item Name',    sortable:true },
  { key:'sap_material_code', label:'SAP Code',     render: v=><span className="font-mono text-xs">{String(v??'—')}</span> },
  { key:'category',          label:'Category',     render: v=><span>{String(v??'—')}</span> },
  { key:'unit_of_measure',   label:'UOM',          render: v=><span>{String(v??'—')}</span> },
  { key:'status',            label:'Status',       render: v=><SAPBadge status={String(v)} /> },
]

export function ItemsPage() {
  const { showToast, activeClient } = useAppStore()
  const qc        = useQueryClient()
  const canCreate = usePermission('items','can_create')
  const canEdit   = usePermission('items','can_edit')
  const canDelete = usePermission('items','can_delete')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Item|null>(null)
  const [viewItem, setViewItem]         = useState<Item|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Item|null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState:{errors} } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { client_id:activeClient, status:'Active', unit_of_measure:'PCS', reorder_level:0 },
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['items', activeClient, page, pageSize, search],
    queryFn: async () => {
      let q = db.from('items')
        .select('id,client_id,sku,item_name,sap_material_code,category,unit_of_measure,status', { count:'exact' })
        .eq('client_id', activeClient).order('item_name').range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`item_name.ilike.%${search}%,sku.ilike.%${search}%,sap_material_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { items: data??[], total: count??0 }
    },
    staleTime: MASTERS_STALE,
    placeholderData: (prev:any)=>prev,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const saveMutation = useMutation({
    mutationFn: async (form: Form) => {
      const payload = { client_id:form.client_id, sku:form.sku, item_name:form.item_name,
        sap_material_code:form.sap_material_code||null, item_description:form.item_description||null,
        category:form.category||null, unit_of_measure:form.unit_of_measure,
        brand:form.brand||null, model_no:form.model_no||null, hsn_code:form.hsn_code||null,
        reorder_level:form.reorder_level, status:form.status, remarks:form.remarks||null }
      if (editItem) {
        const {error}=await db.from('items').update(payload).eq('id',editItem.id)
        if(error)throw error
        await auditLog('UPDATE','items',editItem.id,editItem.item_name)
      } else {
        const {error}=await db.from('items').insert([payload])
        if(error)throw error
        await auditLog('CREATE','items','',form.item_name)
      }
    },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['items']}); showToast(editItem?'Item updated.':'Item created.','success'); setModalOpen(false) },
    onError: (err)=>handleSupabaseError(err,'Save Item'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (i:Item)=>{ const {error}=await db.from('items').delete().eq('id',i.id); if(error)throw error; await auditLog('DELETE','items',i.id,i.item_name) },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:['items']}); showToast('Item deleted.','success'); setDeleteTarget(null) },
    onError: (err)=>handleSupabaseError(err,'Delete Item'),
  })

  function openNew() { setEditItem(null); reset({client_id:activeClient,status:'Active',unit_of_measure:'PCS',reorder_level:0}); setModalOpen(true) }
  function openEdit(i:Item) {
    setEditItem(i)
    reset({client_id:i.client_id,sku:i.sku,item_name:i.item_name,sap_material_code:i.sap_material_code??'',
      category:i.category??'',unit_of_measure:i.unit_of_measure??'PCS',status:i.status})
    setModalOpen(true)
  }

  const actionCol: TableColumn<Item> = {
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
          <div className="p-2 bg-[#EFF6FF] rounded-lg"><Box size={20} className="text-[#2563EB]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Item / SKU Master</h1>
            <p className="text-sm text-[#64748B]">{total} item{total!==1?'s':''} · {activeClient}{isFetching&&!isLoading&&<span className="ml-2 text-[#94A3B8]">↻</span>}</p>
          </div>
        </div>
        {canCreate&&<SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Item</SAPButton>}
      </div>

      <input type="text" placeholder="Search by name, SKU or SAP code..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-md border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"/>

      <div>
        <SAPTable columns={[...columns,actionCol]} data={items} loading={isLoading} rowKey="id"
          emptyMessage="No items found"
          emptyAction={canCreate?<SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Item</SAPButton>:undefined}/>
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit — ${editItem.item_name}`:'New Item'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(d=>saveMutation.mutate(d))} loading={saveMutation.isPending}>
            {editItem?'Save Changes':'Create Item'}
          </SAPButton>
        </>}>
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Item Info" cols={2}>
            <SAPFormRow><SAPInput label="SKU" required error={errors.sku?.message} disabled={!!editItem} {...register('sku')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Item Name" required error={errors.item_name?.message} {...register('item_name')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="SAP Material Code" placeholder="SAP-UNIQUE" {...register('sap_material_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Category" {...register('category')}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Unit of Measure" options={UOM_OPTS} value={watch('unit_of_measure')} onChange={v=>setValue('unit_of_measure',v)}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Brand" {...register('brand')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Model No" {...register('model_no')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="HSN Code" {...register('hsn_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Reorder Level" type="number" {...register('reorder_level',{valueAsNumber:true})}/></SAPFormRow>
            <SAPFormRow><SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="" cols={1}>
            <SAPTextarea label="Description" rows={2} {...register('item_description')}/>
            <SAPTextarea label="Remarks" rows={2} {...register('remarks')}/>
          </SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Item — ${viewItem?.item_name??''}`} size="md"
        footer={<>{canEdit&&viewItem&&<SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}<SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton></>}>
        {viewItem&&(<div className="grid grid-cols-2 gap-4">
          {[['SKU',viewItem.sku],['Name',viewItem.item_name],['SAP Code',viewItem.sap_material_code],['Category',viewItem.category],['UOM',viewItem.unit_of_measure],['Status',viewItem.status]]
            .filter(([,v])=>v).map(([l,v])=>(<div key={String(l)}><p className="text-xs text-[#94A3B8] mb-0.5">{String(l)}</p><p className="text-sm font-medium text-[#1E293B]">{String(v)}</p></div>))}</div>)}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget)}
        title="Delete Item" message={`Delete "${deleteTarget?.item_name}"?`}
        confirmLabel="Delete" loading={deleteMutation.isPending}/>
    </div>
  )
}
