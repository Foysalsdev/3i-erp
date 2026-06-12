import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase as _supabase } from '@/lib/supabase'

// Cast to any to bypass generated type mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = _supabase as any

export { useQuery, useMutation, useQueryClient }

// Standard stale time for master data (5 min)
export const MASTERS_STALE = 5 * 60 * 1000
// Standard stale time for transactions (30 sec)
export const TRANS_STALE   = 30 * 1000
