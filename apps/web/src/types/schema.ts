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
      users: {
        Row: {
          id: string
          trust_score: number
          created_at: string
        }
        Insert: {
          id?: string
          trust_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          trust_score?: number
          created_at?: string
        }
      }
      user_places: {
        Row: {
          id: string
          user_id: string
          label: string
          lat: number
          lng: number
          radius_m: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          lat: number
          lng: number
          radius_m?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          lat?: number
          lng?: number
          radius_m?: number
          is_active?: boolean
          created_at?: string
        }
      }
      signals: {
        Row: {
          id: string
          source: 'user_report' | 'social_media' | 'news' | 'sensor'
          text: string | null
          lat: number
          lng: number
          media_url: string | null
          media_type: 'image' | 'video' | null
          city_hint: string | null
          created_at: string
          raw_payload: Json | null
        }
        Insert: {
          id?: string
          source: 'user_report' | 'social_media' | 'news' | 'sensor'
          text?: string | null
          lat: number
          lng: number
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          city_hint?: string | null
          created_at?: string
          raw_payload?: Json | null
        }
        Update: {
          id?: string
          source?: 'user_report' | 'social_media' | 'news' | 'sensor'
          text?: string | null
          lat?: number
          lng?: number
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          city_hint?: string | null
          created_at?: string
          raw_payload?: Json | null
        }
      }
      clusters: {
        Row: {
          id: string
          city: string
          event_type_guess: string | null
          time_start: string
          time_end: string
          status: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          city: string
          event_type_guess?: string | null
          time_start: string
          time_end: string
          status: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          city?: string
          event_type_guess?: string | null
          time_start?: string
          time_end?: string
          status?: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          cluster_id: string
          event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'power_outage' | 'other'
          severity: 'low' | 'medium' | 'high' | null
          confidence_score: number | null
          status: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cluster_id: string
          event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'power_outage' | 'other'
          severity?: 'low' | 'medium' | 'high' | null
          confidence_score?: number | null
          status: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string
          event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'power_outage' | 'other'
          severity?: 'low' | 'medium' | 'high' | null
          confidence_score?: number | null
          status?: 'monitor' | 'alert' | 'suppress' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
      cluster_signals: {
          Row: {
              cluster_id: string
              signal_id: string
          }
          Insert: {
              cluster_id: string
              signal_id: string
          }
          Update: {
              cluster_id?: string
              signal_id?: string
          }
      }
      incident_signals: {
          Row: {
              incident_id: string
              signal_id: string
          }
          Insert: {
              incident_id: string
              signal_id: string
          }
          Update: {
              incident_id?: string
              signal_id?: string
          }
      }
      verifications: {
          Row: {
              id: string
              incident_id: string
              user_id: string
              type: 'confirm' | 'still_happening' | 'false' | 'resolved'
              created_at: string
          }
          Insert: {
              id?: string
              incident_id: string
              user_id: string
              type: 'confirm' | 'still_happening' | 'false' | 'resolved'
              created_at?: string
          }
          Update: {
               id?: string
               incident_id?: string
               user_id?: string
               type?: 'confirm' | 'still_happening' | 'false' | 'resolved'
               created_at?: string
          }
      }
    }
  }
}
