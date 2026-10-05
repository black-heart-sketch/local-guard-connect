
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
      emergency_logs: {
        Row: {
          id: string
          user_id: string
          emergency_type: string
          status: string
          location_data: Json | null
          video_path: string | null
          stream_size: number | null
          recording_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          emergency_type?: string
          status?: string
          location_data?: Json | null
          video_path?: string | null
          stream_size?: number | null
          recording_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          emergency_type?: string
          status?: string
          location_data?: Json | null
          video_path?: string | null
          stream_size?: number | null
          recording_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: 'general' | 'registered' | 'targeted'
          target_user_id: string | null
          sender_id: string
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: 'general' | 'registered' | 'targeted'
          target_user_id?: string | null
          sender_id: string
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: 'general' | 'registered' | 'targeted'
          target_user_id?: string | null
          sender_id?: string
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          location: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          location?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          location?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      community_posts: {
        Row: {
          id: string
          created_at: string
          title: string
          content: string
          author_id: string
          category: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          content: string
          author_id: string
          category?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          content?: string
          author_id?: string
          category?: string | null
        }
      }
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
      community_comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
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
