/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// anon key is a PUBLIC key — safe to commit (RLS protects all data)
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      || 'https://ludfmwfifrnzgvffteyw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGZtd2ZpZnJuemd2ZmZ0ZXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDE5MDQsImV4cCI6MjA5NjQ3NzkwNH0.BLbQocfNcBMPytLuIwtvrJbA_pXW6SDCfp6WjuJ0grA'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
