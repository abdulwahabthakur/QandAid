import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest, ChatMessage } from '../types';
import { generateChatResponse, extractSymptomInfo } from '../services/openaiService';
import { analyzeSymptomsForFlagging } from '../utils/flagging';
import { analyzeSymptomWithML } from '../services/pythonService';
import { generateReportForUser } from '../services/reportGenerator';

const calculateSimilarity = (str1: string, str2: string): number => {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

const parseDurationToDate = (duration: string): string | null => {
  if (!duration) return null;
  
  const now = new Date();
  const lowerDuration = duration.toLowerCase();
  
  const patterns = [
    { regex: /(\d+)\s*days?\s*ago/i, unit: 'days' },
    { regex: /(\d+)\s*weeks?\s*ago/i, unit: 'weeks' },
    { regex: /(\d+)\s*months?\s*ago/i, unit: 'months' },
    { regex: /for\s*(\d+)\s*days?/i, unit: 'days' },
    { regex: /for\s*(\d+)\s*weeks?/i, unit: 'weeks' },
    { regex: /for\s*(\d+)\s*months?/i, unit: 'months' },
    { regex: /since\s*(yesterday)/i, unit: 'yesterday' },
    { regex: /(\d+)\s*hours?\s*ago/i, unit: 'hours' },
  ];

  for (const { regex, unit } of patterns) {
    const match = lowerDuration.match(regex);
    if (match) {
      const value = parseInt(match[1]) || 1;
      const date = new Date(now);
      
      switch (unit) {
        case 'hours':
          date.setHours(date.getHours() - value);
          break;
        case 'days':
          date.setDate(date.getDate() - value);
          break;
        case 'weeks':
          date.setDate(date.getDate() - (value * 7));
          break;
        case 'months':
          date.setMonth(date.getMonth() - value);
          break;
        case 'yesterday':
          date.setDate(date.getDate() - 1);
          break;
      }
      return date.toISOString();
    }
  }
  
  if (lowerDuration.includes('today') || lowerDuration.includes('this morning')) {
    return now.toISOString();
  }
  
  return null;
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    const userId = req.user!.id;

    await supabaseAdmin.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      content: message,
    });

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: historyData } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (historyData || []).reverse();

    const aiResponse = await generateChatResponse({
      userProfile: userProfile || {},
      conversationHistory,
      currentMessage: message,
    });

    await supabaseAdmin.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
    });

    const symptomInfo = await extractSymptomInfo(message, userProfile || {});
    
    const extractedSymptoms: any[] = [];
    let mlAnalysis: any = null;
    let shouldTriggerAutoReport = false;
    
    if (symptomInfo.hasSymptoms && symptomInfo.symptoms.length > 0) {
      const { data: existingSymptoms } = await supabaseAdmin
        .from('symptoms')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      for (const symptom of symptomInfo.symptoms) {
        let existingSymptom = null;
        let highestSimilarity = 0;

        for (const existing of existingSymptoms || []) {
          const similarity = calculateSimilarity(
            symptom.name + ' ' + symptom.description, 
            existing.description
          );
          if (similarity > 0.5 && similarity > highestSimilarity) {
            highestSimilarity = similarity;
            existingSymptom = existing;
          }
        }

        const firstOccurredAt = symptom.firstOccurredAt 
          ? symptom.firstOccurredAt 
          : parseDurationToDate(symptom.duration || '') || new Date().toISOString();

        if (existingSymptom) {
          const { data: updated } = await supabaseAdmin
            .from('symptoms')
            .update({
              severity: symptom.severity || existingSymptom.severity,
              duration: symptom.duration || existingSymptom.duration,
              frequency: symptom.frequency || existingSymptom.frequency,
              last_occurred_at: new Date().toISOString(),
              is_ongoing: symptom.isOngoing,
              description: (symptom.description?.length || 0) > (existingSymptom.description?.length || 0) 
                ? symptom.description 
                : existingSymptom.description,
            })
            .eq('id', existingSymptom.id)
            .select()
            .single();
            
          extractedSymptoms.push({ ...updated, updated: true });
        } else {
          const { data: newSymptom } = await supabaseAdmin
            .from('symptoms')
            .insert({
              user_id: userId,
              description: symptom.description || symptom.name,
              severity: symptom.severity || null,
              duration: symptom.duration || null,
              frequency: symptom.frequency || null,
              first_occurred_at: firstOccurredAt,
              last_occurred_at: new Date().toISOString(),
              is_ongoing: symptom.isOngoing !== false,
            })
            .select()
            .single();

          if (newSymptom) {
            extractedSymptoms.push({ ...newSymptom, created: true });

            const flaggingResult = await analyzeSymptomsForFlagging(userId, supabaseAdmin);
            
            if (flaggingResult.shouldFlag) {
              await supabaseAdmin
                .from('symptoms')
                .update({
                  is_flagged: true,
                  flagged_reason: flaggingResult.reason,
                })
                .eq('id', newSymptom.id);
              shouldTriggerAutoReport = true;
            }
          }
        }
      }

      if (symptomInfo.requiresImmediateAttention) {
        for (const symptom of extractedSymptoms) {
          await supabaseAdmin
            .from('symptoms')
            .update({
              is_flagged: true,
              flagged_reason: 'Requires immediate medical attention',
            })
            .eq('id', symptom.id);
        }
        shouldTriggerAutoReport = true;
      }

      try {
        const { data: recentSymptoms } = await supabaseAdmin
          .from('symptoms')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(25);

        if (recentSymptoms && recentSymptoms.length > 0) {
          mlAnalysis = await analyzeSymptomWithML(recentSymptoms, userProfile || {});

          if (mlAnalysis) {
            if (mlAnalysis.risk_score >= 0.4) {
              await supabaseAdmin.from('risk_flags').insert({
                user_id: userId,
                risk_level: mlAnalysis.risk_level,
                flag_type: 'ml_analysis',
                description: `ML risk score ${(mlAnalysis.risk_score * 100).toFixed(1)}% (${mlAnalysis.urgency_level.toUpperCase()}). ${mlAnalysis.recommendations?.[0] || 'Review recommended.'}`,
              });
              if (mlAnalysis.risk_level === 'high' || mlAnalysis.risk_level === 'critical') {
                shouldTriggerAutoReport = true;
              }
            }
          }
        }
      } catch (mlError) {
        console.error('ML analysis error:', mlError);
      }
    }

    if (shouldTriggerAutoReport) {
      try {
        await generateReportForUser(userId);
      } catch (autoReportError) {
        console.error('Automatic report generation failed:', autoReportError);
      }
    }

    res.json({
      message: aiResponse,
      timestamp: new Date().toISOString(),
      extractedSymptoms: extractedSymptoms.length > 0 ? extractedSymptoms : undefined,
      urgencyLevel: symptomInfo.urgencyLevel,
      requiresImmediateAttention: symptomInfo.requiresImmediateAttention,
      mlAnalysis: mlAnalysis || undefined,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: { message: 'Error processing message' } });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const messages = (data || []).reverse().map(msg => ({
      ...msg,
      timestamp: msg.created_at,
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: { message: 'Error fetching chat history' } });
  }
};

export const clearChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { error } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: { message: 'Error clearing chat history' } });
  }
};
