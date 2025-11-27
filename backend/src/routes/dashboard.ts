import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';
import authMiddleware from '../middleware/auth';

const router = Router();

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: symptoms, error: symptomsError } = await supabaseAdmin
      .from('symptoms')
      .select('id, is_ongoing, is_flagged')
      .eq('user_id', userId);

    if (symptomsError) throw symptomsError;

    const allSymptoms = symptoms || [];
    const activeSymptoms = allSymptoms.filter(s => s.is_ongoing !== false).length;
    const flaggedSymptoms = allSymptoms.filter(s => s.is_flagged).length;

    const { data: recentSymptoms, error: recentError } = await supabaseAdmin
      .from('symptoms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    let unresolvedFlags: any[] = [];
    try {
      const { data: flags } = await supabaseAdmin
        .from('risk_flags')
        .select('*')
        .eq('user_id', userId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);
      unresolvedFlags = flags || [];
    } catch {
    }

    res.json({
      activeSymptoms,
      totalSymptoms: allSymptoms.length,
      riskFlags: flaggedSymptoms,
      recentSymptoms: recentSymptoms || [],
      unresolvedFlags,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: { message: 'Error fetching dashboard stats' } });
  }
});

export default router;
