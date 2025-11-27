import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { userProfileAPI } from './lib/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  phone?: string;
  smoker?: string;
  medications?: string;
  diagnoses?: string;
  allergies?: string;
  doctor_name?: string;
  doctor_email?: string;
  doctor_phone?: string;
  family_history?: string;
}

export interface AuthHook {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profileData: any) => Promise<any>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const useAuth = (): AuthHook => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const getSession = async () => {
      const timeout = setTimeout(() => {
        if (isMounted && loading) {
          console.warn('Session check timed out, clearing loading state');
          setLoading(false);
        }
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          await handleSession(session);
        }
      } catch (error) {
        console.error('Failed to get Supabase session:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        try {
          await handleSession(session);
        } catch (error) {
          console.error('Auth listener error:', error);
          setUser(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSession = async (session: Session | null) => {
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Set user immediately from session to avoid blocking
    setUser({
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.name,
    });
    setLoading(false);

    // Then fetch profile from backend API to get full details (saved profile data)
    try {
      const { user: profile } = await userProfileAPI.getProfile();
      console.log('Profile fetched from API:', profile);

      if (profile && !profile.profile_incomplete) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: profile.name || session.user.user_metadata?.name,
          date_of_birth: profile.date_of_birth,
          age: profile.age,
          gender: profile.gender,
          blood_type: profile.blood_type,
          phone: profile.phone,
          smoker: profile.smoker,
          medications: profile.medications,
          diagnoses: profile.diagnoses,
          allergies: profile.allergies,
          doctor_name: profile.doctor_name,
          doctor_email: profile.doctor_email,
          doctor_phone: profile.doctor_phone,
          family_history: profile.family_history,
        });
      }
    } catch (error) {
      console.error('handleSession profile fetch error:', error);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('login called with:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('signInWithPassword result:', { data: !!data, error });
    
    if (error) throw error;
    
    if (data.session) {
      console.log('Setting user from login session');
      // Set user directly here to ensure immediate update
      setUser({
        id: data.session.user.id,
        email: data.session.user.email!,
        name: data.session.user.user_metadata?.name,
      });
      setLoading(false);
      console.log('User set successfully');
    }
  };

  const signup = async (profileData: any) => {
    const { email, password, ...profile } = profileData;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: profile.name,
        },
      },
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        name: profile.name,
        date_of_birth: profile.date_of_birth,
        age: profile.age,
        gender: profile.gender,
        blood_type: profile.blood_type,
        phone: profile.phone,
        smoker: profile.smoker,
        smoking_frequency: profile.smoking_frequency,
        alcohol_consumption: profile.alcohol_consumption,
        exercise_frequency: profile.exercise_frequency,
        medications: profile.medications,
        diagnoses: profile.diagnoses,
        allergies: profile.allergies,
        past_surgeries: profile.past_surgeries,
        family_history: profile.family_history,
        doctor_name: profile.doctor_name,
        doctor_email: profile.doctor_email,
        doctor_phone: profile.doctor_phone,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return authData;
  };

  const logout = async () => {
    console.log('useAuth logout called');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (e) {
      console.error('Supabase signOut exception:', e);
    }
    // Always clear user state regardless of error
    console.log('Setting user to null');
    setUser(null);
    console.log('useAuth logout completed');
  };

  const reloadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Fetch updated profile from backend API
      const { user: profile } = await userProfileAPI.getProfile();
      console.log('Profile reloaded from API:', profile);

      if (profile && !profile.profile_incomplete) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: profile.name || session.user.user_metadata?.name,
          date_of_birth: profile.date_of_birth,
          age: profile.age,
          gender: profile.gender,
          blood_type: profile.blood_type,
          phone: profile.phone,
          smoker: profile.smoker,
          medications: profile.medications,
          diagnoses: profile.diagnoses,
          allergies: profile.allergies,
          doctor_name: profile.doctor_name,
          doctor_email: profile.doctor_email,
          doctor_phone: profile.doctor_phone,
          family_history: profile.family_history,
        });
      }
    } catch (error) {
      console.error('Reload profile error:', error);
    }
  };

  return { user, loading, login, signup, logout, reloadProfile };
};
