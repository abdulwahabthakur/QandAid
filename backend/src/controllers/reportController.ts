import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';
import { generateReportForUser } from '../services/reportGenerator';

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ reports: data || [] });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: { message: 'Error fetching reports' } });
  }
};

export const generateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await generateReportForUser(userId);

    if (!result.shouldGenerateReport && !result.report) {
      res.status(400).json({ error: { message: result.message } });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: { message: 'Error generating report' } });
  }
};

export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const reportId = parseInt(req.params.id);

    const { data: report, error } = await supabaseAdmin
      .from('medical_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (error || !report) {
      res.status(404).json({ error: { message: 'Report not found' } });
      return;
    }

    let symptoms: any[] = [];
    if (report.symptoms_included && report.symptoms_included.length > 0) {
      const { data: symptomsData } = await supabaseAdmin
        .from('symptoms')
        .select('*')
        .in('id', report.symptoms_included);
      symptoms = symptomsData || [];
    }

    res.json({ 
      report,
      symptoms,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: { message: 'Error fetching report' } });
  }
};
