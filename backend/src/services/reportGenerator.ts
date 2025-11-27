import { supabaseAdmin } from '../config/supabase';
import { MedicalReport, Symptom } from '../types';
import { analyzeForReport, generateDetailedReport } from './openaiService';
import { sendEmailReport, isEmailConfigured } from './emailService';
import { sendSMSAlert } from './smsService';
import { analyzeSymptomWithML } from './pythonService';

export interface ReportGenerationResult {
  report?: MedicalReport;
  message: string;
  sentToDoctor: boolean;
  shouldGenerateReport: boolean;
}

export const generateReportForUser = async (userId: string): Promise<ReportGenerationResult> => {
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: symptoms, error: symptomsError } = await supabaseAdmin
    .from('symptoms')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (symptomsError) throw symptomsError;

  if (!symptoms || symptoms.length === 0) {
    return {
      message: 'No symptoms to report',
      sentToDoctor: false,
      shouldGenerateReport: false,
    };
  }

  const analysis = await analyzeForReport(symptoms, userProfile || {});

  let mlAnalysis: any = null;
  try {
    mlAnalysis = await analyzeSymptomWithML(symptoms, userProfile || {});
  } catch (mlError) {
    console.error('ML analysis failed during report generation:', mlError);
  }

  if (!analysis.shouldGenerateReport) {
    return {
      message: 'No concerning patterns detected',
      sentToDoctor: false,
      shouldGenerateReport: false,
    };
  }

  const summaryWithML = mlAnalysis
    ? `${analysis.summary}\n\nML Risk Assessment: ${(mlAnalysis.risk_score * 100).toFixed(1)}% (${mlAnalysis.risk_level.toUpperCase()}) • Urgency: ${mlAnalysis.urgency_level.toUpperCase()}`
    : analysis.summary;

  let detailedReport = '';
  try {
    detailedReport = await generateDetailedReport(symptoms, userProfile || {}, analysis.priority);
    if (mlAnalysis) {
      const mlRecs: string[] = mlAnalysis.recommendations || [];
      detailedReport += `\n\n### ML Risk Analysis\n- Risk Score: ${(mlAnalysis.risk_score * 100).toFixed(1)}%\n- Risk Level: ${mlAnalysis.risk_level}\n- Urgency: ${mlAnalysis.urgency_level}\n- Recommendations:\n${mlRecs.map((rec: string) => `  • ${rec}`).join('\n')}`;
    }
  } catch (e) {
    console.error('Detailed report generation failed:', e);
  }

  const combinedRecommendations = [
    ...(analysis.recommendations || []),
    ...(mlAnalysis?.recommendations || []),
  ];

  const { data: report, error: reportError } = await supabaseAdmin
    .from('medical_reports')
    .insert({
      user_id: userId,
      title: `Medical Report - ${new Date().toLocaleDateString()}`,
      summary: summaryWithML,
      detailed_report: detailedReport,
      priority: analysis.priority,
      symptoms_included: symptoms.map((s: Symptom) => s.id),
      recommendations: JSON.stringify(combinedRecommendations),
      doctor_email: userProfile?.doctor_email,
    })
    .select()
    .single();

  if (reportError) throw reportError;

  let sentToDoctor = false;
  const emailCanSend = isEmailConfigured();

  if (userProfile?.doctor_email && emailCanSend) {
    try {
      await sendEmailReport(report as MedicalReport, symptoms, userProfile);

      await supabaseAdmin
        .from('medical_reports')
        .update({
          sent_to_doctor: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      sentToDoctor = true;

      if (analysis.priority === 'high' && userProfile.doctor_phone) {
        await sendSMSAlert(userProfile.doctor_phone, userProfile.name || 'Patient', analysis.priority);

        await supabaseAdmin
          .from('medical_reports')
          .update({ sms_sent: true })
          .eq('id', report.id);
      }
    } catch (emailError) {
      console.error('Failed to send report to doctor:', emailError);
    }
  }

  return {
    report: report as MedicalReport,
    message: 'Report generated successfully',
    sentToDoctor,
    shouldGenerateReport: true,
  };
};

