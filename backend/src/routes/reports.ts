import { Router } from 'express';
import { getReports, generateReport, getReportById } from '../controllers/reportController';
import supabaseAuthMiddleware from '../middleware/supabaseAuth';

const router = Router();

router.get('/', supabaseAuthMiddleware, getReports);

router.post('/generate', supabaseAuthMiddleware, generateReport);

router.get('/:id', supabaseAuthMiddleware, getReportById);

export default router;
