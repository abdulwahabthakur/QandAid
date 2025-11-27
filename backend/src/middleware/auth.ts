import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';


const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: { message: 'No token provided' } });
      return;
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth error:', error);
      res.status(401).json({ error: { message: 'Invalid or expired token' } });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email!,
    };

    req.accessToken = token;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: { message: 'Authentication error' } });
  }
};

export default authMiddleware;
