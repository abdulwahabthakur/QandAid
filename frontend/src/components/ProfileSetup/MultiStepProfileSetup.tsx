import React, { useState } from 'react';
import { User, Stethoscope, Heart, ArrowRight, ArrowLeft, Check, Plus, X } from 'lucide-react';

interface ProfileSetupProps {
  onComplete: (profileData: any) => Promise<void>;
  initialEmail?: string;
  initialPassword?: string;
}

interface BasicInfo {
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  phone: string;
}

interface MedicalHistory {
  smokingStatus: 'never' | 'former' | 'current' | '';
  smokingFrequency: string;
  alcoholConsumption: string;
  exerciseFrequency: string;
  chronicConditions: string[];
  allergies: string[];
  medications: { name: string; dosage: string; frequency: string }[];
  pastSurgeries: string[];
  familyHistory: string[];
}

interface DoctorInfo {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

interface ArrayInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  items: string[];
  onRemove: (i: number) => void;
  placeholder: string;
}

const ArrayInput: React.FC<ArrayInputProps> = ({
  label,
  value,
  onChange,
  onAdd,
  items,
  onRemove,
  placeholder,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
        >
          <Plus size={20} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const MultiStepProfileSetup: React.FC<ProfileSetupProps> = ({ 
  onComplete, 
  initialEmail = '', 
  initialPassword = '' 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorInfoError, setDoctorInfoError] = useState('');
  
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    name: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    phone: '',
  });
  
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({
    smokingStatus: '',
    smokingFrequency: '',
    alcoholConsumption: '',
    exerciseFrequency: '',
    chronicConditions: [],
    allergies: [],
    medications: [],
    pastSurgeries: [],
    familyHistory: [],
  });
  
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({
    doctorName: '',
    doctorEmail: '',
    doctorPhone: '',
  });

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [newFamilyHistory, setNewFamilyHistory] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '' });

  const isBasicInfoValid = Boolean(basicInfo.name.trim() && basicInfo.dateOfBirth);
  const isDoctorInfoValid = Boolean(
    doctorInfo.doctorName.trim() &&
    doctorInfo.doctorEmail.trim()
  );

  const calculateAge = (dob: string): number | undefined => {
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

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isDoctorInfoValid) {
      setDoctorInfoError('Doctor name and email are required so reports reach your provider.');
      return;
    }

    setDoctorInfoError('');
    setIsSubmitting(true);
    
    const profileData = {
      email: initialEmail,
      password: initialPassword,
      name: basicInfo.name,
      age: calculateAge(basicInfo.dateOfBirth),
      date_of_birth: basicInfo.dateOfBirth || undefined,
      gender: basicInfo.gender || undefined,
      blood_type: basicInfo.bloodType || undefined,
      phone: basicInfo.phone || undefined,
      smoker: medicalHistory.smokingStatus || undefined,
      smoking_frequency: medicalHistory.smokingFrequency || undefined,
      alcohol_consumption: medicalHistory.alcoholConsumption || undefined,
      exercise_frequency: medicalHistory.exerciseFrequency || undefined,
      diagnoses: medicalHistory.chronicConditions.length > 0 
        ? medicalHistory.chronicConditions.join(', ') 
        : undefined,
      allergies: medicalHistory.allergies.length > 0 
        ? medicalHistory.allergies.join(', ') 
        : undefined,
      medications: medicalHistory.medications.length > 0 
        ? JSON.stringify(medicalHistory.medications) 
        : undefined,
      past_surgeries: medicalHistory.pastSurgeries.length > 0 
        ? medicalHistory.pastSurgeries.join(', ') 
        : undefined,
      family_history: medicalHistory.familyHistory.length > 0 
        ? medicalHistory.familyHistory.join(', ') 
        : undefined,
      doctor_name: doctorInfo.doctorName || undefined,
      doctor_email: doctorInfo.doctorEmail || undefined,
      doctor_phone: doctorInfo.doctorPhone || undefined,
    };

    try {
      await onComplete(profileData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArrayItem = (
    field: keyof MedicalHistory, 
    value: string, 
    setter: (v: string) => void
  ) => {
    if (value.trim()) {
      setMedicalHistory(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()],
      }));
      setter('');
    }
  };

  const removeArrayItem = (field: keyof MedicalHistory, index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  const addMedication = () => {
    if (newMedication.name.trim()) {
      setMedicalHistory(prev => ({
        ...prev,
        medications: [...prev.medications, { ...newMedication }],
      }));
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  const removeMedication = (index: number) => {
    setMedicalHistory(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              currentStep > step
                ? 'step-completed'
                : currentStep === step
                ? 'step-active'
                : 'step-pending'
            }`}
          >
            {currentStep > step ? <Check size={18} /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 rounded ${
                currentStep > step ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <StepIndicator />

        {}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-indigo-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Basic Information</h2>
              <p className="text-gray-500 mt-1">Tell us about yourself</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={basicInfo.name}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={basicInfo.dateOfBirth}
                onChange={(e) => setBasicInfo({ ...basicInfo, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={basicInfo.gender}
                  onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
                <select
                  value={basicInfo.bloodType}
                  onChange={(e) => setBasicInfo({ ...basicInfo, bloodType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select blood type</option>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={basicInfo.phone}
                onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        )}

        {}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-pink-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Medical History</h2>
              <p className="text-gray-500 mt-1">Help us understand your health background</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label>
                <select
                  value={medicalHistory.smokingStatus}
                  onChange={(e) => setMedicalHistory({ 
                    ...medicalHistory, 
                    smokingStatus: e.target.value as any,
                    smokingFrequency: e.target.value !== 'current' ? '' : medicalHistory.smokingFrequency
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select status</option>
                  <option value="never">Never smoked</option>
                  <option value="former">Former smoker</option>
                  <option value="current">Current smoker</option>
                </select>
              </div>

              {medicalHistory.smokingStatus === 'current' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Frequency</label>
                  <select
                    value={medicalHistory.smokingFrequency}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, smokingFrequency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select frequency</option>
                    <option value="occasionally">Occasionally</option>
                    <option value="daily">Daily</option>
                    <option value="heavy">Heavy (10+ per day)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alcohol Consumption</label>
                <select
                  value={medicalHistory.alcoholConsumption}
                  onChange={(e) => setMedicalHistory({ ...medicalHistory, alcoholConsumption: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select level</option>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Frequency</label>
                <select
                  value={medicalHistory.exerciseFrequency}
                  onChange={(e) => setMedicalHistory({ ...medicalHistory, exerciseFrequency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select frequency</option>
                  <option value="none">Sedentary</option>
                  <option value="light">Light (1-2x/week)</option>
                  <option value="moderate">Moderate (3-4x/week)</option>
                  <option value="active">Active (5+x/week)</option>
                </select>
              </div>
            </div>

            <ArrayInput
              label="Chronic Conditions"
              value={newCondition}
              onChange={setNewCondition}
              onAdd={() => addArrayItem('chronicConditions', newCondition, setNewCondition)}
              items={medicalHistory.chronicConditions}
              onRemove={(i) => removeArrayItem('chronicConditions', i)}
              placeholder="e.g., Diabetes, Hypertension"
            />

            <ArrayInput
              label="Allergies"
              value={newAllergy}
              onChange={setNewAllergy}
              onAdd={() => addArrayItem('allergies', newAllergy, setNewAllergy)}
              items={medicalHistory.allergies}
              onRemove={(i) => removeArrayItem('allergies', i)}
              placeholder="e.g., Penicillin, Peanuts"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Medication name"
                />
                <input
                  type="text"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dosage"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Frequency"
                  />
                  <button
                    type="button"
                    onClick={addMedication}
                    className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              {medicalHistory.medications.length > 0 && (
                <div className="mt-2 space-y-2">
                  {medicalHistory.medications.map((med, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-sm">
                        <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ArrayInput
              label="Past Surgeries"
              value={newSurgery}
              onChange={setNewSurgery}
              onAdd={() => addArrayItem('pastSurgeries', newSurgery, setNewSurgery)}
              items={medicalHistory.pastSurgeries}
              onRemove={(i) => removeArrayItem('pastSurgeries', i)}
              placeholder="e.g., Appendectomy (2020)"
            />

            <ArrayInput
              label="Family Medical History"
              value={newFamilyHistory}
              onChange={setNewFamilyHistory}
              onAdd={() => addArrayItem('familyHistory', newFamilyHistory, setNewFamilyHistory)}
              items={medicalHistory.familyHistory}
              onRemove={(i) => removeArrayItem('familyHistory', i)}
              placeholder="e.g., Father - Heart Disease"
            />
          </div>
        )}

        {}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Doctor Information</h2>
              <p className="text-gray-500 mt-1">
                These details ensure alerts and reports reach your healthcare provider.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor's Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={doctorInfo.doctorName}
                onChange={(e) => {
                  setDoctorInfoError('');
                  setDoctorInfo({ ...doctorInfo, doctorName: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor's Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={doctorInfo.doctorEmail}
                onChange={(e) => {
                  setDoctorInfoError('');
                  setDoctorInfo({ ...doctorInfo, doctorEmail: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="doctor@clinic.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor's Phone <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="tel"
                value={doctorInfo.doctorPhone}
                onChange={(e) => {
                  setDoctorInfoError('');
                  setDoctorInfo({ ...doctorInfo, doctorPhone: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1 (555) 987-6543"
              />
            </div>

            {doctorInfoError && (
              <p className="text-sm text-red-600">{doctorInfoError}</p>
            )}
          </div>
        )}

        {}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStep === 1 && !isBasicInfoValid}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isDoctorInfoValid}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiStepProfileSetup;

