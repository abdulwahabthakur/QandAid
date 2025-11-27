-- Q&Aid Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- ============================================
-- USER PROFILES TABLE
-- ============================================
-- Links to auth.users via id (UUID)

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT,
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', NULL)),
    phone TEXT,
    
    -- Lifestyle information
    smoker TEXT CHECK (smoker IN ('never', 'former', 'current', NULL)),
    smoking_frequency TEXT,
    alcohol_consumption TEXT,
    exercise_frequency TEXT,
    
    -- Medical information
    medications TEXT,
    diagnoses TEXT,
    allergies TEXT,
    past_surgeries TEXT,
    family_history TEXT,
    
    -- Doctor information
    doctor_name TEXT,
    doctor_email TEXT,
    doctor_phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYMPTOMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS symptoms (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', NULL)),
    duration TEXT,
    frequency TEXT,
    triggers TEXT,
    
    -- Date tracking
    first_occurred_at TIMESTAMPTZ,
    last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status flags
    is_ongoing BOOLEAN DEFAULT TRUE,
    is_chronic BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    
    -- Flagging
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    flag_severity TEXT CHECK (flag_severity IN ('low', 'moderate', 'high', 'critical', NULL)),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RISK FLAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS risk_flags (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symptom_id BIGINT REFERENCES symptoms(id) ON DELETE SET NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    flag_type TEXT NOT NULL,
    description TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDICAL REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS medical_reports (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_report TEXT,
    priority TEXT CHECK (priority IN ('low', 'moderate', 'high')),
    symptoms_included BIGINT[],
    recommendations TEXT,
    
    -- Delivery tracking
    sent_to_doctor BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    doctor_email TEXT,
    doctor_phone TEXT,
    sms_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_id ON symptoms(user_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_flagged ON symptoms(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_symptoms_ongoing ON symptoms(is_ongoing) WHERE is_ongoing = TRUE;
CREATE INDEX IF NOT EXISTS idx_symptoms_created_at ON symptoms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_flags_user_id ON risk_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_unacknowledged ON risk_flags(is_acknowledged) WHERE is_acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_medical_reports_user_id ON medical_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_created_at ON medical_reports(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Chat Messages: Users can only access their own messages
CREATE POLICY "Users can view own messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Symptoms: Users can only access their own symptoms
CREATE POLICY "Users can view own symptoms" ON symptoms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms" ON symptoms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms" ON symptoms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms" ON symptoms
    FOR DELETE USING (auth.uid() = user_id);

-- Risk Flags: Users can only access their own flags
CREATE POLICY "Users can view own risk flags" ON risk_flags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk flags" ON risk_flags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk flags" ON risk_flags
    FOR UPDATE USING (auth.uid() = user_id);

-- Medical Reports: Users can only access their own reports
CREATE POLICY "Users can view own reports" ON medical_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON medical_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON medical_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for symptoms
DROP TRIGGER IF EXISTS update_symptoms_updated_at ON symptoms;
CREATE TRIGGER update_symptoms_updated_at
    BEFORE UPDATE ON symptoms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- GRANT PERMISSIONS (for service role)
-- ============================================

-- These are typically set automatically by Supabase, but included for completeness
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON chat_messages TO service_role;
GRANT ALL ON symptoms TO service_role;
GRANT ALL ON risk_flags TO service_role;
GRANT ALL ON medical_reports TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
