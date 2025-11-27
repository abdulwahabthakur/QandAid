import { Router } from 'express';
import { getProfile, updateProfile, deleteAccount } from '../controllers/authController';
import authMiddleware from '../middleware/auth';

const router = Router();


router.get('/profile', authMiddleware, getProfile);

router.patch('/profile', authMiddleware, updateProfile);

router.put('/profile', authMiddleware, updateProfile);

router.post('/profile', authMiddleware, updateProfile);

router.delete('/account', authMiddleware, deleteAccount);

export default router;
