import { Router } from 'express';
import { getSymptoms, getSymptomById, updateSymptom, deleteSymptom, resolveSymptom } from './controllers/symptomController';
import supabaseAuthMiddleware from './middleware/supabaseAuth';

const router = Router();

router.get('/', supabaseAuthMiddleware, getSymptoms);

router.get('/:id', supabaseAuthMiddleware, getSymptomById);

router.patch('/:id', supabaseAuthMiddleware, updateSymptom);

router.put('/:id', supabaseAuthMiddleware, updateSymptom);

router.patch('/:id/resolve', supabaseAuthMiddleware, resolveSymptom);

router.delete('/:id', supabaseAuthMiddleware, deleteSymptom);

export default router;
