/// <reference types="vite/client" />
import { supabase } from './supabase'
import { handleSupabaseError, withRetry } from './errorHandler'

const ALLOWED_TYPES = [
  'application/pdf','image/jpeg','image/png','image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
]
const MAX_FILE_SIZE = 20 * 1024 * 1024

export interface AttachmentRow {
  id: string; file_name: string; file_type: string; file_size: number
  google_drive_id: string; google_drive_url: string
  uploaded_at: string; uploaded_by: string
}

interface AttachmentInsert {
  module: string; record_id: string; record_no: string
  file_name: string; file_type: string; file_size: number
  google_drive_id: string; google_drive_url: string; uploaded_by: string
}

export async function uploadAttachment(
  file: File, module: string, recordId: string, recordNo: string, uploadedBy: string
): Promise<{ success: boolean; error?: string; attachmentId?: string }> {
  if (file.size > MAX_FILE_SIZE)         return { success: false, error: 'File too large. Maximum 20MB allowed.' }
  if (!ALLOWED_TYPES.includes(file.type)) return { success: false, error: 'File type not allowed.' }

  try {
    const form = new FormData()
    form.append('file', file)
    form.append('module', module)
    form.append('record_no', recordNo)

    const { data, error } = await withRetry(() =>
      supabase.functions.invoke('upload-to-drive', { body: form })
    )
    if (error) throw error
    const respData = data as { success?: boolean; error?: string; drive_id?: string; view_url?: string }
    if (!respData?.success) throw new Error(respData?.error ?? 'Upload failed')

    const insert: AttachmentInsert = {
      module, record_id: recordId, record_no: recordNo,
      file_name: file.name, file_type: file.type, file_size: file.size,
      google_drive_id: respData.drive_id!, google_drive_url: respData.view_url!,
      uploaded_by: uploadedBy,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: att, error: dbErr } = await supabase.from('attachments').insert(insert as any).select('id').single()
    if (dbErr) throw dbErr
    return { success: true, attachmentId: (att as { id: string } | null)?.id }
  } catch (err) {
    handleSupabaseError(err, 'File Upload')
    return { success: false, error: 'Upload failed. Please try again.' }
  }
}

export async function deleteAttachment(attachmentId: string, driveId: string): Promise<{ success: boolean }> {
  try {
    await supabase.functions.invoke('delete-from-drive', { body: { drive_id: driveId } })
    const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    handleSupabaseError(err, 'File Delete')
    return { success: false }
  }
}

export async function getAttachments(module: string, recordId: string): Promise<AttachmentRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('attachments') as any)
    .select('id, file_name, file_type, file_size, google_drive_id, google_drive_url, uploaded_at, uploaded_by')
    .eq('module', module).eq('record_id', recordId).order('uploaded_at', { ascending: false })
  if (error) { handleSupabaseError(error, 'Fetch Attachments'); return [] }
  return (data ?? []) as AttachmentRow[]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(fileType: string): string {
  if (fileType === 'application/pdf')      return '📄'
  if (fileType.startsWith('image/'))       return '🖼️'
  if (fileType.includes('spreadsheet') || fileType === 'text/csv') return '📊'
  if (fileType.includes('wordprocessing')) return '📝'
  return '📎'
}
