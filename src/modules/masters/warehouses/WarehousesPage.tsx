import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Warehouse, MapPin } from 'lucide-react'
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
import { SAPPagination } from '@/components/ui/SAPPagination'
import type { TableColumn, SelectOption } from '@/types'

// ─── Types ─────────────────────────────────────────────────
interface WHRow   { id:string; warehouse_name:string; warehouse_code:string; address:string|null; total_area_sqft:number|null }
interface ZoneRow { id:string; warehouse_id:string; zone_name:string; zone_code:string; client_id:string|null; area_sqft:number|null }
interface RackRow { id:string; zone_id:string; rack_name:string; rack_code:string; total_bins:number|null }
interface BinRow  { id:string; rack_id:string; bin_code:string; bin_type:string; capacity:number|null; status:string }

type ActiveTab = 'warehouses'|'zones'|'racks'|'bins'

// ─── Schemas ───────────────────────────────────────────────
const whSchema   = z.object({ warehouse_name:z.string().min(2,'Required'), warehouse_code:z.string().min(1,'Required').max(10), address:z.string().optional(), total_area_sqft:z.string().optional() })
const zoneSchema = z.object({ warehouse_id:z.string().min(1,'Required'), zone_name:z.string().min(1,'Required'), zone_code:z.string().min(1,'Required'), client_id:z.string().optional(), area_sqft:z.string().optional() })
const rackSchema = z.object({ zone_id:z.string().min(1,'Required'), rack_name:z.string().min(1,'Required'), rack_code:z.string().min(1,'Required'), total_bins:z.string().optional() })
const binSchema  = z.object({ rack_id:z.string().min(1,'Required'), bin_code:z.string().min(1,'Required'), bin_type:z.string().default('Normal'), capacity:z.string().optional(), status:z.string().default('Available') })

type WHForm   = z.infer<typeof whSchema>
type ZoneForm = z.infer<typeof zoneSchema>
type RackForm = z.infer<typeof rackSchema>
type BinForm  = z.infer<typeof binSchema>

const BIN_STATUS_OPTS: SelectOption[] = [{ value:'Available',label:'Available' },{ value:'Occupied',label:'Occupied' },{ value:'Reserved',label:'Reserved' },{ value:'Blocked',label:'Blocked' }]
const BIN_TYPE_OPTS:   SelectOption[] = [{ value:'Normal',label:'Normal' },{ value:'Bulk',label:'Bulk' },{ value:'Racking',label:'Racking' }]

// ─── Generic row actions ──────────────────────────────────
function RowActions({ onEdit, onDelete, canEdit, canDelete }: { onEdit:()=>void; onDelete:()=>void; canEdit:boolean; canDelete:boolean }) {
  return (
    <div className="flex items-center gap-1">
      {canEdit   && <button onClick={onEdit}   className="p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-blue hover:bg-sap-blueLight" title="Edit"><Edit size={15}/></button>}
      {canDelete && <button onClick={onDelete} className="p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-error hover:bg-sap-errorLight" title="Delete"><Trash2 size={15}/></button>}
    </div>
  )
}

// ─── Warehouse Tab ──────────────────────────────────────────
function WarehouseTab() {
  const { showToast } = useAppStore()
  const canCreate = usePermission('warehouses','can_create')
  const canEdit   = usePermission('warehouses','can_edit')
  const canDelete = usePermission('warehouses','can_delete')
  const [rows, setRows]   = useState<WHRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]   = useState(false)
  const [edit, setEdit]   = useState<WHRow|null>(null)
  const [del, setDel]     = useState<WHRow|null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, reset, formState:{ errors } } = useForm<WHForm>({ resolver:zodResolver(whSchema) })

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await db('warehouses').select('id,warehouse_name,warehouse_code,address,total_area_sqft').order('warehouse_code')
    if (!error) setRows(data??[])
    else handleSupabaseError(error,'Fetch Warehouses')
    setLoading(false)
  }, [])
  useEffect(()=>{ fetch() },[fetch])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetch])

  function openNew() { setEdit(null); reset({}); setOpen(true) }
  function openEdit(w:WHRow) { setEdit(w); reset({ warehouse_name:w.warehouse_name, warehouse_code:w.warehouse_code, address:w.address??'', total_area_sqft:w.total_area_sqft?String(w.total_area_sqft):'' }); setOpen(true) }

  async function onSubmit(data:WHForm) {
    setSaving(true)
    try {
      const p = { warehouse_name:data.warehouse_name, warehouse_code:data.warehouse_code.toUpperCase(), address:data.address||null, total_area_sqft:data.total_area_sqft?Number(data.total_area_sqft):null }
      if (edit) {
        const { error } = await db('warehouses').update(p).eq('id',edit.id)
        if (error) throw error
        showToast('Warehouse updated.','success')
      } else {
        const { data:c, error } = await db('warehouses').insert(p).select('id').single()
        if (error) throw error
        await auditLog('CREATE','warehouses',c.id,data.warehouse_code)
        showToast('Warehouse created.','success')
      }
      setOpen(false); fetch()
    } catch(err){ handleSupabaseError(err,'Save Warehouse') }
    finally{ setSaving(false) }
  }

  async function handleDel() {
    if (!del) return
    setDeleting(true)
    try {
      const { error } = await db('warehouses').delete().eq('id',del.id)
      if (error) throw error
      showToast('Warehouse deleted.','success'); setDel(null); fetch()
    } catch(err){ handleSupabaseError(err,'Delete Warehouse') }
    finally{ setDeleting(false) }
  }

  const cols: TableColumn<WHRow>[] = [
    { key:'warehouse_code', label:'Code', sortable:true, width:'100px' },
    { key:'warehouse_name', label:'Name', sortable:true },
    { key:'total_area_sqft', label:'Area (sqft)', render:v=><span>{v?String(v):'—'}</span> },
    { key:'address', label:'Address', render:v=><span className="truncate max-w-xs block">{String(v??'—')}</span> },
    { key:'actions', label:'Actions', sticky:true, render:(_,row)=><RowActions onEdit={()=>openEdit(row)} onDelete={()=>setDel(row)} canEdit={canEdit} canDelete={canDelete}/> },
  ]

  return (
    <>
      <div className="flex justify-end mb-3">{canCreate && <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>New Warehouse</SAPButton>}</div>
      <SAPTable columns={cols} data={rows} loading={loading} rowKey="id" emptyMessage="No warehouses found"/>
      <SAPModal open={open} onClose={()=>setOpen(false)} title={edit?'Edit Warehouse':'New Warehouse'} size="md"
        footer={<><SAPButton variant="ghost" onClick={()=>setOpen(false)} disabled={saving}>Cancel</SAPButton><SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>Save</SAPButton></>}
      >
        <form className="space-y-4" onSubmit={e=>e.preventDefault()}>
          <SAPInput label="Warehouse Name" required error={errors.warehouse_name?.message} {...register('warehouse_name')}/>
          <SAPInput label="Warehouse Code (SAP)" required disabled={!!edit} placeholder="e.g. RB02" error={errors.warehouse_code?.message} {...register('warehouse_code')}/>
          <SAPInput label="Total Area (sqft)" type="number" min="0" {...register('total_area_sqft')}/>
          <SAPTextarea label="Address" rows={2} {...register('address')}/>
        </form>
      </SAPModal>
      <ConfirmDialog open={!!del} onClose={()=>setDel(null)} onConfirm={handleDel} title="Delete Warehouse" message={`Delete "${del?.warehouse_name}"?`} confirmLabel="Delete" loading={deleting}/>
    </>
  )
}

// ─── Zone Tab ──────────────────────────────────────────────
function ZoneTab() {
  const { showToast, activeClient } = useAppStore()
  const canCreate = usePermission('warehouses','can_create')
  const canEdit   = usePermission('warehouses','can_edit')
  const canDelete = usePermission('warehouses','can_delete')
  const [rows, setRows]   = useState<ZoneRow[]>([])
  const [whs, setWhs]     = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]   = useState(false)
  const [edit, setEdit]   = useState<ZoneRow|null>(null)
  const [del, setDel]     = useState<ZoneRow|null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<ZoneForm>({ resolver:zodResolver(zoneSchema) })

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data:zd }, { data:wd }] = await Promise.all([
      db('zones').select('id,warehouse_id,zone_name,zone_code,client_id,area_sqft').order('zone_code'),
      db('warehouses').select('id,warehouse_code,warehouse_name'),
    ])
    setRows(zd??[])
    setWhs((wd??[]).map((w:{ id:string;warehouse_code:string;warehouse_name:string })=>({ value:w.id, label:`${w.warehouse_code} — ${w.warehouse_name}` })))
    setLoading(false)
  }, [])
  useEffect(()=>{ fetch() },[fetch])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetch])

  function openNew() { setEdit(null); reset({ client_id:activeClient }); setOpen(true) }
  function openEdit(z:ZoneRow) { setEdit(z); reset({ warehouse_id:z.warehouse_id, zone_name:z.zone_name, zone_code:z.zone_code, client_id:z.client_id??activeClient, area_sqft:z.area_sqft?String(z.area_sqft):'' }); setOpen(true) }

  async function onSubmit(data:ZoneForm) {
    setSaving(true)
    try {
      const p = { warehouse_id:data.warehouse_id, zone_name:data.zone_name, zone_code:data.zone_code, client_id:data.client_id||null, area_sqft:data.area_sqft?Number(data.area_sqft):null }
      if (edit) { const { error } = await db('zones').update(p).eq('id',edit.id); if (error) throw error; showToast('Zone updated.','success') }
      else       { const { error } = await db('zones').insert(p);                  if (error) throw error; showToast('Zone created.','success') }
      setOpen(false); fetch()
    } catch(err){ handleSupabaseError(err,'Save Zone') }
    finally{ setSaving(false) }
  }

  async function handleDel() {
    if (!del) return; setDeleting(true)
    try { const { error } = await db('zones').delete().eq('id',del.id); if (error) throw error; showToast('Zone deleted.','success'); setDel(null); fetch() }
    catch(err){ handleSupabaseError(err,'Delete Zone') } finally{ setDeleting(false) }
  }

  const whMap = Object.fromEntries(whs.map(w=>[w.value,w.label]))
  const cols: TableColumn<ZoneRow>[] = [
    { key:'zone_code',    label:'Code',      sortable:true, width:'120px' },
    { key:'zone_name',    label:'Zone Name', sortable:true },
    { key:'warehouse_id', label:'Warehouse', render:v=><span>{whMap[String(v)]??'—'}</span> },
    { key:'client_id',    label:'Client',    render:v=><span>{String(v??'All')}</span> },
    { key:'area_sqft',    label:'Area',      render:v=><span>{v?String(v):'—'}</span> },
    { key:'actions', label:'Actions', sticky:true, render:(_,row)=><RowActions onEdit={()=>openEdit(row)} onDelete={()=>setDel(row)} canEdit={canEdit} canDelete={canDelete}/> },
  ]

  return (
    <>
      <div className="flex justify-end mb-3">{canCreate && <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>New Zone</SAPButton>}</div>
      <SAPTable columns={cols} data={rows} loading={loading} rowKey="id" emptyMessage="No zones found"/>
      <SAPModal open={open} onClose={()=>setOpen(false)} title={edit?'Edit Zone':'New Zone'} size="md"
        footer={<><SAPButton variant="ghost" onClick={()=>setOpen(false)} disabled={saving}>Cancel</SAPButton><SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>Save</SAPButton></>}
      >
        <form className="space-y-4" onSubmit={e=>e.preventDefault()}>
          <SAPSelect label="Warehouse" required options={whs} value={watch('warehouse_id')??''} onChange={v=>setValue('warehouse_id',v)} error={errors.warehouse_id?.message}/>
          <SAPInput label="Zone Name" required placeholder="e.g. Zone A" error={errors.zone_name?.message} {...register('zone_name')}/>
          <SAPInput label="Zone Code" required disabled={!!edit} placeholder="e.g. ZONE-A" error={errors.zone_code?.message} {...register('zone_code')}/>
          <SAPInput label="Area (sqft)" type="number" min="0" {...register('area_sqft')}/>
        </form>
      </SAPModal>
      <ConfirmDialog open={!!del} onClose={()=>setDel(null)} onConfirm={handleDel} title="Delete Zone" message={`Delete "${del?.zone_name}"?`} confirmLabel="Delete" loading={deleting}/>
    </>
  )
}

// ─── Rack Tab ──────────────────────────────────────────────
function RackTab() {
  const { showToast } = useAppStore()
  const canCreate = usePermission('warehouses','can_create')
  const canEdit   = usePermission('warehouses','can_edit')
  const canDelete = usePermission('warehouses','can_delete')
  const [rows, setRows]   = useState<RackRow[]>([])
  const [zones, setZones] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]   = useState(false)
  const [edit, setEdit]   = useState<RackRow|null>(null)
  const [del, setDel]     = useState<RackRow|null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<RackForm>({ resolver:zodResolver(rackSchema) })

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data:rd },{ data:zd }] = await Promise.all([
      db('racks').select('id,zone_id,rack_name,rack_code,total_bins').order('rack_code'),
      db('zones').select('id,zone_code,zone_name'),
    ])
    setRows(rd??[])
    setZones((zd??[]).map((z:{ id:string;zone_code:string;zone_name:string })=>({ value:z.id, label:`${z.zone_code} — ${z.zone_name}` })))
    setLoading(false)
  }, [])
  useEffect(()=>{ fetch() },[fetch])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetch])

  function openNew() { setEdit(null); reset({}); setOpen(true) }
  function openEdit(r:RackRow) { setEdit(r); reset({ zone_id:r.zone_id, rack_name:r.rack_name, rack_code:r.rack_code, total_bins:r.total_bins?String(r.total_bins):'' }); setOpen(true) }

  async function onSubmit(data:RackForm) {
    setSaving(true)
    try {
      const p = { zone_id:data.zone_id, rack_name:data.rack_name, rack_code:data.rack_code, total_bins:data.total_bins?Number(data.total_bins):null }
      if (edit) { const { error } = await db('racks').update(p).eq('id',edit.id); if (error) throw error; showToast('Rack updated.','success') }
      else       { const { error } = await db('racks').insert(p);                  if (error) throw error; showToast('Rack created.','success') }
      setOpen(false); fetch()
    } catch(err){ handleSupabaseError(err,'Save Rack') }
    finally{ setSaving(false) }
  }

  async function handleDel() {
    if (!del) return; setDeleting(true)
    try { const { error } = await db('racks').delete().eq('id',del.id); if (error) throw error; showToast('Rack deleted.','success'); setDel(null); fetch() }
    catch(err){ handleSupabaseError(err,'Delete Rack') } finally{ setDeleting(false) }
  }

  const zoneMap = Object.fromEntries(zones.map(z=>[z.value,z.label]))
  const cols: TableColumn<RackRow>[] = [
    { key:'rack_code',  label:'Code',      sortable:true, width:'130px' },
    { key:'rack_name',  label:'Rack Name', sortable:true },
    { key:'zone_id',    label:'Zone',      render:v=><span>{zoneMap[String(v)]??'—'}</span> },
    { key:'total_bins', label:'Bins',      render:v=><span>{v?String(v):'—'}</span> },
    { key:'actions', label:'Actions', sticky:true, render:(_,row)=><RowActions onEdit={()=>openEdit(row)} onDelete={()=>setDel(row)} canEdit={canEdit} canDelete={canDelete}/> },
  ]

  return (
    <>
      <div className="flex justify-end mb-3">{canCreate && <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>New Rack</SAPButton>}</div>
      <SAPTable columns={cols} data={rows} loading={loading} rowKey="id" emptyMessage="No racks found"/>
      <SAPModal open={open} onClose={()=>setOpen(false)} title={edit?'Edit Rack':'New Rack'} size="md"
        footer={<><SAPButton variant="ghost" onClick={()=>setOpen(false)} disabled={saving}>Cancel</SAPButton><SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>Save</SAPButton></>}
      >
        <form className="space-y-4" onSubmit={e=>e.preventDefault()}>
          <SAPSelect label="Zone" required options={zones} value={watch('zone_id')??''} onChange={v=>setValue('zone_id',v)} error={errors.zone_id?.message}/>
          <SAPInput label="Rack Name" required placeholder="e.g. Rack 01" error={errors.rack_name?.message} {...register('rack_name')}/>
          <SAPInput label="Rack Code" required disabled={!!edit} placeholder="e.g. A-RACK-01" error={errors.rack_code?.message} {...register('rack_code')}/>
          <SAPInput label="Total Bins" type="number" min="0" {...register('total_bins')}/>
        </form>
      </SAPModal>
      <ConfirmDialog open={!!del} onClose={()=>setDel(null)} onConfirm={handleDel} title="Delete Rack" message={`Delete "${del?.rack_name}"?`} confirmLabel="Delete" loading={deleting}/>
    </>
  )
}

// ─── Bin Tab ───────────────────────────────────────────────
function BinTab() {
  const { showToast } = useAppStore()
  const canCreate = usePermission('warehouses','can_create')
  const canEdit   = usePermission('warehouses','can_edit')
  const canDelete = usePermission('warehouses','can_delete')
  const [rows, setRows]   = useState<BinRow[]>([])
  const [racks, setRacks] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]   = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [open, setOpen]   = useState(false)
  const [edit, setEdit]   = useState<BinRow|null>(null)
  const [del, setDel]     = useState<BinRow|null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<BinForm>({ resolver:zodResolver(binSchema), defaultValues:{ bin_type:'Normal', status:'Available' } })

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = db('bins').select('id,rack_id,bin_code,bin_type,capacity,status',{ count:'exact' }).order('bin_code').range((page-1)*50, page*50-1)
    if (search) q = q.ilike('bin_code',`%${search}%`)
    const [{ data:bd, count },{ data:rd }] = await Promise.all([q, db('racks').select('id,rack_code,rack_name')])
    setRows(bd??[]); setTotal(count??0)
    setRacks((rd??[]).map((r:{ id:string;rack_code:string;rack_name:string })=>({ value:r.id, label:`${r.rack_code} — ${r.rack_name}` })))
    setLoading(false)
  }, [page, search])
  useEffect(()=>{ fetch() },[fetch])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetch])

  function openNew() { setEdit(null); reset({ bin_type:'Normal', status:'Available' }); setOpen(true) }
  function openEdit(b:BinRow) { setEdit(b); reset({ rack_id:b.rack_id, bin_code:b.bin_code, bin_type:b.bin_type, capacity:b.capacity?String(b.capacity):'', status:b.status }); setOpen(true) }

  async function onSubmit(data:BinForm) {
    setSaving(true)
    try {
      const p = { rack_id:data.rack_id, bin_code:data.bin_code, bin_type:data.bin_type, capacity:data.capacity?Number(data.capacity):null, status:data.status }
      if (edit) { const { error } = await db('bins').update(p).eq('id',edit.id); if (error) throw error; showToast('Bin updated.','success') }
      else       { const { error } = await db('bins').insert(p);                  if (error) throw error; showToast('Bin created.','success') }
      setOpen(false); fetch()
    } catch(err){ handleSupabaseError(err,'Save Bin') }
    finally{ setSaving(false) }
  }

  async function handleDel() {
    if (!del) return; setDeleting(true)
    try { const { error } = await db('bins').delete().eq('id',del.id); if (error) throw error; showToast('Bin deleted.','success'); setDel(null); fetch() }
    catch(err){ handleSupabaseError(err,'Delete Bin') } finally{ setDeleting(false) }
  }

  const rackMap = Object.fromEntries(racks.map(r=>[r.value,r.label]))
  const cols: TableColumn<BinRow>[] = [
    { key:'bin_code', label:'Bin Code', sortable:true },
    { key:'rack_id',  label:'Rack',     render:v=><span>{rackMap[String(v)]??'—'}</span> },
    { key:'bin_type', label:'Type',     sortable:true },
    { key:'capacity', label:'Capacity', render:v=><span>{v?String(v):'—'}</span> },
    { key:'status',   label:'Status',   render:v=><SAPBadge status={String(v)} /> },
    { key:'actions', label:'Actions', sticky:true, render:(_,row)=><RowActions onEdit={()=>openEdit(row)} onDelete={()=>setDel(row)} canEdit={canEdit} canDelete={canDelete}/> },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-3">
        <input type="text" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search bin code..."
          className="rounded-sap-sm border border-sap-border px-3 py-2 text-sap-md focus:outline-none focus:border-sap-blue focus:shadow-sap-focus w-64"/>
        {canCreate && <SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>New Bin</SAPButton>}
      </div>
      <SAPTable columns={cols} data={rows} loading={loading} rowKey="id" emptyMessage="No bins found"/>
      <SAPPagination page={page} pageSize={50} total={total} onPageChange={setPage} onPageSizeChange={()=>{}}/>
      <SAPModal open={open} onClose={()=>setOpen(false)} title={edit?'Edit Bin':'New Bin'} size="md"
        footer={<><SAPButton variant="ghost" onClick={()=>setOpen(false)} disabled={saving}>Cancel</SAPButton><SAPButton variant="emphasized" onClick={handleSubmit(onSubmit)} loading={saving}>Save</SAPButton></>}
      >
        <form className="space-y-4" onSubmit={e=>e.preventDefault()}>
          <SAPSelect label="Rack" required options={racks} value={watch('rack_id')??''} onChange={v=>setValue('rack_id',v)} error={errors.rack_id?.message}/>
          <SAPInput label="Bin Code" required disabled={!!edit} placeholder="e.g. A-RACK-01-BIN-01" error={errors.bin_code?.message} {...register('bin_code')}/>
          <SAPSelect label="Bin Type" options={BIN_TYPE_OPTS} value={watch('bin_type')} onChange={v=>setValue('bin_type',v)}/>
          <SAPInput label="Capacity" type="number" min="0" {...register('capacity')}/>
          <SAPSelect label="Status" options={BIN_STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/>
        </form>
      </SAPModal>
      <ConfirmDialog open={!!del} onClose={()=>setDel(null)} onConfirm={handleDel} title="Delete Bin" message={`Delete "${del?.bin_code}"?`} confirmLabel="Delete" loading={deleting}/>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────
export function WarehousesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('warehouses')
  const tabs: { key:ActiveTab; label:string; icon:React.ReactNode }[] = [
    { key:'warehouses', label:'Warehouses', icon:<Warehouse size={15}/> },
    { key:'zones',      label:'Zones',      icon:<MapPin size={15}/> },
    { key:'racks',      label:'Racks',      icon:<MapPin size={15}/> },
    { key:'bins',       label:'Bins',       icon:<MapPin size={15}/> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sap-blueLight rounded-sap"><Warehouse size={20} className="text-sap-blue"/></div>
        <div>
          <h1 className="text-sap-xl font-bold text-sap-text">Warehouse / Location Master</h1>
          <p className="text-sap-sm text-sap-textSecondary">Manage Warehouse → Zone → Rack → Bin hierarchy</p>
        </div>
      </div>
      <div className="flex items-center gap-0 border-b border-sap-border bg-white rounded-t-sap overflow-hidden shadow-sap-card">
        {tabs.map(tab=>(
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sap-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab===tab.key ? 'border-sap-blue text-sap-blue bg-sap-blueLight' : 'border-transparent text-sap-textSecondary hover:text-sap-text hover:bg-sap-surfaceHover'}`}
          >{tab.icon}{tab.label}</button>
        ))}
      </div>
      <div className="bg-white rounded-sap shadow-sap-card p-5">
        {activeTab==='warehouses' && <WarehouseTab/>}
        {activeTab==='zones'      && <ZoneTab/>}
        {activeTab==='racks'      && <RackTab/>}
        {activeTab==='bins'       && <BinTab/>}
      </div>
    </div>
  )
}

