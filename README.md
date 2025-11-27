# Q&Aid 🏥

A comprehensive AI-powered health assistant that helps users track symptoms, communicate with an intelligent chatbot, and automatically generate medical reports for their doctors.

![Q&Aid](https://img.shields.io/badge/Q%26Aid-Health%20Assistant-6366f1)
![React](https://img.shields.io/badge/React-18.x-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e)

## 🌟 Features

### 💬 AI Health Chatbot
- Natural language conversation about health concerns
- Intelligent symptom extraction and tracking
- Context-aware responses using OpenAI GPT
- Markdown-formatted responses for better readability

### 📊 Symptom Tracking
- Automatic symptom detection from conversations
- Severity classification (mild, moderate, severe)
- Symptom history and timeline
- Risk flagging for concerning patterns

### 📋 Medical Reports
- Automated report generation based on symptoms
- Priority-based categorization (low, moderate, high)
- Email reports directly to your doctor
- SMS alerts for high-priority cases

### 👤 User Profile Management
- Comprehensive health profile
- Medical history tracking
- Doctor contact information
- Medication and allergy records

### 🤖 ML-Powered Analysis
- Python-based machine learning service
- Advanced symptom pattern recognition
- Risk scoring and urgency assessment
- Predictive health insights

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Node.js API    │────▶│    Supabase     │
│  (TypeScript)   │     │  (Express)      │     │   (PostgreSQL)  │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  Python ML      │
                        │  Service        │
                        │  (FastAPI)      │
                        │                 │
                        └─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- Python 3.11 or higher
- npm or yarn
- Supabase account

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/QandAid.git
   cd QandAid
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   
   Create `.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Email (SendGrid or SMTP)
   SENDGRID_API_KEY=your_sendgrid_key
   # OR
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email
   EMAIL_PASS=your_app_password
   
   # SMS (Twilio - optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```
   
   Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Python ML Service Setup**
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```
   
   Create `.env` file:
   ```env
   PORT=8000
   HOST=0.0.0.0
   ```

5. **Database Setup**
   
   Run the SQL schema in your Supabase SQL editor:
   ```bash
   # The schema is located at backend/schema.sql
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Start the ML Service** (optional)
   ```bash
   cd python-service
   python main.py
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
QandAid/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/             # API utilities
│   │   ├── App.tsx          # Main application
│   │   ├── useAuth.ts       # Authentication hook
│   │   └── supabaseClient.ts
│   └── package.json
│
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── server.ts        # Express server
│   ├── schema.sql           # Database schema
│   └── package.json
│
├── python-service/          # Python ML microservice
│   ├── main.py              # FastAPI server
│   └── requirements.txt
│
└── README.md
```

## 🔐 Authentication

Q&Aid uses Supabase Authentication with:
- Email/password sign up and sign in
- Email verification
- JWT token-based API authentication
- Secure session management

## 📱 Screenshots

### Dashboard
![Screenshot 2025-11-27 014102](https://github.com/user-attachments/assets/e30db07a-f612-446e-8059-14cc428af176)

### Chat Interface
![Screenshot 2025-11-27 014040](https://github.com/user-attachments/assets/9d10f4eb-fa37-4ba9-a52c-b565be03222a)

### Symptom Tracking
![Screenshot 2025-11-27 013913](https://github.com/user-attachments/assets/fef21c7d-4b0f-42ec-b938-c2de2ea75345)

### Medical Reports
![Screenshot 2025-11-27 014154](https://github.com/user-attachments/assets/ac768baf-bc0b-4c94-979f-84cd70f4e187)


## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- React Markdown for chat formatting
- Axios for API calls

### Backend
- Node.js with Express
- TypeScript
- Supabase (PostgreSQL)
- OpenAI GPT-4 for AI responses
- SendGrid/Nodemailer for emails
- Twilio for SMS (optional)

### ML Service
- Python 3.11
- FastAPI
- scikit-learn
- NumPy/Pandas

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

Q&Aid is designed to assist with health tracking and communication with healthcare providers. It is **not** a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ for better health management
