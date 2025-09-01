
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
      reports: {
        Row: {
          id: string
          crime_type: string
          location: string
          description: string
          attachments: Json
          is_anonymous: boolean
          user_id: string | null
          user_email: string | null
          coordinates: Json | null
          status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          crime_type: string
          location: string
          description: string
          attachments: Json
          is_anonymous: boolean
          user_id?: string | null
          user_email?: string | null
          coordinates?: Json | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          created_at?: string
          updated_at?: string | null
        }
Update: {
          id?: string
          crime_type?: string
          location?: string
          description?: string
          attachments?: Json
          is_anonymous?: boolean
          user_id?: string | null
          user_email?: string | null
          coordinates?: Json | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'rejected'
          created_at?: string
          updated_at?: string | null
        }
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
