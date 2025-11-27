import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest, UserProfile } from '../types';


export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!profile) {
      res.json({ 
        user: {
          id: userId,
          email: req.user!.email,
          profile_incomplete: true,
        }
      });
      return;
    }

    res.json({ user: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: { message: 'Error fetching profile' } });
  }
};


export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const updates = req.body;

    const allowedFields = [
      'name', 'date_of_birth', 'age', 'gender', 'blood_type', 'phone',
      'smoker', 'smoking_frequency', 'alcohol_consumption', 'exercise_frequency',
      'medications', 'diagnoses', 'allergies', 'past_surgeries', 'family_history',
      'doctor_name', 'doctor_email', 'doctor_phone'
    ];

    const profileData: any = {
      id: userId,
      email: userEmail,
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        profileData[field] = updates[field];
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ user: profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { message: 'Error updating profile' } });
  }
};


export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    await supabaseAdmin.from('medical_reports').delete().eq('user_id', userId);
    await supabaseAdmin.from('risk_flags').delete().eq('user_id', userId);
    await supabaseAdmin.from('symptoms').delete().eq('user_id', userId);
    await supabaseAdmin.from('chat_messages').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_profiles').delete().eq('id', userId);


    res.json({ message: 'Account data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: { message: 'Error deleting account' } });
  }
};
