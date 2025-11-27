import axios from 'axios';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

interface Symptom {
  id?: number;
  name: string;
  description?: string;
  severity: string;
  duration_days: number;
  frequency?: string;
  is_flagged?: boolean;
  first_occurred_at?: string;
  last_occurred_at?: string;
}

interface MedicalHistory {
  age?: number;
  gender?: string;
  chronic_conditions: string[];
  current_medications: string[];
  allergies: string[];
  smoking_status?: string;
  family_history: string[];
}

interface PatternInfo {
  pattern_name: string;
  description: string;
  confidence: number;
  related_symptoms: string[];
}

interface AnalysisResponse {
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  patterns: PatternInfo[];
  recommendations: string[];
  urgency_level: string;
  should_notify_doctor: boolean;
}


const convertSymptom = (symptom: any): Symptom => {
  let durationDays = 0;
  if (symptom.first_occurred_at) {
    const firstDate = new Date(symptom.first_occurred_at);
    const now = new Date();
    durationDays = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  } else if (symptom.duration) {
    const match = symptom.duration.match(/(\d+)\s*(days?|weeks?|months?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('week')) durationDays = value * 7;
      else if (unit.startsWith('month')) durationDays = value * 30;
      else durationDays = value;
    }
  }

  return {
    id: symptom.id,
    name: symptom.name || symptom.description?.split(' ').slice(0, 3).join(' ') || 'Unknown',
    description: symptom.description,
    severity: symptom.severity || 'mild',
    duration_days: durationDays,
    frequency: symptom.frequency,
    is_flagged: symptom.is_flagged,
    first_occurred_at: symptom.first_occurred_at,
    last_occurred_at: symptom.last_occurred_at,
  };
};


const convertMedicalHistory = (profile: any): MedicalHistory => {
  let medications: string[] = [];
  if (profile.medications) {
    try {
      const parsed = JSON.parse(profile.medications);
      medications = parsed.map((m: any) => m.name || m);
    } catch {
      medications = profile.medications.split(',').map((m: string) => m.trim());
    }
  }

  return {
    age: profile.age,
    gender: profile.gender,
    chronic_conditions: profile.diagnoses?.split(',').map((d: string) => d.trim()).filter(Boolean) || [],
    current_medications: medications,
    allergies: profile.allergies?.split(',').map((a: string) => a.trim()).filter(Boolean) || [],
    smoking_status: profile.smoker,
    family_history: profile.family_history?.split(',').map((f: string) => f.trim()).filter(Boolean) || [],
  };
};


export const checkPythonServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 2000 });
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
};


export const analyzeSymptomWithML = async (
  symptoms: any[],
  userProfile: any
): Promise<AnalysisResponse | null> => {
  try {
    const isAvailable = await checkPythonServiceHealth();
    if (!isAvailable) {
      console.log('Python ML service not available, skipping ML analysis');
      return null;
    }

    const convertedSymptoms = symptoms.map(convertSymptom);
    const medicalHistory = convertMedicalHistory(userProfile);

    const response = await axios.post<AnalysisResponse>(
      `${PYTHON_SERVICE_URL}/analyze-symptoms`,
      {
        symptoms: convertedSymptoms,
        medical_history: medicalHistory,
      },
      { timeout: 10000 }
    );

    return response.data;
  } catch (error) {
    console.error('Python ML service error:', error);
    return null;
  }
};


export const detectPatterns = async (symptoms: any[]): Promise<PatternInfo[]> => {
  try {
    const isAvailable = await checkPythonServiceHealth();
    if (!isAvailable) return [];

    const convertedSymptoms = symptoms.map(convertSymptom);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/detect-patterns`,
      convertedSymptoms,
      { timeout: 5000 }
    );

    return response.data.patterns || [];
  } catch (error) {
    console.error('Pattern detection error:', error);
    return [];
  }
};


export const calculateMLRiskScore = async (
  symptoms: any[],
  userProfile: any
): Promise<{ risk_score: number; risk_level: string } | null> => {
  try {
    const isAvailable = await checkPythonServiceHealth();
    if (!isAvailable) return null;

    const convertedSymptoms = symptoms.map(convertSymptom);
    const medicalHistory = convertMedicalHistory(userProfile);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/calculate-risk`,
      {
        symptoms: convertedSymptoms,
        medical_history: medicalHistory,
      },
      { timeout: 5000 }
    );

    return {
      risk_score: response.data.risk_score,
      risk_level: response.data.risk_level,
    };
  } catch (error) {
    console.error('Risk calculation error:', error);
    return null;
  }
};

