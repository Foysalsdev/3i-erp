import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Briefcase } from 'lucide-react'
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

interface Supplier {
  id: string; supplier_name: string; supplier_code: string | null
  contact_person: string | null; phone: string | null; email: string | null
  city: string | null; payment_terms: string | null; status: string
}

const schema = z.object({
  supplier_name:  z.string().min(2,'Required'),
  supplier_code:  z.string().optional(),
  contact_person: z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  address:        z.string().optional(),
  city:           z.string().optional(),
  country:        z.string().default('Bangladesh'),
  payment_terms:  z.string().default('30 Days'),
  status:         z.string().default('Active'),
  remarks:        z.string().optional(),
})
type Form = z.infer<typeof schema>

const STATUS_OPTS  = [{ value:'Active',label:'Active' },{ value:'Inactive',label:'Inactive' },{ value:'Blacklisted',label:'Blacklisted' }]
const PAYMENT_OPTS = ['Cash','7 Days','15 Days','30 Days','60 Days'].map(v=>({ value:v, label:v }))

const columns: TableColumn<Supplier>[] = [
  { key:'supplier_name', label:'Supplier Name', sortable:true },
  { key:'supplier_code', label:'Code',          sortable:true, render: v => <span>{String(v??'—')}</span> },
  { key:'phone',         label:'Phone',         render: v => <span>{String(v??'—')}</span> },
  { key:'city',          label:'City',          render: v => <span>{String(v??'—')}</span> },
  { key:'payment_terms', label:'Payment Terms', render: v => <span>{String(v??'—')}</span> },
  { key:'status',        label:'Status',        render: v => <SAPBadge status={String(v)} /> },
]

export function SuppliersPage() {
  const { showToast } = useAppStore()
  const qc        = useQueryClient()
  const canCreate = usePermission('suppliers','can_create')
  const canEdit   = usePermission('suppliers','can_edit')
  const canDelete = usePermission('suppliers','can_delete')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(25)
  const [search, setSearch]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editItem, setEditItem]         = useState<Supplier|null>(null)
  const [viewItem, setViewItem]         = useState<Supplier|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier|null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { status:'Active', payment_terms:'30 Days', country:'Bangladesh' },
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['suppliers', page, pageSize, search],
    queryFn: async () => {
      let q = db.from('suppliers')
        .select('id,supplier_name,supplier_code,contact_person,phone,email,city,payment_terms,status', { count:'exact' })
        .order('supplier_name').range((page-1)*pageSize, page*pageSize-1)
      if (search) q = q.or(`supplier_name.ilike.%${search}%,supplier_code.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { suppliers: data ?? [], total: count ?? 0 }
    },
    staleTime: MASTERS_STALE,
    placeholderData: (prev: any) => prev,
  })

  const suppliers = data?.suppliers ?? []
  const total     = data?.total     ?? 0

  const saveMutation = useMutation({
    mutationFn: async (form: Form) => {
      const payload = { supplier_name:form.supplier_name, supplier_code:form.supplier_code||null,
        contact_person:form.contact_person||null, phone:form.phone||null, email:form.email||null,
        address:form.address||null, city:form.city||null, country:form.country,
        payment_terms:form.payment_terms, status:form.status, remarks:form.remarks||null }
      if (editItem) {
        const { error } = await db.from('suppliers').update(payload).eq('id', editItem.id)
        if (error) throw error
        await auditLog('UPDATE','suppliers', editItem.id, editItem.supplier_name)
      } else {
        const { error } = await db.from('suppliers').insert([payload])
        if (error) throw error
        await auditLog('CREATE','suppliers', '', form.supplier_name)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:['suppliers'] }); showToast(editItem?'Supplier updated.':'Supplier created.','success'); setModalOpen(false) },
    onError: (err) => handleSupabaseError(err,'Save Supplier'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (s: Supplier) => {
      const { error } = await db.from('suppliers').delete().eq('id', s.id)
      if (error) throw error
      await auditLog('DELETE','suppliers', s.id, s.supplier_name)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:['suppliers'] }); showToast('Supplier deleted.','success'); setDeleteTarget(null) },
    onError: (err) => handleSupabaseError(err,'Delete Supplier'),
  })

  function openNew() { setEditItem(null); reset({ status:'Active', payment_terms:'30 Days', country:'Bangladesh' }); setModalOpen(true) }
  function openEdit(s: Supplier) {
    setEditItem(s)
    reset({ supplier_name:s.supplier_name, supplier_code:s.supplier_code??'',
      contact_person:s.contact_person??'', phone:s.phone??'', email:s.email??'',
      city:s.city??'', payment_terms:s.payment_terms??'30 Days', status:s.status })
    setModalOpen(true)
  }

  const actionCol: TableColumn<Supplier> = {
    key:'actions', label:'Actions', sticky:true,
    render:(_,row) => (
      <div className="flex items-center gap-1">
        <button onClick={()=>setViewItem(row)} className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors" title="View"><Eye size={15}/></button>
        {canEdit   && <button onClick={()=>openEdit(row)} className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors" title="Edit"><Edit size={15}/></button>}
        {canDelete && <button onClick={()=>setDeleteTarget(row)} className="p-1.5 rounded text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={15}/></button>}
      </div>
    ),
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#EFF6FF] rounded-lg"><Briefcase size={20} className="text-[#2563EB]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Supplier Master</h1>
            <p className="text-sm text-[#64748B]">{total} supplier{total!==1?'s':''}{isFetching&&!isLoading&&<span className="ml-2 text-[#94A3B8]">↻</span>}</p>
          </div>
        </div>
        {canCreate && <SAPButton variant="emphasized" icon={<Plus size={16}/>} onClick={openNew}>New Supplier</SAPButton>}
      </div>

      <input type="text" placeholder="Search suppliers..." value={search}
        onChange={e=>{setSearch(e.target.value);setPage(1)}}
        className="w-full max-w-sm rounded-md border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"/>

      <div>
        <SAPTable columns={[...columns,actionCol]} data={suppliers} loading={isLoading} rowKey="id"
          emptyMessage="No suppliers found"
          emptyAction={canCreate?<SAPButton variant="emphasized" size="sm" icon={<Plus size={14}/>} onClick={openNew}>Add First Supplier</SAPButton>:undefined}/>
        <SAPPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      <SAPModal open={modalOpen} onClose={()=>setModalOpen(false)}
        title={editItem?`Edit — ${editItem.supplier_name}`:'New Supplier'} size="lg"
        footer={<>
          <SAPButton variant="ghost" onClick={()=>setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</SAPButton>
          <SAPButton variant="emphasized" onClick={handleSubmit(d=>saveMutation.mutate(d))} loading={saveMutation.isPending}>
            {editItem?'Save Changes':'Create Supplier'}
          </SAPButton>
        </>}>
        <form className="space-y-6" onSubmit={e=>e.preventDefault()}>
          <SAPFormSection title="Basic Info" cols={2}>
            <SAPFormRow><SAPInput label="Supplier Name" required error={errors.supplier_name?.message} {...register('supplier_name')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Supplier Code" {...register('supplier_code')}/></SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Payment Terms" options={PAYMENT_OPTS} value={watch('payment_terms')} onChange={v=>setValue('payment_terms',v)}/>
            </SAPFormRow>
            <SAPFormRow>
              <SAPSelect label="Status" options={STATUS_OPTS} value={watch('status')} onChange={v=>setValue('status',v)}/>
            </SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="Contact" cols={2}>
            <SAPFormRow><SAPInput label="Contact Person" {...register('contact_person')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Phone" {...register('phone')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="Email" type="email" error={errors.email?.message} {...register('email')}/></SAPFormRow>
            <SAPFormRow><SAPInput label="City" {...register('city')}/></SAPFormRow>
            <SAPFormRow span={2}><SAPTextarea label="Address" rows={2} {...register('address')}/></SAPFormRow>
          </SAPFormSection>
          <SAPFormSection title="" cols={1}><SAPTextarea label="Remarks" rows={2} {...register('remarks')}/></SAPFormSection>
        </form>
      </SAPModal>

      <SAPModal open={!!viewItem} onClose={()=>setViewItem(null)} title={`Supplier — ${viewItem?.supplier_name??''}`} size="md"
        footer={<>
          {canEdit&&viewItem&&<SAPButton variant="regular" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</SAPButton>}
          <SAPButton variant="ghost" onClick={()=>setViewItem(null)}>Close</SAPButton>
        </>}>
        {viewItem&&(
          <div className="grid grid-cols-2 gap-4">
            {[['Name',viewItem.supplier_name],['Code',viewItem.supplier_code],['Phone',viewItem.phone],
              ['Email',viewItem.email],['City',viewItem.city],['Payment',viewItem.payment_terms],['Status',viewItem.status]]
              .filter(([,v])=>v).map(([l,v])=>(
              <div key={String(l)}><p className="text-xs text-[#94A3B8] mb-0.5">{String(l)}</p><p className="text-sm font-medium text-[#1E293B]">{String(v)}</p></div>
            ))}
          </div>
        )}
      </SAPModal>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>deleteTarget&&deleteMutation.mutate(deleteTarget)}
        title="Delete Supplier" message={`Delete "${deleteTarget?.supplier_name}"?`}
        confirmLabel="Delete" loading={deleteMutation.isPending}/>
    </div>
  )
}
