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
      gyms: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          logo_url: string | null
          gst_number: string | null
          primary_color: string
          secondary_color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          logo_url?: string | null
          gst_number?: string | null
          primary_color?: string
          secondary_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          logo_url?: string | null
          gst_number?: string | null
          primary_color?: string
          secondary_color?: string
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          gym_id: string
          name: string
          phone: string
          dob: string | null
          plan_type: 'Monthly' | 'Quarterly' | 'Yearly'
          start_date: string
          end_date: string
          amount: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          name: string
          phone: string
          dob?: string | null
          plan_type: 'Monthly' | 'Quarterly' | 'Yearly'
          start_date: string
          end_date: string
          amount: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          name?: string
          phone?: string
          dob?: string | null
          plan_type?: 'Monthly' | 'Quarterly' | 'Yearly'
          start_date?: string
          end_date?: string
          amount?: number
          is_active?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          gym_id: string
          member_id: string
          invoice_number: string
          amount: number
          date: string
          payment_status: 'Paid' | 'Pending' | 'Overdue'
          created_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          member_id: string
          invoice_number: string
          amount: number
          date?: string
          payment_status?: 'Paid' | 'Pending' | 'Overdue'
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          member_id?: string
          invoice_number?: string
          amount?: number
          date?: string
          payment_status?: 'Paid' | 'Pending' | 'Overdue'
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          gym_id: string
          name: string
          base_price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          name: string
          base_price: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          name?: string
          base_price?: number
          is_active?: boolean
          created_at?: string
        }
      }
      member_services: {
        Row: {
          id: string
          member_id: string
          service_id: string
          start_date: string
          end_date: string
          amount: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          service_id: string
          start_date: string
          end_date: string
          amount: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          service_id?: string
          start_date?: string
          end_date?: string
          amount?: number
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}
