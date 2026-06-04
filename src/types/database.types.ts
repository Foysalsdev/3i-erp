// Minimal Supabase types — actual types come from DB at runtime via any-cast
// Full auto-generated types: run `supabase gen types typescript` after linking project

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export interface Database {
  public: {
    Tables: {
      [tableName: string]: {
        Row:    AnyRecord
        Insert: AnyRecord
        Update: Partial<AnyRecord>
      }
    }
    Functions: {
      generate_doc_no: {
        Args: { p_module: string; p_client: string; p_year: number }
        Returns: string
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      has_permission: {
        Args: { p_module: string; p_action: string }
        Returns: boolean
      }
      get_accessible_clients: {
        Args: Record<string, never>
        Returns: string[]
      }
      get_db_size: {
        Args: Record<string, never>
        Returns: string
      }
      reserve_stock_for_so: {
        Args: { p_so_id: string }
        Returns: Json
      }
    }
  }
}
