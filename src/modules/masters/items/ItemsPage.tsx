import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Edit, Trash2, Package } from 'lucide-react'
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

interface Item {
  id: string; client_id: string; sku: string; sap_material_code: string | null
  item_name: string; category: string | null; unit_of_measure: string
  brand: string | null; model_no: string | null; reorder_level: number; status: string
}

const UNIT_OPTS: SelectOption[] = [
  { value:'PCS',label:'PCS — Pieces' },{ value:'SET',label:'SET — Set' },
  { value:'BOX',label:'BOX — Box' },{ value:'KG',label:'KG — Kilogram' },{ value:'MTR',label:'MTR — Meter' },
]
const STATUS_OPTS: SelectOption[] = [
  { value:'Active',label:'Active' },{ value:'Inactive',label:'Inactive' },{ value:'Discontinued',label:'Discontinued' },
]

const schema = z.object({
  sku:               z.string().min(1,'SKU required'),
  sap_material_code: z.string().optional(),
  item_name:         z.string().min(2,'Name required'),
  item_description:  z.string().optional(),
  category:          z.string().optional(),
  sub_category:      z.string().optional(),
  unit_of_measure:   z.string().min(1,'Unit required'),
  brand:             z.string().optional(),
  model_no:          z.string().optional(),
  color:             z.string().optional(),
  weight_kg:         z.string().optional(),
  dimensions:        z.string().optional(),
  hsn_code:          z.string().optional(),
  reorder_level:     z.string().default('0'),
  max_stock:         z.string().optional(),
  status:            z.string().default('Active'),
  remarks:           z.string().optional(),
})
type Form = z.infer<typeof schema>

const cols: TableColumn<Item>[] = [
  { key:'sap_material_code', label:'SAP Code', sortable:true, render: v=><span className="font-mono text-sap-sm">{String(v??'—')}</span> },
  { key:'sku',               label:'SKU',      sortable:true },
  { key:'item_name',         label:'Item Name',sortable:true },
  { key:'category',          label:'Category', sortable:true, render: v=><span>{String(v??'—')}</span> },
  { key:'unit_of_measure',   label:'Unit',     sortable:true },
  { key:'reorder_level',     label:'Reorder',  sortable:true },
  { key:'status',            label:'Status',   render: v=><SAPBadge status={String(v)} /> },
]

export function ItemsPage() {
  const { showToast, activeClient } = useAppStore()
  const canCreate = usePermission('items','can_create')
  const canEdit   = usePermission('items','can_edit')
  const canDelete = usePermission('items','can_delete')

  const [items, setItems]               = useState<Item[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [filters, setFilters]           = useState({ search:'', status:'', category:'' })
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Item|null>(null)
  const [viewItem, setViewItem]         = useState<Item|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Item|null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [sapCodeError, setSapCodeError] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { unit_of_measure:'PCS', status:'Active', reorder_level:'0' },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let q = db('items')
        .select('id,client_id,sku,sap_material_code,item_name,category,unit_of_measure,brand,model_no,reorder_level,status', { count:'exact' })
        .eq('client_id', activeClient)
        .order('item_name')
        .range((page-1)*pageSize, page*pageSize-1)
      if (filters.search)   q = q.or(`item_name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,sap_material_code.ilike.%${filters.search}%`)
      if (filters.status)   q = q.eq('status', filters.status)
      if (filters.category) q = q.ilike('category', `%${filters.category}%`)
      const { data, count, error } = await q
      if (error) throw error
      setItems(data ?? [])
      setTotal(count ?? 0)
    } catch(err) { handleSupabaseError(err,'Fetch Items') }
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

  async function checkSapUnique(code: string) {
    if (!code.trim()) { setSapCodeError(''); return }
    const { data } = await db('items').select('id').eq('sap_material_code', code.trim()).maybeSingle()
    if (data && data.id !== editItem?.id) setSapCodeError('SAP Material Code already exists in the system.')
    else setSapCodeError('')
  }

  function openNew() {
    setEditItem(null); setSapCodeError('')
    reset({ unit_of_measure:'PCS', status:'Active', reorder_level:'0' })
    setModalOpen(true)
  }
  function openEdit(item: Item) {
    setEditItem(item); setSapCodeError('')
    reset({ sku:item.sku, sap_material_code:item.sap_material_code??'', item_name:item.item_name,
      category:item.category??'', unit_of_measure:item.unit_of_measure, brand:item.brand??'',
      model_no:item.model_no??'', reorder_level:String(item.reorder_level??0), status:item.status })
    setModalOpen(true)
  }

  async function onSubmit(data: Form) {
    if (sapCodeError) { showToast('Fix SAP code error first.','error'); return }
    setSaving(true)
    try {
      const payload = {
        client_id:         activeClient,
        sku:               data.sku,
        sap_material_code: data.sap_material_code?.trim() || null,
        item_name:         data.item_name,
        item_description:  data.item_description || null,
        category:          data.category || null,
        sub_category:      data.sub_category || null,
        unit_of_measure:   data.unit_of_measure,
        brand:             data.brand || null,
        model_no:          data.model_no || null,
        color:             data.color || null,
        weight_kg:         data.weight_kg ? Number(data.weight_kg) : null,
        dimensions:        data.dimensions || null,
        hsn_code:          data.hsn_code || null,
        reorder_level:     Number(data.reorder_level) || 0,
        max_stock:         data.max_stock ? Number(data.max_stock) : null,
        status:            data.status,
        remarks:           data.remarks || null,
      }
      if (editItem) {
        const { error } = await db('items').update(payload).eq('id', editItem.id)
        if (error) throw error
        await auditLog('UPDATE','items',editItem.id,editItem.sku)
        showToast(`Item ${data.sku} updated.`,'success')
      } else {
        const { data:created, error } = await db('items').insert(payload).select('id').single()
        if (error) throw error
        await auditLog('CREATE','items',created.id,data.sku)
        showToast(`Item ${data.sku} created.`,'success')
      }
      setModalOpen(false); fetchData()
    } catch(err) { handleSupabaseError(err,'Save Item') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await db('items').delete().eq('id', deleteTarget.id)
      if (error) throw error
      await auditLog('DELETE','items',deleteTarget.id,deleteTarget.sku)
      showToast('Item deleted.','success')
      setDeleteTarget(null); fetchData()
    } catch(err) { handleSupabaseError(err,'Delete Item') }
    finally { setDeleting(false) }
  }

  const actionCol: TableColumn<Item> = {
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
          <div className="p-2 bg-sap-blueLight rounded-sap"><Package size={20} className="text-sap-blue"/></div>
          <div>
            <h1 className="text-sap-xl font-bold text-sap-text">Item / SKU Master</h1>
            <p className="text-sap-sm text-sap-textSecondary">{activeClient} · {total} item{total!==1?'s':''}</p>
          </div>
        </div>
        {canCreate && <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Item</SAPButton>}
      </div>

      <SAPFilterBar
        fields={[
          { key:'search',   label:'Search',   type:'text',   placeholder:'Name, SKU, SAP Code...' },
          { key:'status',   label:'Status',   type:'select', options:STATUS_OPTS },
          { key:'category', label:'Category', type:'text',   placeholder:'Category...' },
        ]}
        values={filters}
        onChange={(k,v)=>setFilters(f=>({...f,[k]:v}))}
        onSearch={()=>{setPage(1);fetchData()}}
        onClear={()=>{setFilters({search:'',status:'',category:''});setPage(1)}}
        loading={loading}
      />

      <div>
        <SAPTable columns={[...cols,actionCol]} data={items} loading={loading} rowKey="id"
          emptyMessage="No items found for this client"
          emptyAction={canCreate ? <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Item</SAPButton> : undefined}
        />
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit Item — ${editItem.sku}`:'New Item'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saving}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>{editItem?'Save Changes':'Create Item'}</SAPButton>
        </>}
      >
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Identification" cols={2}>
            <SAPFormRow><SAPInput label="SKU" required disabled={!!editItem} error={errors.sku?.message} {...register('sku')}/></SAPFormRow>
            <SAPFormRow>
              <SAPInput label="SAP Material Code" placeholder="e.g. 4000123"
                error={sapCodeError||errors.sap_material_code?.message}
                hint="SAP-UNIQUE — globally unique"
                {...register('sap_material_code')}
                onBlur={e=>checkSapUnique(e.target.value)}
              />
            </SAPFormRow>
            <SAPFormRow span={2}><SAPInput label="Item Name" required error={errors.item_name?.message} {...register('item_name')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Description" rows={2} {...register('item_description')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Classification" cols={2}>
            <SAPFormRow><SAPInput label="Category" placeholder="e.g. Washing Machine" {...register('category')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Sub-category" {...register('sub_category')}/></SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Unit of Measure" required options={UNIT_OPTS} value={watch('unit_of_measure')} onChange={v=>setValue('unit_of_measure',v)} error={errors.unit_of_measure?.message}/>
            </SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/>
            </SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Product Details" cols={2}>
            <SAPFormRow><SAPInput label="Brand" {...register('brand')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Model No." {...register('model_no')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Color" {...register('color')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="HSN Code" {...register('hsn_code')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Weight (KG)" type="number" step="0.01" min="0" {...register('weight_kg')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Dimensions (L×W×H)" placeholder="60×50×85 CM" {...register('dimensions')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Reorder Level" type="number" min="0" {...register('reorder_level')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Max Stock" type="number" min="0" {...register('max_stock')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="" cols={1}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Item — ${viewItem?.sku??''}`} size="md"
        footer={<>
          {canEdit && viewItem && <SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}
      >
        {viewItem && (
          <div className="grid grid-cols-2 gap-4">
            {([['SKU',viewItem.sku],['SAP Code',viewItem.sap_material_code],['Name',viewItem.item_name],
              ['Category',viewItem.category],['Unit',viewItem.unit_of_measure],['Brand',viewItem.brand],
              ['Model',viewItem.model_no],['Reorder Level',String(viewItem.reorder_level)],['Status',viewItem.status],
            ] as [string,string|null][]).filter(([,v])=>v).map(([l,v])=>(
              <div key={l}><p className="text-sap-xs text-sap-textSecondary">{l}</p><p className="text-sap-md font-medium">{v}</p></div>
            ))}
          </div>
        )}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Item" message={`Delete "${deleteTarget?.item_name}"? Cannot be undone.`}
        confirmLabel="Delete" loading={deleting}/>
    </div>
  )
}

