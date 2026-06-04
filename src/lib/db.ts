/**
 * db.ts — Typed Supabase query helper
 *
 * Supabase's auto-generated types require running `supabase gen types` against
 * a live project. Since our Database type stubs are minimal, we use this helper
 * to get typed query results without hitting "never" on Insert/Update operations.
 *
 * Usage:
 *   const { data, error } = await db('grn').select('id,grn_no').eq('client_id','WH')
 *   const { error } = await db('items').insert({ item_name: '...' })
 *   const { error } = await db('items').update({ status:'Active' }).eq('id', id)
 */
import { supabase } from './supabase'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBuilder = PostgrestFilterBuilder<any, any, any, any, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from(table) as any) as AnyBuilder
}

// Convenience typed result wrapper used in all pages
export interface DbResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}
