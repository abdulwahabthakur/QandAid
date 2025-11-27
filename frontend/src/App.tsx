import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Send, User, FileText, AlertCircle, Menu, X, 
  MessageSquare, List, FileBarChart, UserCircle, LogOut,
  LayoutDashboard, Bot
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from './useAuth';
import { 
  chatAPI, 
  symptomAPI, 
  reportAPI,
  userProfileAPI,
  Symptom as ApiSymptom,
  Report as ApiReport
} from './lib/api';
import LoginPage from './components/LoginPage';
import MultiStepProfileSetup from './components/ProfileSetup/MultiStepProfileSetup';
import Dashboard from './components/Dashboard/Dashboard';
import { ChatMessage, TypingIndicator } from './components/Chat/ChatMessage';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

type TabType = 'dashboard' | 'chat' | 'symptoms' | 'reports' | 'profile';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const SMOKING_STATUS_OPTIONS = [
  { label: 'Never smoked', value: 'never' },
  { label: 'Former smoker', value: 'former' },
  { label: 'Current smoker', value: 'current' },
];

const calculateAgeFromDate = (dob?: string): number | undefined => {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString();
};

const App: React.FC = () => {
  const { user, loading: authLoading, login, signup, logout, reloadProfile } = useAuth();
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  type AuthScreen = 'login' | 'signup' | 'profileSetup' | 'pendingVerification';
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<ApiSymptom[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false); // Keep for potential future use
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      setIsLoggedOut(false); // Reset logout state when user is present
      loadData();
      setAuthScreen('login');
    }
  }, [user]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    console.log('loadData called');
    setDataLoading(true);
    try {
      console.log('Fetching chat, symptoms, reports...');
      const [chatData, symptomsData, reportsData] = await Promise.all([
        chatAPI.getChatHistory(50).catch((e) => { console.error('Chat fetch error:', e); return { messages: [] }; }),
        symptomAPI.getSymptoms(100).catch((e) => { console.error('Symptoms fetch error:', e); return { symptoms: [] }; }),
        reportAPI.getReports().catch((e) => { console.error('Reports fetch error:', e); return { reports: [] }; }),
      ]);

      console.log('Data fetched:', { 
        messages: chatData.messages?.length || 0, 
        symptoms: symptomsData.symptoms?.length || 0, 
        reports: reportsData.reports?.length || 0 
      });

      setMessages(chatData.messages || []);
      setSymptoms(symptomsData.symptoms || []);
      setReports(reportsData.reports || []);
      
      // If data is empty, retry once after a short delay (session might not be ready)
      if (chatData.messages?.length === 0 && symptomsData.symptoms?.length === 0) {
        console.log('Data empty, scheduling retry...');
        setTimeout(async () => {
          try {
            console.log('Retrying data fetch...');
            const [retryChat, retrySymptoms, retryReports] = await Promise.all([
              chatAPI.getChatHistory(50).catch(() => ({ messages: [] })),
              symptomAPI.getSymptoms(100).catch(() => ({ symptoms: [] })),
              reportAPI.getReports().catch(() => ({ reports: [] })),
            ]);
            console.log('Retry data:', { 
              messages: retryChat.messages?.length || 0, 
              symptoms: retrySymptoms.symptoms?.length || 0, 
              reports: retryReports.reports?.length || 0 
            });
            if (retryChat.messages?.length > 0) setMessages(retryChat.messages);
            if (retrySymptoms.symptoms?.length > 0) setSymptoms(retrySymptoms.symptoms);
            if (retryReports.reports?.length > 0) setReports(retryReports.reports);
          } catch (e) {
            console.error('Retry fetch error:', e);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const [pendingProfile, setPendingProfile] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const handleLogout = async () => {
    console.log('handleLogout called');
    // Set logged out state immediately to force UI update
    setIsLoggedOut(true);
    // Reset all auth-related state
    setAuthScreen('login');
    setPendingProfile(false);
    setPendingEmail('');
    setSignupEmail('');
    setSignupPassword('');
    // Clear app data
    setMessages([]);
    setSymptoms([]);
    setReports([]);
    // Call logout in background
    logout().catch(err => console.error('Logout error:', err));
    console.log('handleLogout finished');
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoggedOut(false); // Reset logout state BEFORE login attempt
      await login(email, password);
      setPendingProfile(false);
    } catch (error: any) {
      const message = error.message || 'Login failed. Please check your email and password.';
      setToast({ message, type: 'error' });
      throw error;
    }
  };

  const handleSignupInit = (email: string, password: string) => {
    setSignupEmail(email);
    setSignupPassword(password);
    setAuthScreen('profileSetup');
  };

  const handleSignupComplete = async (profileData: any) => {
    try {
      await signup(profileData);
      setPendingEmail(profileData.email);
      setPendingProfile(true);
      setAuthScreen('pendingVerification');
      setToast({ 
        message: 'Account created! Check your email for the verification link.', 
        type: 'success' 
      });
    } catch (error: any) {
      setToast({ message: error.message || 'Signup failed', type: 'error' });
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(input);
      
      const aiMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(response.timestamp),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (response.requiresImmediateAttention) {
        setToast({ 
          message: '⚠️ Some symptoms may require immediate medical attention. Please consult a healthcare provider.', 
          type: 'warning' 
        });
      }
      
      const symptomsData = await symptomAPI.getSymptoms(100);
      setSymptoms(symptomsData.symptoms || []);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    if (symptoms.length === 0) {
      setToast({ message: 'No symptoms to report. Start a conversation first.', type: 'warning' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await reportAPI.generateReport();
      
      if (response.report) {
        setReports(prev => [response.report!, ...prev]);
        setToast({ 
          message: response.sentToDoctor 
            ? 'Report generated and sent to your doctor!' 
            : 'Report generated successfully!', 
          type: 'success' 
        });
      } else {
        setToast({ message: response.message || 'No concerning patterns detected.', type: 'success' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Error generating report';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            symptoms={symptoms} 
            onNavigateToChat={() => navigateToTab('chat')} 
            onGenerateReport={generateReport}
            isLoading={isLoading}
          />
        );
      case 'chat':
        return (
          <ChatView 
            messages={messages} 
            input={input} 
            setInput={setInput} 
            sendMessage={sendMessage} 
            isLoading={isLoading} 
            chatContainerRef={chatContainerRef} 
          />
        );
      case 'symptoms':
        return <SymptomsView symptoms={symptoms} />;
      case 'reports':
        return <ReportsView reports={reports} generateReport={generateReport} isLoading={isLoading} />;
      case 'profile':
        return (
          <ProfileView 
            user={user!} 
            onLogout={handleLogout} 
            onProfileUpdated={reloadProfile} 
            onShowToast={(message, type) => setToast({ message, type })}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <Activity className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || isLoggedOut) {
    if (pendingProfile && authScreen === 'pendingVerification') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Verify your email</h2>
            <p className="text-gray-600">
              We sent a verification link to <span className="font-medium">{pendingEmail || signupEmail}</span>.
              Please click the link to activate your account, then sign in.
            </p>
            <button
              onClick={() => setAuthScreen('login')}
              className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    switch (authScreen) {
      case 'login':
      default:
        return <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthScreen('signup')} />;
      case 'signup':
        return <SignupInitial onSignupInit={handleSignupInit} onSwitchToLogin={() => setAuthScreen('login')} />;
      case 'profileSetup':
        return <MultiStepProfileSetup onComplete={handleSignupComplete} initialEmail={signupEmail} initialPassword={signupPassword} />;
      case 'pendingVerification':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-lg space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Verify your email</h2>
              <p className="text-gray-600">
                We sent a verification link to <span className="font-medium">{pendingEmail || signupEmail}</span>.
                Please click the link to activate your account, then sign in.
              </p>
              <button
                onClick={() => setAuthScreen('login')}
                className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="gradient-primary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Activity className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Q&Aid</h1>
            <p className="text-xs text-gray-500 hidden sm:block">AI Health Assistant</p>
          </div>
        </div>
        <button 
          onClick={() => setMenuOpen(!menuOpen)} 
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {}
        <aside
          className={`${
            menuOpen ? 'flex absolute inset-0 z-50 bg-white' : 'hidden'
          } lg:flex lg:relative lg:w-64 bg-white border-r border-gray-200 flex-col`}
        >
          {}
          <div className="lg:hidden p-4 border-b flex justify-between items-center">
            <span className="font-semibold">Menu</span>
            <button onClick={() => setMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            <NavButton 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => navigateToTab('dashboard')} 
            />
            <NavButton 
              icon={MessageSquare} 
              label="Chat" 
              active={activeTab === 'chat'} 
              onClick={() => navigateToTab('chat')} 
            />
            <NavButton 
              icon={List} 
              label="Symptoms" 
              active={activeTab === 'symptoms'} 
              onClick={() => navigateToTab('symptoms')}
              badge={symptoms.filter(s => s.is_flagged).length || undefined}
            />
            <NavButton 
              icon={FileBarChart} 
              label="Reports" 
              active={activeTab === 'reports'} 
              onClick={() => navigateToTab('reports')} 
            />
            <NavButton 
              icon={UserCircle} 
              label="Profile" 
              active={activeTab === 'profile'} 
              onClick={() => navigateToTab('profile')} 
            />
          </nav>
          
          <div className="p-4 border-t shrink-0">
            <button
              onClick={() => {
                console.log('Sign out clicked');
                handleLogout();
              }}
              className="w-full text-left px-4 py-3 rounded-lg font-medium transition text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </aside>

        {}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

const NavButton: React.FC<{
  icon: React.FC<any>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <span className="flex items-center gap-3">
      <Icon size={20} />
      {label}
    </span>
    {badge && badge > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        active ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

const SignupInitial: React.FC<{ 
  onSignupInit: (email: string, password: string) => void; 
  onSwitchToLogin: () => void; 
}> = ({ onSignupInit, onSwitchToLogin }) => {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="gradient-primary w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <User className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-2">Start your health tracking journey</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            onSignupInit(email, password);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              name="email" type="email" required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              name="password" type="password" required minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="•••••••• (at least 6 characters)"
            />
          </div>

          <button 
            type="submit" 
            className="w-full gradient-primary text-white py-3 rounded-xl font-medium hover:opacity-90 transition shadow-lg shadow-indigo-200"
          >
            Continue
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onSwitchToLogin} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatView: React.FC<{ 
  messages: Message[]; 
  input: string; 
  setInput: (val: string) => void; 
  sendMessage: () => void; 
  isLoading: boolean; 
  chatContainerRef: React.RefObject<HTMLDivElement | null>; 
}> = ({ messages, input, setInput, sendMessage, isLoading, chatContainerRef }) => (
  <div className="flex flex-col h-full">
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bot className="text-white" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Q&Aid</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            I'm your AI health assistant. Tell me about any symptoms or health concerns 
            you're experiencing, and I'll help you track them.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['I have a headache', 'Feeling tired lately', 'Having trouble sleeping'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} message={msg} />
      ))}
      
      {isLoading && <TypingIndicator />}
    </div>

    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
          placeholder="Describe your symptoms..." 
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" 
        />
        <button 
          onClick={sendMessage} 
          disabled={isLoading || !input.trim()} 
          className="gradient-primary text-white px-6 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  </div>
);

const SymptomsView: React.FC<{ symptoms: ApiSymptom[] }> = ({ symptoms }) => (
  <div className="p-6 max-w-5xl mx-auto">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Symptom History</h2>
    {symptoms.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No symptoms recorded yet.</p>
        <p className="text-sm text-gray-400 mt-1">Start chatting to track your symptoms.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {symptoms.map((symptom) => (
          <div 
            key={symptom.id} 
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition card-hover"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                  symptom.severity === 'severe' ? 'severity-severe' :
                  symptom.severity === 'moderate' ? 'severity-moderate' : 'severity-mild'
                }`} />
                <div>
                  <h3 className="font-semibold text-gray-800">{symptom.description}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptom.severity && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                        {symptom.severity}
                      </span>
                    )}
                    {symptom.duration && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {symptom.duration}
                      </span>
                    )}
                    {symptom.frequency && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                        {symptom.frequency}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                symptom.is_flagged 
                  ? 'bg-red-100 text-red-700' 
                  : symptom.is_ongoing 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
              }`}>
                {symptom.is_flagged ? '⚠️ Flagged' : symptom.is_ongoing ? 'Ongoing' : '✓ Resolved'}
              </span>
            </div>
            {symptom.flagged_reason && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                {symptom.flagged_reason}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Recorded: {new Date(symptom.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ReportsView: React.FC<{ 
  reports: ApiReport[]; 
  generateReport: () => void; 
  isLoading: boolean; 
}> = ({ reports, generateReport, isLoading }) => (
  <div className="p-6 max-w-5xl mx-auto">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">Medical Reports</h2>
      <button 
        onClick={generateReport} 
        disabled={isLoading} 
        className="gradient-primary text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileBarChart size={18} />
            Generate Report
          </>
        )}
      </button>
    </div>
    {reports.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No reports generated yet.</p>
        <p className="text-sm text-gray-400 mt-1">Reports are created when concerning patterns are detected.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-6 card-hover">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{report.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                report.priority === 'high' 
                  ? 'bg-red-100 text-red-700' 
                  : report.priority === 'moderate' 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {report.priority.toUpperCase()} PRIORITY
              </span>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">{report.summary}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
              <span>
                {report.sent_to_doctor 
                  ? `✓ Sent to: ${report.doctor_email}` 
                  : '⚠️ Not sent to doctor'
                }
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ProfileView: React.FC<{ 
  user: any; 
  onLogout: () => void; 
  onProfileUpdated: () => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}> = ({ user, onLogout, onProfileUpdated, onShowToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    date_of_birth: user.date_of_birth || '',
    blood_type: user.blood_type || '',
    gender: user.gender || '',
    phone: user.phone || '',
    smoker: user.smoker || '',
    doctor_name: user.doctor_name || '',
    doctor_email: user.doctor_email || '',
    doctor_phone: user.doctor_phone || '',
    medications: user.medications || '',
    diagnoses: user.diagnoses || '',
    allergies: user.allergies || '',
    family_history: user.family_history || '',
  });

  const startEditing = () => {
    setFormData({
      name: user.name || '',
      date_of_birth: user.date_of_birth || '',
      blood_type: user.blood_type || '',
      gender: user.gender || '',
      phone: user.phone || '',
      smoker: user.smoker || '',
      doctor_name: user.doctor_name || '',
      doctor_email: user.doctor_email || '',
      doctor_phone: user.doctor_phone || '',
      medications: user.medications || '',
      diagnoses: user.diagnoses || '',
      allergies: user.allergies || '',
      family_history: user.family_history || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      onShowToast('Name is required.', 'error');
      return;
    }
    if (!formData.gender) {
      onShowToast('Gender is required.', 'error');
      return;
    }
    if (!formData.date_of_birth) {
      onShowToast('Date of birth is required.', 'error');
      return;
    }
    if (!formData.smoker) {
      onShowToast('Smoking status is required.', 'error');
      return;
    }
    if (!formData.blood_type) {
      onShowToast('Blood type is required.', 'error');
      return;
    }
    if (!formData.doctor_email.trim()) {
      onShowToast('Doctor email is required to send reports.', 'error');
      return;
    }

    setSaving(true);
    try {
      const derivedAge = calculateAgeFromDate(formData.date_of_birth);
      const response = await userProfileAPI.updateProfile({
        name: formData.name || null,
        date_of_birth: formData.date_of_birth || null,
        age: typeof derivedAge === 'number' ? derivedAge : null,
        blood_type: formData.blood_type || null,
        gender: formData.gender || null,
        phone: formData.phone || null,
        smoker: formData.smoker || null,
        doctor_name: formData.doctor_name || null,
        doctor_email: formData.doctor_email,
        doctor_phone: formData.doctor_phone || null,
        medications: formData.medications || null,
        diagnoses: formData.diagnoses || null,
        allergies: formData.allergies || null,
        family_history: formData.family_history || null,
      });
      console.log('Profile update response:', response);

      await onProfileUpdated();
      setIsEditing(false);
      onShowToast('Profile updated successfully.', 'success');
    } catch (error: any) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Failed to update profile.';
      onShowToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 font-medium hover:bg-indigo-50 transition"
          >
            Edit Profile
          </button>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
          <div className="gradient-primary w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <User className="text-white" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{user.name || 'Name not set'}</h3>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-400 mt-1">
              Ensure your doctor's email is set so reports reach them automatically.
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Fields marked with <span className="text-red-500">*</span> are required.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Full Name" value={formData.name} onChange={v => handleInputChange('name', v)} required />
              <InputField
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={v => handleInputChange('date_of_birth', v)}
                required
              />
              <SelectField
                label="Gender"
                value={formData.gender}
                onChange={v => handleInputChange('gender', v)}
                options={GENDER_OPTIONS.map(option => ({ label: option, value: option }))}
                required
              />
              <SelectField
                label="Blood Type"
                value={formData.blood_type}
                onChange={v => handleInputChange('blood_type', v)}
                options={BLOOD_TYPES.map(option => ({ label: option, value: option }))}
                required
              />
              <InputField label="Phone" value={formData.phone} onChange={v => handleInputChange('phone', v)} />
              <SelectField
                label="Smoking Status"
                value={formData.smoker}
                onChange={v => handleInputChange('smoker', v)}
                options={SMOKING_STATUS_OPTIONS}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Doctor's Name" value={formData.doctor_name} onChange={v => handleInputChange('doctor_name', v)} />
              <InputField label="Doctor's Email" value={formData.doctor_email} onChange={v => handleInputChange('doctor_email', v)} required />
              <InputField label="Doctor's Phone" value={formData.doctor_phone} onChange={v => handleInputChange('doctor_phone', v)} />
            </div>

            <TextareaField label="Current Medications" value={formData.medications} onChange={v => handleInputChange('medications', v)} placeholder="e.g., Metformin 500mg twice daily" />
            <TextareaField label="Chronic Illnesses" value={formData.diagnoses} onChange={v => handleInputChange('diagnoses', v)} placeholder="e.g., Type 2 Diabetes, Asthma" />
            <TextareaField label="Allergies" value={formData.allergies} onChange={v => handleInputChange('allergies', v)} placeholder="e.g., Penicillin, Peanuts" />
            <TextareaField label="Family Medical History" value={formData.family_history} onChange={v => handleInputChange('family_history', v)} placeholder="e.g., Heart disease on father's side" />

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField label="Date of Birth" value={formatDate(user.date_of_birth)} />
              <ProfileField label="Blood Type" value={user.blood_type} />
              <ProfileField label="Gender" value={user.gender} />
              <ProfileField label="Phone" value={user.phone} />
              <ProfileField label="Smoking Status" value={user.smoker} />
              <ProfileField label="Doctor's Name" value={user.doctor_name} />
              <ProfileField label="Doctor's Email" value={user.doctor_email} />
              <ProfileField label="Doctor's Phone" value={user.doctor_phone} />
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <ProfileField label="Current Medications" value={user.medications} fullWidth />
              <ProfileField label="Chronic Illnesses" value={user.diagnoses} fullWidth />
              <ProfileField label="Allergies" value={user.allergies} fullWidth />
              <ProfileField label="Family Medical History" value={user.family_history} fullWidth />
            </div>
          </>
        )}

        <button 
          onClick={() => {
            console.log('Profile sign out clicked');
            onLogout();
          }} 
          className="w-full mt-6 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition flex items-center justify-center gap-2"
        >
          <LogOut size={20} /> Sign Out
        </button>
      </div>
    </div>
  );
};

const ProfileField: React.FC<{ label: string; value?: string; fullWidth?: boolean }> = ({ 
  label, 
  value, 
  fullWidth 
}) => (
  <div className={fullWidth ? 'col-span-full' : ''}>
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="font-medium text-gray-800">{value || 'Not provided'}</p>
  </div>
);

const InputField: React.FC<{ label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }> = ({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}> = ({ label, value, onChange, options, required = false }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
    >
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const TextareaField: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string }> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-600">{label}</label>
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />
  </div>
);

const Toast: React.FC<{ 
  message: string; 
  type: 'success' | 'error' | 'warning'; 
  onDismiss: () => void; 
}> = ({ message, type, onDismiss }) => {
  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
  };
  
  return (
    <div className={`fixed top-5 right-5 ${bgColors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 max-w-md animate-slide-in`}>
      <p className="text-sm">{message}</p>
      <button onClick={onDismiss} className="text-white/80 hover:text-white ml-2">
        <X size={18} />
      </button>
    </div>
  );
};

export default App;
