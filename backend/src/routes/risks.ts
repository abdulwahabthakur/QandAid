import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest, RiskFlag } from '../types';
import authMiddleware from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const acknowledged = req.query.acknowledged === 'true';

    let query = supabaseAdmin
      .from('risk_flags')
      .select('*')
      .eq('user_id', userId);

    if (!acknowledged) {
      query = query.eq('is_acknowledged', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      res.json({ flags: [] });
      return;
    }

    res.json({ flags: data || [] });
  } catch (error) {
    console.error('Get risk flags error:', error);
    res.json({ flags: [] });
  }
});

router.patch('/:id/acknowledge', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const flagId = parseInt(req.params.id);

    const { data, error } = await supabaseAdmin
      .from('risk_flags')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', flagId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Risk flag not found' } });
      return;
    }

    res.json({ flag: data, message: 'Risk flag acknowledged' });
  } catch (error) {
    console.error('Acknowledge risk flag error:', error);
    res.status(500).json({ error: { message: 'Error acknowledging risk flag' } });
  }
});

export default router;
