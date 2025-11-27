import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest, Symptom } from '../types';

export const getSymptoms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 100;
    const ongoing = req.query.ongoing === 'true';
    const flagged = req.query.flagged === 'true';

    let query = supabaseAdmin
      .from('symptoms')
      .select('*')
      .eq('user_id', userId);

    if (ongoing) {
      query = query.eq('is_ongoing', true);
    }
    
    if (flagged) {
      query = query.eq('is_flagged', true);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ symptoms: data || [] });
  } catch (error) {
    console.error('Get symptoms error:', error);
    res.status(500).json({ error: { message: 'Error fetching symptoms' } });
  }
};

export const getSymptomById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const symptomId = parseInt(req.params.id);

    const { data, error } = await supabaseAdmin
      .from('symptoms')
      .select('*')
      .eq('id', symptomId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Symptom not found' } });
      return;
    }

    res.json({ symptom: data });
  } catch (error) {
    console.error('Get symptom error:', error);
    res.status(500).json({ error: { message: 'Error fetching symptom' } });
  }
};

export const updateSymptom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const symptomId = parseInt(req.params.id);
    const { severity, duration, frequency, is_ongoing, description } = req.body;

    const updates: any = {
      last_occurred_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (severity !== undefined) updates.severity = severity;
    if (duration !== undefined) updates.duration = duration;
    if (frequency !== undefined) updates.frequency = frequency;
    if (is_ongoing !== undefined) updates.is_ongoing = is_ongoing;
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabaseAdmin
      .from('symptoms')
      .update(updates)
      .eq('id', symptomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Symptom not found' } });
      return;
    }

    res.json({ symptom: data });
  } catch (error) {
    console.error('Update symptom error:', error);
    res.status(500).json({ error: { message: 'Error updating symptom' } });
  }
};

export const resolveSymptom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const symptomId = parseInt(req.params.id);

    const { data, error } = await supabaseAdmin
      .from('symptoms')
      .update({
        is_ongoing: false,
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', symptomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Symptom not found' } });
      return;
    }

    res.json({ symptom: data, message: 'Symptom marked as resolved' });
  } catch (error) {
    console.error('Resolve symptom error:', error);
    res.status(500).json({ error: { message: 'Error resolving symptom' } });
  }
};

export const deleteSymptom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const symptomId = parseInt(req.params.id);

    const { data, error } = await supabaseAdmin
      .from('symptoms')
      .delete()
      .eq('id', symptomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Symptom not found' } });
      return;
    }

    res.json({ message: 'Symptom deleted' });
  } catch (error) {
    console.error('Delete symptom error:', error);
    res.status(500).json({ error: { message: 'Error deleting symptom' } });
  }
};
