export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface User {
  id: string
  trust_score: number
  created_at: string
}

export interface UserInsert {
  id?: string
  trust_score?: number
  created_at?: string
}

export interface UserUpdate {
  id?: string
  trust_score?: number
  created_at?: string
}

export interface UserPlace {
  id: string
  user_id: string
  label: string
  lat: number
  lng: number
  radius_m: number
  is_active: boolean
  created_at: string
}

export interface UserPlaceInsert {
  id?: string
  user_id: string
  label: string
  lat: number
  lng: number
  radius_m?: number
  is_active?: boolean
  created_at?: string
}

export interface UserPlaceUpdate {
  id?: string
  user_id?: string
  label?: string
  lat?: number
  lng?: number
  radius_m?: number
  is_active?: boolean
  created_at?: string
}

export interface Signal {
  id: string
  source: 'user_report' | 'social_media' | 'news' | 'sensor' | 'bmkg'
  text: string | null
  lat: number
  lng: number
  media_url: string | null
  media_type: 'image' | 'video' | null
  city_hint: string | null
  created_at: string
  raw_payload: Json | null
}

export interface SignalInsert {
  id?: string
  source: 'user_report' | 'social_media' | 'news' | 'sensor' | 'bmkg'
  text?: string | null
  lat: number
  lng: number
  media_url?: string | null
  media_type?: 'image' | 'video' | null
  city_hint?: string | null
  created_at?: string
  raw_payload?: Json | null
}

export interface SignalUpdate {
  id?: string
  source?: 'user_report' | 'social_media' | 'news' | 'sensor' | 'bmkg'
  text?: string | null
  lat?: number
  lng?: number
  media_url?: string | null
  media_type?: 'image' | 'video' | null
  city_hint?: string | null
  created_at?: string
  raw_payload?: Json | null
}

export interface Cluster {
  id: string
  city: string
  event_type_guess: string | null
  time_start: string
  time_end: string
  status: 'monitor' | 'alert' | 'suppress' | 'resolved'
  created_at: string
  updated_at: string
}

export interface ClusterInsert {
  id?: string
  city: string
  event_type_guess?: string | null
  time_start: string
  time_end: string
  status: 'monitor' | 'alert' | 'suppress' | 'resolved'
  created_at?: string
  updated_at?: string
}

export interface ClusterUpdate {
  id?: string
  city?: string
  event_type_guess?: string | null
  time_start?: string
  time_end?: string
  status?: 'monitor' | 'alert' | 'suppress' | 'resolved'
  created_at?: string
  updated_at?: string
}

export interface Incident {
  id: string
  cluster_id: string
  event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'whirlwind' | 'tornado' | 'volcano' | 'tsunami' | 'other'
  severity: 'low' | 'medium' | 'high' | null
  confidence_score: number | null
  status: 'monitor' | 'alert' | 'suppress' | 'resolved'
  summary: string | null
  created_at: string
  updated_at: string
}

export interface IncidentInsert {
  id?: string
  cluster_id: string
  event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'whirlwind' | 'tornado' | 'volcano' | 'tsunami' | 'other'
  severity?: 'low' | 'medium' | 'high' | null
  confidence_score?: number | null
  status: 'monitor' | 'alert' | 'suppress' | 'resolved'
  summary?: string | null
  created_at?: string
  updated_at?: string
}

export interface IncidentUpdate {
  id?: string
  cluster_id?: string
  event_type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'power_outage' | 'other'
  severity?: 'low' | 'medium' | 'high' | null
  confidence_score?: number | null
  status?: 'monitor' | 'alert' | 'suppress' | 'resolved'
  summary?: string | null
  created_at?: string
  updated_at?: string
}

export interface ClusterSignal {
  cluster_id: string
  signal_id: string
}

export interface ClusterSignalInsert {
  cluster_id: string
  signal_id: string
}

export interface ClusterSignalUpdate {
  cluster_id?: string
  signal_id?: string
}

export interface IncidentSignal {
  incident_id: string
  signal_id: string
}

export interface IncidentSignalInsert {
  incident_id: string
  signal_id: string
}

export interface IncidentSignalUpdate {
  incident_id?: string
  signal_id?: string
}

export interface Verification {
  id: string
  incident_id: string
  user_id: string
  type: 'confirm' | 'still_happening' | 'false' | 'resolved'
  created_at: string
}

export interface VerificationInsert {
  id?: string
  incident_id: string
  user_id: string
  type: 'confirm' | 'still_happening' | 'false' | 'resolved'
  created_at?: string
}


export interface VerificationUpdate {
  id?: string
  incident_id?: string
  user_id?: string
  type?: 'confirm' | 'still_happening' | 'false' | 'resolved'
  created_at?: string
}

export interface AgentTrace {
  id: string
  session_id: string
  cluster_id: string | null
  incident_id: string | null
  step: string;
  input_context: Json;
  output_result: Json;
  model_used: string;
  created_at: string;
}

export interface AgentTraceInsert {
  id?: string
  session_id: string
  cluster_id?: string | null
  incident_id?: string | null
  step: string;
  input_context: Json;
  output_result: Json;
  model_used: string;
  created_at?: string;
}

export interface AgentTraceUpdate {
  id?: string
  session_id?: string
  cluster_id?: string | null
  incident_id?: string | null
  step?: string;
  input_context?: Json;
  output_result?: Json;
  model_used?: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      user_places: {
        Row: UserPlace
        Insert: UserPlaceInsert
        Update: UserPlaceUpdate
      }
      signals: {
        Row: Signal
        Insert: SignalInsert
        Update: SignalUpdate
      }
      clusters: {
        Row: Cluster
        Insert: ClusterInsert
        Update: ClusterUpdate
      }
      incidents: {
        Row: Incident
        Insert: IncidentInsert
        Update: IncidentUpdate
      }
      cluster_signals: {
        Row: ClusterSignal
        Insert: ClusterSignalInsert
        Update: ClusterSignalUpdate
      }
      incident_signals: {
        Row: IncidentSignal
        Insert: IncidentSignalInsert
        Update: IncidentSignalUpdate
      }
      verifications: {
        Row: Verification
        Insert: VerificationInsert
        Update: VerificationUpdate
      }
      agent_traces: {
        Row: AgentTrace
        Insert: AgentTraceInsert
        Update: AgentTraceUpdate
      }
    }
  }
}
