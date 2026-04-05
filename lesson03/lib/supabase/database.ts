export type Database = {
  public: {
    Tables: {
      user_credits: {
        Row: {
          user_id: string
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      ensure_user_credits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consume_credit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      temporarily_refill_credits_on_login_if_empty: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
