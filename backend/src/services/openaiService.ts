import OpenAI from 'openai';
import { ChatMessage, User } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatContext {
  userProfile: Partial<User>;
  conversationHistory: ChatMessage[];
  currentMessage: string;
}

interface MedicalContext {
  age?: number;
  chronicConditions: string[];
  currentMedications: { name: string; dosage?: string; frequency?: string }[];
  allergies: string[];
  smokingStatus?: string;
}

const parseMedicalContext = (profile: Partial<User>): MedicalContext => {
  let medications: { name: string; dosage?: string; frequency?: string }[] = [];
  
  if (profile.medications) {
    try {
      medications = JSON.parse(profile.medications);
    } catch {
      medications = profile.medications.split(',').map(m => ({ name: m.trim() }));
    }
  }

  return {
    age: profile.age,
    chronicConditions: profile.diagnoses?.split(',').map(d => d.trim()).filter(Boolean) || [],
    currentMedications: medications,
    allergies: profile.allergies?.split(',').map(a => a.trim()).filter(Boolean) || [],
    smokingStatus: profile.smoker,
  };
};

const buildSystemPrompt = (profile: Partial<User>): string => {
  const context = parseMedicalContext(profile);
  
  return `You are a compassionate and professional medical symptom tracking assistant for Q&Aid. Your role is to help patients document and track their health symptoms accurately.

## CRITICAL RULES

1. **ONLY discuss health-related topics**: symptoms, medical conditions, wellness, and health concerns.
2. **If the user asks about non-health topics**, politely redirect:
   - "I'm here specifically to help track your health symptoms. Is there anything health-related I can help you with?"
   - "Let's focus on your health. Do you have any symptoms or health concerns you'd like to discuss?"
3. **NEVER diagnose conditions** - only gather information and track symptoms.
4. **NEVER recommend specific treatments or medications** - only encourage consulting healthcare providers.

## YOUR RESPONSIBILITIES

1. Listen empathetically to symptom descriptions
2. Ask clarifying questions about:
   - **When did it start?** (duration)
   - **How severe is it?** (mild/moderate/severe)
   - **How often does it occur?** (frequency)
   - **Any triggers or patterns?**
   - **Any associated symptoms?**
3. Acknowledge and validate their concerns
4. Reference their medical history when relevant
5. Only suggest seeing a doctor for:
   - Severe symptoms
   - Chronic symptoms (lasting > 3 months)
   - Rapidly worsening conditions
   - Red flag symptoms (chest pain, breathing difficulty, etc.)

## MARKDOWN FORMATTING - REQUIRED

You MUST format ALL responses using Markdown:
- Use **bold** for important terms and emphasis
- Use *italic* for mild emphasis
- Use bullet points (- ) for lists of questions or information
- Use ### headers to organize sections when appropriate
- Use > blockquotes for important warnings or notes
- Keep formatting clean and readable

## Patient Medical Context

- **Name:** ${profile.name || 'Patient'}
- **Age:** ${context.age || 'Not provided'}
- **Blood Type:** ${profile.blood_type || 'Not provided'}
- **Smoking Status:** ${context.smokingStatus || 'Not provided'}
- **Chronic Conditions:** ${context.chronicConditions.length > 0 ? context.chronicConditions.join(', ') : 'None reported'}
- **Current Medications:** ${context.currentMedications.length > 0 ? context.currentMedications.map(m => m.name).join(', ') : 'None reported'}
- **Allergies:** ${context.allergies.length > 0 ? context.allergies.join(', ') : 'None reported'}

## Example Response Format

### Understanding Your Symptom

Thank you for sharing that you're experiencing a **headache**. I'd like to gather more details to track this properly.

**Could you tell me:**
- **When did it start?** (e.g., today, a few days ago)
- **How would you rate the severity?** (mild, moderate, or severe)
- **Where is the pain located?** (forehead, temples, back of head)
- **Any triggers you've noticed?** (stress, lack of sleep, certain foods)

> **Note:** If you're experiencing sudden severe headache, vision changes, or confusion, please seek immediate medical attention.

---

Remember: Be warm, professional, and focused on helping the patient document their health journey.`;
};

export const generateChatResponse = async (context: ChatContext): Promise<string> => {
  try {
    const systemPrompt = buildSystemPrompt(context.userProfile);
    
    const messages = context.conversationHistory.slice(-20).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    messages.push({ role: 'user', content: context.currentMessage });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return completion.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate response');
  }
};

interface ExtractedSymptom {
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration?: string;
  frequency?: string;
  triggers?: string[];
  isOngoing: boolean;
  firstOccurredAt?: string;
}

interface SymptomExtractionResult {
  hasSymptoms: boolean;
  symptoms: ExtractedSymptom[];
  urgencyLevel: 'low' | 'moderate' | 'high' | 'critical';
  requiresImmediateAttention: boolean;
}

export const extractSymptomInfo = async (
  message: string,
  userProfile: Partial<User>
): Promise<SymptomExtractionResult> => {
  try {
    const prompt = `Analyze this patient message and extract structured symptom information. Return ONLY valid JSON.

Patient Context:
- Age: ${userProfile.age || 'unknown'}
- Known Conditions: ${userProfile.diagnoses || 'none'}
- Medications: ${userProfile.medications || 'none'}

Patient Message: "${message}"

Instructions:
1. Extract ALL symptoms mentioned (even implied ones)
2. Parse duration strings like "for 3 days", "since Monday", "2 weeks ago"
3. Identify severity based on descriptive words (throbbing, sharp, mild, severe, etc.)
4. Flag if immediate medical attention may be needed

RED FLAG SYMPTOMS (requiresImmediateAttention = true):
- Chest pain, heart-related symptoms
- Difficulty breathing, shortness of breath
- Sudden severe headache, "worst headache of my life"
- Signs of stroke (face drooping, arm weakness, speech difficulty)
- Severe bleeding, blood in stool/urine/cough
- Loss of consciousness, seizures
- Severe allergic reactions
- Suicidal thoughts

Return JSON:
{
  "hasSymptoms": boolean,
  "symptoms": [
    {
      "name": "symptom name (e.g., headache, nausea, fatigue)",
      "description": "full description from patient",
      "severity": "mild|moderate|severe",
      "duration": "parsed duration (e.g., '3 days', '2 weeks')",
      "frequency": "how often (e.g., 'constant', 'intermittent', 'occasional')",
      "triggers": ["list", "of", "triggers"],
      "isOngoing": boolean,
      "firstOccurredAt": "ISO date string if determinable, null otherwise"
    }
  ],
  "urgencyLevel": "low|moderate|high|critical",
  "requiresImmediateAttention": boolean
}

If no symptoms are mentioned, return:
{"hasSymptoms": false, "symptoms": [], "urgencyLevel": "low", "requiresImmediateAttention": false}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '{"hasSymptoms":false,"symptoms":[],"urgencyLevel":"low","requiresImmediateAttention":false}';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return { hasSymptoms: false, symptoms: [], urgencyLevel: 'low', requiresImmediateAttention: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      hasSymptoms: parsed.hasSymptoms || false,
      symptoms: parsed.symptoms || [],
      urgencyLevel: parsed.urgencyLevel || 'low',
      requiresImmediateAttention: parsed.requiresImmediateAttention || false,
    };
  } catch (error) {
    console.error('Symptom extraction error:', error);
    return { hasSymptoms: false, symptoms: [], urgencyLevel: 'low', requiresImmediateAttention: false };
  }
};

export const analyzeForReport = async (
  symptoms: any[],
  userProfile: Partial<User>
): Promise<{
  shouldGenerateReport: boolean;
  priority: 'low' | 'moderate' | 'high';
  summary: string;
  recommendations: string[];
}> => {
  try {
    const symptomsList = symptoms.map((s, i) => 
      `${i + 1}. ${s.description} (Severity: ${s.severity || 'unknown'}, Date: ${new Date(s.created_at).toLocaleDateString()}, Flagged: ${s.is_flagged ? 'Yes - ' + s.flagged_reason : 'No'})`
    ).join('\n');

    const prompt = `Analyze if a medical report should be generated for this patient. Return ONLY valid JSON.

## Patient Profile
- Name: ${userProfile.name}
- Age: ${userProfile.age || 'unknown'}
- Smoking Status: ${userProfile.smoker || 'Unknown'}
- Known Conditions: ${userProfile.diagnoses || 'None'}
- Current Medications: ${userProfile.medications || 'None'}
- Allergies: ${userProfile.allergies || 'None'}

## Recent Symptoms (Last 30 Days)
${symptomsList}

## Report Generation Criteria
Generate a report if ANY of these are true:
1. Severe symptoms present
2. 3+ recurring similar symptoms (indicates chronic/recurring condition)
3. Red flag symptoms: chest pain, breathing difficulty, severe headache, blood in stool/urine, vision changes
4. Symptoms worsening over time
5. Symptoms that may interact with existing conditions/medications
6. Chronic symptoms lasting > 3 months

## Priority Levels
- LOW: Routine check-up recommended within 2 weeks
- MODERATE: Appointment needed within 1 week
- HIGH: Urgent - attention needed within 24-48 hours

Return JSON:
{
  "shouldGenerateReport": boolean,
  "priority": "low|moderate|high",
  "summary": "2-3 sentence executive summary for the doctor",
  "recommendations": ["specific action 1", "specific action 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        shouldGenerateReport: false,
        priority: 'low',
        summary: 'Unable to analyze symptoms',
        recommendations: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      shouldGenerateReport: parsed.shouldGenerateReport || false,
      priority: parsed.priority || 'low',
      summary: parsed.summary || 'No significant concerns identified.',
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('Report analysis error:', error);
    return {
      shouldGenerateReport: false,
      priority: 'low',
      summary: 'Error analyzing symptoms',
      recommendations: [],
    };
  }
};

export const generateDetailedReport = async (
  symptoms: any[],
  userProfile: Partial<User>,
  priority: string
): Promise<string> => {
  try {
    const symptomsList = symptoms.map((s, i) => 
      `${i + 1}. ${s.description}\n   - Severity: ${s.severity || 'Not specified'}\n   - Date: ${new Date(s.created_at).toLocaleDateString()}\n   - Duration: ${s.duration || 'Not specified'}\n   - Flagged: ${s.is_flagged ? 'Yes - ' + s.flagged_reason : 'No'}`
    ).join('\n\n');

    const prompt = `Generate a professional medical report for a doctor. Use clear medical terminology.

## Patient Information
- Name: ${userProfile.name}
- Age: ${userProfile.age || 'Not provided'}
- Blood Type: ${userProfile.blood_type || 'Not provided'}
- Gender: ${userProfile.gender || 'Not provided'}
- Smoking Status: ${userProfile.smoker || 'Not provided'}
- Known Conditions: ${userProfile.diagnoses || 'None reported'}
- Current Medications: ${userProfile.medications || 'None reported'}
- Allergies: ${userProfile.allergies || 'None reported'}

## Reported Symptoms
${symptomsList}

## Priority Level: ${priority.toUpperCase()}

Generate a report with these sections:
1. EXECUTIVE SUMMARY (2-3 sentences of key concerns)
2. SYMPTOM ANALYSIS (patterns, duration, severity trends)
3. RISK FACTORS (based on medical history and symptom combination)
4. RECOMMENDED ACTIONS (specific next steps for the physician)

Keep the report concise but comprehensive. Use bullet points where appropriate.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate report.';
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error('Failed to generate detailed report');
  }
};
