"""
Q&Aid Python ML Microservice
Advanced symptom pattern analysis and risk prediction
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Q&Aid ML Analysis Service",
    description="Advanced symptom pattern analysis and risk prediction for health tracking",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:5000",
        os.getenv("BACKEND_URL", "http://localhost:5000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================== Data Models ==================

class Symptom(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    severity: str  # mild, moderate, severe
    duration_days: int = 0
    frequency: Optional[str] = None
    is_flagged: bool = False
    first_occurred_at: Optional[str] = None
    last_occurred_at: Optional[str] = None


class MedicalHistory(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    chronic_conditions: List[str] = []
    current_medications: List[str] = []
    allergies: List[str] = []
    smoking_status: Optional[str] = None
    family_history: List[str] = []


class AnalysisRequest(BaseModel):
    symptoms: List[Symptom]
    medical_history: MedicalHistory


class PatternInfo(BaseModel):
    pattern_name: str
    description: str
    confidence: float
    related_symptoms: List[str]


class AnalysisResponse(BaseModel):
    risk_score: float
    risk_level: str
    patterns: List[PatternInfo]
    recommendations: List[str]
    urgency_level: str
    should_notify_doctor: bool


# ================== Symptom Patterns Database ==================

SYMPTOM_CLUSTERS = {
    "migraine_pattern": {
        "symptoms": ["headache", "nausea", "light sensitivity", "vision changes", "aura"],
        "description": "Symptoms consistent with migraine pattern",
        "severity_multiplier": 1.3
    },
    "flu_pattern": {
        "symptoms": ["fever", "body aches", "fatigue", "chills", "headache", "cough", "sore throat"],
        "description": "Symptoms suggestive of viral infection / flu-like illness",
        "severity_multiplier": 1.2
    },
    "anxiety_pattern": {
        "symptoms": ["heart racing", "chest tightness", "shortness of breath", "dizziness", "sweating", "trembling"],
        "description": "Symptoms consistent with anxiety or panic pattern",
        "severity_multiplier": 1.1
    },
    "gi_pattern": {
        "symptoms": ["nausea", "abdominal pain", "diarrhea", "vomiting", "bloating", "cramping"],
        "description": "Gastrointestinal disturbance pattern",
        "severity_multiplier": 1.2
    },
    "cardiac_warning": {
        "symptoms": ["chest pain", "shortness of breath", "arm pain", "jaw pain", "sweating", "nausea"],
        "description": "CRITICAL: Symptoms requiring immediate cardiac evaluation",
        "severity_multiplier": 2.0
    },
    "respiratory_pattern": {
        "symptoms": ["cough", "shortness of breath", "wheezing", "chest tightness", "difficulty breathing"],
        "description": "Respiratory symptoms requiring attention",
        "severity_multiplier": 1.4
    }
}

RED_FLAG_SYMPTOMS = [
    "chest pain", "difficulty breathing", "severe headache", "sudden confusion",
    "numbness", "weakness on one side", "slurred speech", "vision loss",
    "blood in stool", "blood in urine", "coughing blood", "severe abdominal pain",
    "high fever", "seizure", "loss of consciousness"
]


# ================== Analysis Functions ==================

def calculate_severity_score(symptoms: List[Symptom]) -> float:
    """Calculate weighted severity score from symptoms"""
    if not symptoms:
        return 0.0
    
    severity_weights = {"mild": 0.3, "moderate": 0.6, "severe": 1.0}
    
    total_score = 0.0
    for symptom in symptoms:
        base_score = severity_weights.get(symptom.severity.lower(), 0.3)
        
        # Duration factor (longer = higher risk)
        duration_factor = 1.0
        if symptom.duration_days > 90:  # Chronic (3+ months)
            duration_factor = 1.5
        elif symptom.duration_days > 30:  # 1+ month
            duration_factor = 1.3
        elif symptom.duration_days > 7:  # 1+ week
            duration_factor = 1.1
        
        # Frequency factor
        frequency_factor = 1.0
        if symptom.frequency:
            freq_lower = symptom.frequency.lower()
            if "constant" in freq_lower or "always" in freq_lower:
                frequency_factor = 1.4
            elif "frequent" in freq_lower or "often" in freq_lower:
                frequency_factor = 1.2
        
        total_score += base_score * duration_factor * frequency_factor
    
    return total_score


def detect_patterns(symptoms: List[Symptom]) -> List[PatternInfo]:
    """Detect symptom patterns using clustering logic"""
    patterns = []
    symptom_names = [s.name.lower() for s in symptoms]
    symptom_descs = [s.description.lower() if s.description else "" for s in symptoms]
    all_text = " ".join(symptom_names + symptom_descs)
    
    for pattern_name, pattern_data in SYMPTOM_CLUSTERS.items():
        matching_symptoms = []
        for pattern_symptom in pattern_data["symptoms"]:
            if pattern_symptom in all_text:
                matching_symptoms.append(pattern_symptom)
        
        # Need at least 2 matching symptoms for a pattern
        if len(matching_symptoms) >= 2:
            confidence = len(matching_symptoms) / len(pattern_data["symptoms"])
            patterns.append(PatternInfo(
                pattern_name=pattern_name.replace("_", " ").title(),
                description=pattern_data["description"],
                confidence=round(confidence, 2),
                related_symptoms=matching_symptoms
            ))
    
    # Sort by confidence
    patterns.sort(key=lambda x: x.confidence, reverse=True)
    return patterns


def check_red_flags(symptoms: List[Symptom]) -> List[str]:
    """Check for red flag symptoms requiring immediate attention"""
    flags = []
    for symptom in symptoms:
        text = f"{symptom.name} {symptom.description or ''}".lower()
        for red_flag in RED_FLAG_SYMPTOMS:
            if red_flag in text:
                flags.append(red_flag)
    return list(set(flags))


def calculate_risk_score(
    symptoms: List[Symptom], 
    history: MedicalHistory,
    patterns: List[PatternInfo],
    red_flags: List[str]
) -> float:
    """Calculate overall risk score 0.0 - 1.0"""
    score = 0.0
    
    # Base severity score (0-3 typically)
    severity_score = calculate_severity_score(symptoms)
    score += min(severity_score / 3.0, 0.4)  # Cap at 0.4
    
    # Pattern multipliers
    for pattern in patterns:
        if pattern.confidence >= 0.5:
            cluster_data = SYMPTOM_CLUSTERS.get(pattern.pattern_name.lower().replace(" ", "_"), {})
            multiplier = cluster_data.get("severity_multiplier", 1.0)
            score *= multiplier
    
    # Red flags add significant risk
    if red_flags:
        score += 0.3 * len(red_flags)
    
    # Medical history factors
    if history.chronic_conditions:
        score += 0.1 * min(len(history.chronic_conditions), 3)
    
    if history.smoking_status == "current":
        score += 0.1
    
    if history.age and history.age >= 65:
        score += 0.1
    elif history.age and history.age >= 50:
        score += 0.05
    
    # Family history
    if history.family_history:
        high_risk_conditions = ["heart disease", "cancer", "diabetes", "stroke"]
        for condition in history.family_history:
            if any(risk in condition.lower() for risk in high_risk_conditions):
                score += 0.05
    
    return min(score, 1.0)  # Cap at 1.0


def determine_risk_level(score: float) -> str:
    """Convert risk score to categorical level"""
    if score >= 0.8:
        return "critical"
    elif score >= 0.6:
        return "high"
    elif score >= 0.4:
        return "moderate"
    else:
        return "low"


def determine_urgency(score: float, red_flags: List[str], patterns: List[PatternInfo]) -> str:
    """Determine urgency level for action"""
    # Check for cardiac warning pattern
    for pattern in patterns:
        if "cardiac" in pattern.pattern_name.lower() and pattern.confidence >= 0.5:
            return "critical"
    
    if red_flags:
        return "high"
    
    if score >= 0.7:
        return "high"
    elif score >= 0.5:
        return "moderate"
    else:
        return "low"


def generate_recommendations(
    risk_score: float, 
    risk_level: str,
    patterns: List[PatternInfo], 
    red_flags: List[str],
    history: MedicalHistory,
    symptoms: List[Symptom]
) -> List[str]:
    """Generate actionable recommendations"""
    recommendations = []
    
    # Critical/High risk
    if risk_level in ["critical", "high"]:
        if red_flags:
            recommendations.append(
                f"URGENT: Red flag symptoms detected ({', '.join(red_flags[:3])}). "
                "Seek immediate medical attention."
            )
        recommendations.append("Schedule urgent appointment with healthcare provider within 24-48 hours")
        recommendations.append("Document all symptoms with timestamps for your doctor")
    
    # Moderate risk
    elif risk_level == "moderate":
        recommendations.append("Schedule appointment with primary care physician within 1-2 weeks")
        recommendations.append("Monitor symptoms for any changes or worsening")
        recommendations.append("Keep a symptom diary noting triggers and patterns")
    
    # Low risk
    else:
        recommendations.append("Continue monitoring symptoms")
        recommendations.append("Maintain healthy lifestyle habits")
        recommendations.append("Schedule routine check-up if symptoms persist beyond 2 weeks")
    
    # Pattern-specific recommendations
    for pattern in patterns[:2]:  # Top 2 patterns
        if "migraine" in pattern.pattern_name.lower():
            recommendations.append("Consider tracking potential migraine triggers (food, sleep, stress)")
        elif "anxiety" in pattern.pattern_name.lower():
            recommendations.append("Consider stress management techniques and adequate sleep")
        elif "gi" in pattern.pattern_name.lower():
            recommendations.append("Monitor diet and consider food diary to identify triggers")
        elif "respiratory" in pattern.pattern_name.lower():
            recommendations.append("Avoid known respiratory irritants; monitor for worsening")
    
    # Chronic symptom advice
    chronic_symptoms = [s for s in symptoms if s.duration_days > 90]
    if chronic_symptoms:
        recommendations.append(
            f"{len(chronic_symptoms)} chronic symptom(s) detected. "
            "Discuss long-term management strategies with your doctor."
        )
    
    # Medical history considerations
    if history.chronic_conditions:
        recommendations.append("Review symptoms in context of existing conditions with your healthcare provider")
    
    return recommendations[:6]  # Return top 6 recommendations


# ================== API Endpoints ==================

@app.get("/health")
def health_check():
    """Service health check endpoint"""
    return {
        "status": "healthy",
        "service": "qandaid-ml-analysis",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.post("/analyze-symptoms", response_model=AnalysisResponse)
async def analyze_symptoms(request: AnalysisRequest):
    """
    Analyze symptoms using ML patterns and risk scoring
    
    Returns comprehensive analysis including:
    - Risk score (0-1)
    - Risk level (low/moderate/high/critical)
    - Detected patterns
    - Recommendations
    - Urgency level
    """
    try:
        if not request.symptoms:
            return AnalysisResponse(
                risk_score=0.0,
                risk_level="low",
                patterns=[],
                recommendations=["No symptoms provided for analysis"],
                urgency_level="low",
                should_notify_doctor=False
            )
        
        # Detect patterns
        patterns = detect_patterns(request.symptoms)
        
        # Check for red flags
        red_flags = check_red_flags(request.symptoms)
        
        # Calculate risk score
        risk_score = calculate_risk_score(
            request.symptoms, 
            request.medical_history,
            patterns,
            red_flags
        )
        
        # Determine levels
        risk_level = determine_risk_level(risk_score)
        urgency = determine_urgency(risk_score, red_flags, patterns)
        
        # Generate recommendations
        recommendations = generate_recommendations(
            risk_score,
            risk_level,
            patterns,
            red_flags,
            request.medical_history,
            request.symptoms
        )
        
        # Determine if doctor should be notified
        should_notify = (
            risk_level in ["high", "critical"] or 
            len(red_flags) > 0 or
            len([s for s in request.symptoms if s.duration_days > 90]) >= 2
        )
        
        return AnalysisResponse(
            risk_score=round(risk_score, 3),
            risk_level=risk_level,
            patterns=patterns,
            recommendations=recommendations,
            urgency_level=urgency,
            should_notify_doctor=should_notify
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.post("/detect-patterns")
async def detect_symptom_patterns(symptoms: List[Symptom]):
    """
    Detect symptom patterns only (lightweight endpoint)
    """
    try:
        patterns = detect_patterns(symptoms)
        red_flags = check_red_flags(symptoms)
        
        return {
            "patterns": [p.dict() for p in patterns],
            "red_flags": red_flags,
            "pattern_count": len(patterns),
            "has_red_flags": len(red_flags) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate-risk")
async def calculate_risk_only(request: AnalysisRequest):
    """
    Calculate risk score only (lightweight endpoint)
    """
    try:
        patterns = detect_patterns(request.symptoms)
        red_flags = check_red_flags(request.symptoms)
        
        risk_score = calculate_risk_score(
            request.symptoms,
            request.medical_history,
            patterns,
            red_flags
        )
        
        return {
            "risk_score": round(risk_score, 3),
            "risk_level": determine_risk_level(risk_score),
            "factors": {
                "severity_score": round(calculate_severity_score(request.symptoms), 2),
                "pattern_count": len(patterns),
                "red_flag_count": len(red_flags),
                "chronic_symptoms": len([s for s in request.symptoms if s.duration_days > 90])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================== Main ==================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting Q&Aid ML Service on {host}:{port}")
    uvicorn.run(app, host=host, port=port)

