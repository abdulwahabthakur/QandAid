import { Router } from 'express';
import { sendMessage, getChatHistory, clearChatHistory } from '../controllers/chatController';
import supabaseAuthMiddleware from '../middleware/supabaseAuth';
import { chatValidation, validate } from '../middleware/validateInput';

const router = Router();

router.post('/send', supabaseAuthMiddleware, chatValidation, validate, sendMessage);

router.get('/history', supabaseAuthMiddleware, getChatHistory);

router.delete('/history', supabaseAuthMiddleware, clearChatHistory);

export default router;
