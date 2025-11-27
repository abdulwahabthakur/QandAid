import { Request } from 'express';

export interface User {
  id: string; // UUID from Supabase Auth
  email: string;
  name?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  phone?: string;
  
  smoker?: string;
  smoking_frequency?: string;
  alcohol_consumption?: string;
  exercise_frequency?: string;
  
  medications?: string;
  diagnoses?: string;
  allergies?: string;
  past_surgeries?: string;
  family_history?: string;
  
  doctor_name?: string;
  doctor_email?: string;
  doctor_phone?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string; // UUID
    email: string;
  };
  accessToken?: string;
}

export interface ChatMessage {
  id?: number;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface Symptom {
  id?: number;
  user_id: string;
  name?: string;
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  frequency?: string;
  triggers?: string;
  
  first_occurred_at?: string;
  last_occurred_at?: string;
  
  is_ongoing?: boolean;
  is_chronic?: boolean;
  is_resolved?: boolean;
  resolved_at?: string;
  
  is_flagged?: boolean;
  flagged_reason?: string;
  flag_severity?: 'low' | 'moderate' | 'high' | 'critical';
  
  created_at?: string;
  updated_at?: string;
}

export interface RiskFlag {
  id?: number;
  user_id: string;
  symptom_id?: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  flag_type: string;
  description: string;
  is_acknowledged?: boolean;
  acknowledged_at?: string;
  created_at?: string;
}

export interface MedicalReport {
  id?: number;
  user_id: string;
  title: string;
  summary: string;
  detailed_report?: string;
  priority: 'low' | 'moderate' | 'high';
  symptoms_included?: number[];
  recommendations?: string;
  
  sent_to_doctor?: boolean;
  sent_at?: string;
  doctor_email?: string;
  doctor_phone?: string;
  sms_sent?: boolean;
  
  created_at?: string;
}

export interface UserProfile {
  id: string; // Same as auth.users.id
  email: string;
  name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  phone?: string;
  
  smoker?: string;
  smoking_frequency?: string;
  alcohol_consumption?: string;
  exercise_frequency?: string;
  
  medications?: string;
  diagnoses?: string;
  allergies?: string;
  past_surgeries?: string;
  family_history?: string;
  
  doctor_name?: string;
  doctor_email?: string;
  doctor_phone?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface SymptomExtractionResult {
  hasSymptoms: boolean;
  symptoms: ExtractedSymptom[];
  urgencyLevel: 'low' | 'moderate' | 'high' | 'critical';
  requiresImmediateAttention: boolean;
}

export interface ExtractedSymptom {
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration?: string;
  frequency?: string;
  triggers?: string[];
  isOngoing: boolean;
  firstOccurredAt?: string;
}

export interface ReportAnalysis {
  shouldGenerateReport: boolean;
  priority: 'low' | 'moderate' | 'high';
  summary: string;
  recommendations: string[];
}
