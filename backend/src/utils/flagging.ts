import { SupabaseClient } from '@supabase/supabase-js';
import { Symptom } from '../types';

interface FlaggingResult {
  shouldFlag: boolean;
  reason?: string;
  severity: 'low' | 'moderate' | 'high';
}

const RED_FLAG_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'severe headache', 'sudden vision',
  'difficulty breathing', 'shortness of breath', 'blood in stool', 'blood in urine',
  'coughing blood', 'severe abdominal pain', 'loss of consciousness', 'seizure',
  'suicide', 'suicidal', 'severe bleeding', 'anaphylaxis'
];

const CHRONIC_KEYWORDS = [
  'recurring', 'chronic', 'persistent', 'constant', 'ongoing', 'weeks', 'months',
  'getting worse', 'worsening', 'not improving'
];

export const analyzeSymptomsForFlagging = async (
  userId: string,
  supabase: SupabaseClient
): Promise<FlaggingResult> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: symptoms, error } = await supabase
      .from('symptoms')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    if (error || !symptoms || symptoms.length === 0) {
      return { shouldFlag: false, severity: 'low' };
    }

    const latestSymptom = symptoms[0];
    const description = latestSymptom.description.toLowerCase();

    for (const keyword of RED_FLAG_KEYWORDS) {
      if (description.includes(keyword)) {
        return {
          shouldFlag: true,
          reason: `Red flag symptom detected: ${keyword}. Immediate medical attention recommended.`,
          severity: 'high',
        };
      }
    }

    const similarSymptoms = symptoms.filter((s: Symptom) => {
      const similarity = calculateSimilarity(description, s.description.toLowerCase());
      return similarity > 0.5;
    });

    if (similarSymptoms.length >= 3) {
      return {
        shouldFlag: true,
        reason: `Recurring symptom detected (${similarSymptoms.length} times in 30 days). Consider medical evaluation.`,
        severity: 'moderate',
      };
    }

    for (const keyword of CHRONIC_KEYWORDS) {
      if (description.includes(keyword)) {
        return {
          shouldFlag: true,
          reason: `Chronic or worsening symptom indicated. Medical evaluation recommended.`,
          severity: 'moderate',
        };
      }
    }

    if (latestSymptom.severity === 'severe') {
      return {
        shouldFlag: true,
        reason: 'Severe symptom reported. Consider medical evaluation.',
        severity: 'moderate',
      };
    }

    if (latestSymptom.first_occurred_at) {
      const firstDate = new Date(latestSymptom.first_occurred_at);
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      if (firstDate < threeMonthsAgo && latestSymptom.is_ongoing !== false) {
        return {
          shouldFlag: true,
          reason: 'Chronic symptom (> 3 months). Long-term management may be needed.',
          severity: 'moderate',
        };
      }
    }

    return { shouldFlag: false, severity: 'low' };
  } catch (error) {
    console.error('Flagging analysis error:', error);
    return { shouldFlag: false, severity: 'low' };
  }
};

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}
