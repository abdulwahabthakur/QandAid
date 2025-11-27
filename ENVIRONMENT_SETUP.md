# Q&Aid Environment Setup

## Supabase Setup (Required)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and fill in the details
3. Wait for the project to be created (~2 minutes)

### 2. Get Your API Keys

Go to **Settings > API** in your Supabase dashboard:

- **Project URL**: Copy the URL (e.g., `https://xxxxx.supabase.co`)
- **anon/public key**: Copy this for the frontend
- **service_role key**: Copy this for the backend (keep this secret!)

### 3. Set Up the Database

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `backend/schema.sql`
3. Paste and run the SQL to create all tables

### 4. Enable Email Auth

1. Go to **Authentication > Providers**
2. Make sure **Email** is enabled
3. Optionally configure email templates in **Authentication > Email Templates**

---

## Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration (REQUIRED for AI chat)
OPENAI_API_KEY=sk-your-openai-api-key

# Email Configuration (REQUIRED - doctor reports are emailed)
# Option 1: SendGrid (recommended)
SENDGRID_API_KEY=SG.xxxxxx
SENDGRID_FROM_EMAIL=your-verified-email@example.com

# Option 2: Gmail SMTP (if not using SendGrid)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Twilio SMS Configuration (Optional - for urgent alerts)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Python ML Service (REQUIRED)
PYTHON_SERVICE_URL=http://localhost:8000
```

---

## Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Getting API Keys

### OpenAI API Key
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy and use as `OPENAI_API_KEY`

### Gmail SMTP (for doctor emails)
1. Enable 2-factor authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"
4. Use that password as `EMAIL_PASSWORD`

### Twilio (for SMS alerts)
1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the console
3. Get a phone number capable of sending SMS

---

## Running the Application

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 0. Start Python ML Service (Required)
```bash
cd python-service
pip install -r requirements.txt
python main.py
```

You must keep this service running; the Node backend depends on it for risk scoring and report generation.

### 1. Start the Backend
---

## Troubleshooting

### "Missing Supabase environment variables"
Make sure you have both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set in your backend `.env` file.

### "Invalid or expired token"
The Supabase access token has expired. Log out and log back in.

### "No symptoms to report"
You need to chat with the AI and mention some symptoms before generating a report.

### Database tables don't exist
Run the SQL from `backend/schema.sql` in your Supabase SQL Editor.
