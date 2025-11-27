import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // Try to get session, with a small retry if not immediately available
  let session = null;
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
    if (session?.access_token) break;
    // Wait a bit before retry
    if (i < 2) await new Promise(r => setTimeout(r, 100));
  }
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  } else {
    console.warn('API request without auth token - session may not be ready');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  created_at?: string;
}

export interface Symptom {
  id: number;
  user_id: string;
  name?: string;
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  frequency?: string;
  first_occurred_at?: string;
  last_occurred_at?: string;
  is_ongoing: boolean;
  is_chronic?: boolean;
  is_flagged: boolean;
  flagged_reason?: string;
  created_at: string;
}

export interface RiskFlag {
  id: number;
  user_id: string;
  symptom_id?: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  flag_type: string;
  description: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  summary: string;
  detailed_report?: string;
  priority: 'low' | 'moderate' | 'high';
  created_at: string;
  sent_to_doctor: boolean;
  doctor_email?: string;
}

export interface DashboardStats {
  activeSymptoms: number;
  totalSymptoms: number;
  riskFlags: number;
  recentSymptoms: Symptom[];
  unresolvedFlags: RiskFlag[];
}

export const chatAPI = {
  getChatHistory: async (limit: number = 50): Promise<{ messages: ChatMessage[] }> => {
    const response = await api.get(`/chat/history?limit=${limit}`);
    return response.data;
  },

  sendMessage: async (message: string): Promise<{ 
    message: string; 
    timestamp: string; 
    extractedSymptoms?: any[];
    urgencyLevel?: string;
    requiresImmediateAttention?: boolean;
  }> => {
    const response = await api.post('/chat/send', { message });
    return response.data;
  },

  clearHistory: async (): Promise<void> => {
    await api.delete('/chat/history');
  },
};

export const symptomAPI = {
  getSymptoms: async (limit: number = 100): Promise<{ symptoms: Symptom[] }> => {
    const response = await api.get(`/symptoms?limit=${limit}`);
    return response.data;
  },

  getSymptomById: async (id: number): Promise<{ symptom: Symptom }> => {
    const response = await api.get(`/symptoms/${id}`);
    return response.data;
  },

  updateSymptom: async (id: number, data: Partial<Symptom>): Promise<{ symptom: Symptom }> => {
    const response = await api.patch(`/symptoms/${id}`, data);
    return response.data;
  },

  deleteSymptom: async (id: number): Promise<void> => {
    await api.delete(`/symptoms/${id}`);
  },

  resolveSymptom: async (id: number): Promise<{ symptom: Symptom }> => {
    const response = await api.patch(`/symptoms/${id}/resolve`);
    return response.data;
  },
};

export const riskAPI = {
  getFlags: async (): Promise<{ flags: RiskFlag[] }> => {
    const response = await api.get('/risks');
    return response.data;
  },

  acknowledgeFlag: async (id: number): Promise<void> => {
    await api.patch(`/risks/${id}/acknowledge`);
  },
};

export const reportAPI = {
  getReports: async (): Promise<{ reports: Report[] }> => {
    const response = await api.get('/reports');
    return response.data;
  },

  getReportById: async (id: number): Promise<{ report: Report; symptoms: Symptom[] }> => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  generateReport: async (): Promise<{ report?: Report; message?: string; sentToDoctor?: boolean }> => {
    const response = await api.post('/reports/generate');
    return response.data;
  },
};

export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};

export const userProfileAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },
};

export default api;
