export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          billed_at: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          interval: string | null
          name: string
          price: number | null
          start_date: string
          user_id: string
        }
        Insert: {
          billed_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          interval?: string | null
          name: string
          price?: number | null
          start_date: string
          user_id: string
        }
        Update: {
          billed_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          interval?: string | null
          name?: string
          price?: number | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
