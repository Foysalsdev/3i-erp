import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const SUPABASE_URL      = "https://ludfmwfifrnzgvffteyw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGZtd2ZpZnJuemd2ZmZ0ZXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDE5MDQsImV4cCI6MjA5NjQ3NzkwNH0.BLbQocfNcBMPytLuIwtvrJbA_pXW6SDCfp6WjuJ0grA"

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         '3i-erp-auth',   // stable key across PWA restarts
      storage:            localStorage,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: {
      headers: { 'x-app-version': '3.0.0' },
    },
  }
)
