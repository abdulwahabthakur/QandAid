export interface User {
  id: number;
  email: string;
  name: string;
  age?: number;
  blood_type?: string;
  smoker?: string;
  smoking_frequency?: string;
  medications?: string;
  diagnoses?: string;
  allergies?: string;
  doctor_email?: string;
  doctor_phone?: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Symptom {
  id: number;
  description: string;
  severity?: string;
  duration?: string;
  frequency?: string;
  is_flagged: boolean;
  flagged_reason?: string;
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  summary: string;
  priority: 'low' | 'moderate' | 'high';
  sent_to_doctor: boolean;
  doctor_email?: string;
  created_at: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  age?: number;
  blood_type?: string;
  smoker?: string;
  smoking_frequency?: string;
  medications?: string;
  diagnoses?: string;
  allergies?: string;
  doctor_email?: string;
  doctor_phone?: string;
}