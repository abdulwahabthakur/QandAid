import React, { useEffect, useState } from 'react';
import { 
  Activity, AlertTriangle, Bell, CheckCircle, Clock, 
  Heart, MessageSquare, TrendingUp, FileText, ChevronRight,
  AlertCircle, X
} from 'lucide-react';
import { Symptom as ApiSymptom } from '../../lib/api';

interface RiskFlag {
  id: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  flag_type: string;
  description: string;
  is_acknowledged: boolean;
  created_at: string;
}

interface DashboardProps {
  symptoms: ApiSymptom[];
  onNavigateToChat: () => void;
  onGenerateReport: () => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  symptoms, 
  onNavigateToChat, 
  onGenerateReport,
  isLoading = false 
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  
  const activeSymptoms = symptoms.filter(s => s.is_ongoing !== false).length;
  const flaggedSymptoms = symptoms.filter(s => s.is_flagged);
  const severeSymptoms = symptoms.filter(s => s.severity === 'severe');
  const recentSymptoms = symptoms.slice(0, 5);

  const riskFlags: RiskFlag[] = flaggedSymptoms.map((s, i) => ({
    id: s.id || i,
    risk_level: s.severity === 'severe' ? 'high' : 'moderate',
    flag_type: 'symptom_flag',
    description: s.flagged_reason || `${s.description} requires attention`,
    is_acknowledged: dismissedAlerts.includes(s.id || i),
    created_at: s.created_at,
  }));

  const unresolvedFlags = riskFlags.filter(f => !f.is_acknowledged);
  const hasCriticalAlerts = unresolvedFlags.some(f => f.risk_level === 'critical' || f.risk_level === 'high');

  const acknowledgeAlert = (id: number) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-500';
      case 'moderate': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'critical': return 'risk-critical border';
      case 'high': return 'risk-high border';
      case 'moderate': return 'risk-moderate border';
      default: return 'risk-low border';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {}
      {unresolvedFlags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Bell className="text-red-500" size={20} />
            Active Alerts
          </h2>
          <div className="space-y-3">
            {unresolvedFlags.map((flag) => (
              <div
                key={flag.id}
                className={`p-4 rounded-lg border-l-4 flex items-start justify-between ${
                  flag.risk_level === 'critical' || flag.risk_level === 'high'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle 
                    className={flag.risk_level === 'critical' || flag.risk_level === 'high' 
                      ? 'text-red-500' 
                      : 'text-yellow-500'
                    } 
                    size={20} 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getRiskBadgeClass(flag.risk_level)}`}>
                        {flag.risk_level}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-800">{flag.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(flag.id)}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="Dismiss alert"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Symptoms</p>
              <p className="text-3xl font-bold text-gray-900">{activeSymptoms}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Activity className="text-indigo-600" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Currently being tracked</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Tracked</p>
              <p className="text-3xl font-bold text-gray-900">{symptoms.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">All-time symptoms logged</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Risk Flags</p>
              <p className="text-3xl font-bold text-gray-900">{flaggedSymptoms.length}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              hasCriticalAlerts ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {hasCriticalAlerts ? (
                <AlertCircle className="text-red-600" size={24} />
              ) : (
                <CheckCircle className="text-green-600" size={24} />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {hasCriticalAlerts ? (
              <span className="text-red-600 font-medium">Attention needed</span>
            ) : (
              <span className="text-green-600">All clear</span>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="text-pink-500" size={18} />
              Recent Symptoms
            </h3>
            <span className="text-sm text-gray-400">Last 5</span>
          </div>
          
          {recentSymptoms.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">No symptoms recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a chat to track your symptoms</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentSymptoms.map((symptom) => (
                <div key={symptom.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(symptom.severity)}`} />
                      <div>
                        <p className="font-medium text-gray-800">{symptom.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="capitalize">{symptom.severity ?? 'unknown'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(symptom.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {symptom.is_flagged && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        Flagged
                      </span>
                    )}
                  </div>
                  {symptom.flagged_reason && (
                    <p className="mt-2 ml-5 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded">
                      {symptom.flagged_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={onNavigateToChat}
                className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-indigo-600" size={20} />
                  <span className="font-medium text-indigo-900">Log New Symptoms</span>
                </div>
                <ChevronRight className="text-indigo-400 group-hover:translate-x-1 transition-transform" size={18} />
              </button>

              <button
                onClick={onGenerateReport}
                disabled={symptoms.length === 0 || isLoading}
                className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-purple-600" size={20} />
                  <span className="font-medium text-purple-900">
                    {isLoading ? 'Generating...' : 'Send Report to Doctor'}
                  </span>
                </div>
                <ChevronRight className="text-purple-400 group-hover:translate-x-1 transition-transform" size={18} />
              </button>
            </div>
          </div>

          {}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-3">💡 Health Tip</h3>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Keeping a consistent log of your symptoms helps your doctor identify patterns 
              and provide better care. Try to note when symptoms occur and any potential triggers.
            </p>
          </div>

          {}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Severity Guide</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full severity-mild" />
                <div>
                  <p className="font-medium text-gray-800 text-sm">Mild</p>
                  <p className="text-xs text-gray-500">Minor discomfort, doesn't affect daily activities</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full severity-moderate" />
                <div>
                  <p className="font-medium text-gray-800 text-sm">Moderate</p>
                  <p className="text-xs text-gray-500">Noticeable impact on daily activities</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full severity-severe" />
                <div>
                  <p className="font-medium text-gray-800 text-sm">Severe</p>
                  <p className="text-xs text-gray-500">Significant impact, may need medical attention</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

