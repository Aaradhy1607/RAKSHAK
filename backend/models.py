"""
Pydantic Data Models & Schemas for Landslide Early Warning System
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "LOW"
    SAFE = "SAFE"
    WATCH = "WATCH"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class PriorityTier(str, Enum):
    P1 = "P1" # Immediate Emergency Intervention
    P2 = "P2" # Critical Response Required
    P3 = "P3" # Elevated / Warning Monitoring
    P4 = "P4" # Advisory / Watch Monitoring
    P5 = "P5" # Routine Surveillance / Low Priority

class RoadStatus(str, Enum):
    OPEN = "OPEN"
    AT_RISK = "AT_RISK"
    RESTRICTED = "RESTRICTED"
    BLOCKED = "BLOCKED"
    UNKNOWN = "UNKNOWN"

class IncidentStatus(str, Enum):
    NEW = "NEW"
    AWAITING_ACKNOWLEDGEMENT = "AWAITING_ACKNOWLEDGEMENT"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESPONSE_IN_PROGRESS = "RESPONSE_IN_PROGRESS"
    ESCALATED = "ESCALATED"
    AI_ASSESSED = "AI_ASSESSED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    FIELD_INSPECTION = "FIELD_INSPECTION"
    DISPATCHED = "DISPATCHED"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class DataSourceType(str, Enum):
    LIVE = "LIVE"
    OBSERVED = "OBSERVED"
    FORECAST = "FORECAST"
    MODEL_PREDICTION = "MODEL_PREDICTION"
    HISTORICAL = "HISTORICAL"
    SATELLITE = "SATELLITE"
    CITIZEN_REPORTED = "CITIZEN_REPORTED"
    SENSOR = "SENSOR"
    SIMULATION = "SIMULATION"
    DEMO_DATA = "DEMO_DATA"

# --- Request Schemas ---

class CitizenReportCreate(BaseModel):
    category: str = Field(..., description="Landslide, Road Blockage, Ground Crack, Slope Sinking, Rockfall")
    description: Optional[str] = ""
    latitude: float
    longitude: float
    accuracy_m: Optional[float] = 10.0
    district: Optional[str] = None
    state: Optional[str] = None
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_phone: Optional[str] = ""

class SOSTriggerCreate(BaseModel):
    latitude: float
    longitude: float
    accuracy_m: Optional[float] = 10.0
    emergency_type: str = "LANDSLIDE_TRAPPED"
    message: Optional[str] = "Immediate evacuation or assistance needed due to slope failure/blockage"
    people_affected: Optional[int] = 1
    contact_phone: Optional[str] = ""
    district: Optional[str] = None
    state: Optional[str] = None

class SOSStatusUpdate(BaseModel):
    status: IncidentStatus
    assigned_team: Optional[str] = None
    notes: Optional[str] = None
    updated_by: Optional[str] = "Command Officer"

class AlertDispatchCreate(BaseModel):
    title: str
    severity: RiskLevel
    district: str
    state: str
    message: str
    channels: List[str] = ["DASHBOARD", "EMAIL"]
    target_recipients: Optional[List[str]] = []

class WhatIfScenarioRequest(BaseModel):
    rainfall_multiplier: float = Field(1.0, ge=0.5, le=3.0, description="Multiplier on 24h precipitation (e.g. 1.5 = +50% surge)")
    soil_saturation_override: Optional[float] = Field(None, ge=10.0, le=100.0, description="Override raw soil moisture saturation %")
    blocked_highways: List[str] = Field(default_factory=list, description="Highway IDs to simulate as BLOCKED")
    target_state: Optional[str] = Field(None, description="Filter simulation to specific state, or all NER if None")

# --- Response Schemas ---

class FeatureFactor(BaseModel):
    feature_key: str
    label: str
    contribution_pct: float
    raw_value: float
    importance_rank: int
    influence_direction: Optional[str] = "POSITIVE" # POSITIVE (increases risk) or NEGATIVE (reduces risk)

class ForecastHorizon(BaseModel):
    horizon: str # "Current", "+6h", "+12h", "+24h", "+48h", "+72h"
    hours_ahead: int
    predicted_risk: RiskLevel
    probability: float
    rainfall_forecast_mm: float
    soil_moisture_pct: float
    confidence: float
    data_nature: DataSourceType

class VillageIsolationImpact(BaseModel):
    highway_id: str
    highway_name: str
    status: RoadStatus
    cut_off_villages: List[str]
    isolated_population_est: int
    critical_services_severed: List[str]
    alternate_footpath_or_airdrop_zones: List[str]
    lifeline_connectivity_score: float # 0 to 100

class LocationRiskDetail(BaseModel):
    id: str
    district: str
    state: str
    latitude: float
    longitude: float
    elevation_m: float
    slope_deg: float
    aspect_deg: float
    population: int
    current_risk: RiskLevel
    probability: float
    severity_score: float
    emergency_priority: PriorityTier
    priority_score: float
    priority_explanation: str
    confidence: float
    data_nature: DataSourceType
    data_freshness: str
    risk_trend: str # "INCREASING", "STABLE", "DECREASING"
    rainfall_1h_mm: float
    rainfall_6h_mm: float
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    soil_moisture_pct: float
    soil_saturation_state: str # "NORMAL", "HIGH", "SATURATED_PLATEAU"
    primary_factors: List[FeatureFactor]
    explanation_summary: str
    forecast_timeline: List[ForecastHorizon]
    nearby_highways: List[Dict[str, Any]]
    nearby_infrastructure: List[Dict[str, Any]]
    isolation_impact: Optional[VillageIsolationImpact] = None
    recommended_authority_actions: List[str]

class OverviewStats(BaseModel):
    timestamp: str
    total_monitored_districts: int
    active_critical_zones: int
    active_high_zones: int = 0
    active_warning_zones: int
    active_watch_zones: int
    active_low_zones: int = 0
    open_sos_count: int
    unverified_reports_count: int
    roads_at_risk_count: int
    exposed_population_count: int
    system_data_health: str # "HEALTHY", "DEGRADED", "OFFLINE"
    is_simulation_mode: bool
    simulation_step: Optional[int] = 0
    districts_summary: List[Dict[str, Any]]

class AIAssessmentResult(BaseModel):
    hazard_label: str
    hazard_detected: bool
    confidence: float
    detected_indicators: List[str]
    severity_rating: str
    recommendation: str
    disclaimer: str = "AI-assisted preliminary triage — does not replace certified geotechnical survey."

class CitizenReportOut(BaseModel):
    id: str
    category: str
    description: str
    latitude: float
    longitude: float
    district: str
    state: str
    status: IncidentStatus
    image_url: Optional[str] = None
    ai_assessment: Optional[AIAssessmentResult] = None
    created_at: str
    reporter_name: str
    reporter_phone: str
    cluster_id: Optional[str] = None

class ReportCluster(BaseModel):
    cluster_id: str
    centroid_lat: float
    centroid_lon: float
    district: str
    state: str
    report_count: int
    categories: List[str]
    reports: List[CitizenReportOut]
    earliest_report_at: str
    latest_report_at: str
    cluster_severity: str

class SOSIncidentOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    district: str
    state: str
    emergency_type: str
    message: str
    people_affected: int
    contact_phone: str
    status: IncidentStatus
    assigned_team: Optional[str]
    priority: PriorityTier
    created_at: str
    timeline: List[Dict[str, Any]]
    nearest_hospital: Optional[Dict[str, Any]]
    nearest_shelter: Optional[Dict[str, Any]]

class WhatIfScenarioResult(BaseModel):
    scenario_id: str
    timestamp: str
    baseline_critical_count: int
    projected_critical_count: int
    baseline_exposed_pop: int
    projected_exposed_pop: int
    rainfall_surge_pct: float
    soil_saturation_override_pct: Optional[float]
    projected_locations: List[LocationRiskDetail]
    highways_affected: List[Dict[str, Any]]
    cascading_impact_chain: List[str]
    provenance: DataSourceType = DataSourceType.SIMULATION

# --- Emergency Contact & Escalation Schemas ---

class EmergencyContactCreate(BaseModel):
    name: str = Field(..., description="Contact full name or unit title")
    role: str = Field(..., description="E.g. SDRF Incident Commander, District Magistrate, NDRF Liaison")
    phone: str = Field(..., description="Valid 10-digit Indian mobile number")
    email: str = Field(..., description="Official government / emergency email")
    escalation_level: int = Field(1, ge=1, le=3, description="1 = Primary, 2 = Secondary, 3 = Higher Authority")
    is_enabled: bool = True
    sms_enabled: Optional[bool] = False
    email_enabled: bool = True
    in_app_enabled: bool = True
    priority_order: int = 1

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    escalation_level: Optional[int] = Field(None, ge=1, le=3)
    is_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    priority_order: Optional[int] = None

class EmergencyContactOut(BaseModel):
    id: str
    name: str
    role: str
    phone: str
    email: str
    escalation_level: int
    is_enabled: bool
    sms_enabled: Optional[bool] = False
    email_enabled: bool
    in_app_enabled: bool
    priority_order: int
    created_at: str
    updated_at: str

# --- Admin Alert Configuration Schemas ---

class AlertConfigurationUpdate(BaseModel):
    automated_risk_alerting_active: Optional[bool] = None
    risk_alert_threshold: Optional[float] = Field(None, ge=0.40, le=0.99, description="Landslide probability threshold (e.g. 0.75 for 75%)")
    alert_cooldown_seconds: Optional[int] = Field(None, ge=30, le=7200, description="Cooldown between repeat automated alerts")
    escalation_timeout_seconds: Optional[int] = Field(None, ge=10, le=1800, description="Timeout before escalating to next level")
    max_escalation_level: Optional[int] = Field(None, ge=1, le=3)
    significant_risk_escalation_delta: Optional[float] = Field(None, ge=0.05, le=0.50)
    demo_mode_enabled: Optional[bool] = None

class AlertConfigurationOut(BaseModel):
    id: str
    automated_risk_alerting_active: bool
    risk_alert_threshold: float
    alert_cooldown_seconds: int
    escalation_timeout_seconds: int
    max_escalation_level: int
    significant_risk_escalation_delta: float
    demo_mode_enabled: bool
    updated_at: str

# --- Incident Lifecycle Actions ---

class SOSIncidentAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., description="Officer name or authority ID")
    notes: Optional[str] = "Incident acknowledged. Immediate tactical response initiated."

class SOSIncidentEscalateRequest(BaseModel):
    escalate_to_level: Optional[int] = Field(None, ge=2, le=3)
    reason: Optional[str] = "Acknowledgement timeout or escalating hazard conditions."
    actor: Optional[str] = "System Auto-Escalation Engine"

class SOSIncidentResolveRequest(BaseModel):
    resolved_by: str = Field(..., description="Officer resolving the incident")
    resolution_notes: str = Field(..., description="Field outcome and clearance notes")
    assigned_team: Optional[str] = None

class ManualAlertCreate(BaseModel):
    title: str
    severity: RiskLevel
    district: str
    state: str
    message: str
    channels: List[str] = ["DASHBOARD", "EMAIL"]
    target_escalation_level: Optional[int] = 1


# --- Test Email Controlled Recipient Schemas ---

class TestEmailRecipient(BaseModel):
    email: str = Field(..., description="Valid recipient email address")
    name: Optional[str] = Field("Emergency Officer", description="Recipient display name")
    contact_id: Optional[str] = Field(None, description="Registered emergency contact ID if applicable")
    role: Optional[str] = Field("Test Recipient", description="Contact role or group")

class TestEmailRequest(BaseModel):
    explicit_admin_action: Optional[bool] = Field(False, description="Mandatory confirmation flag indicating explicit admin initiation")
    recipients: Optional[List[TestEmailRecipient]] = Field(None, description="Explicit list of authorized test email recipients")
    recipient_emails: Optional[List[str]] = Field(None, description="Simple list of email strings")
    contact_id: Optional[str] = Field(None, description="Single emergency contact ID fallback")
    email: Optional[str] = Field(None, description="Single direct email fallback")
    subject: Optional[str] = Field(None, description="Custom email subject")
    message: Optional[str] = Field(None, description="Custom test verification note")
    district: Optional[str] = Field(None, description="Operational district")
    state: Optional[str] = Field(None, description="Operational state")


# --- Authentication & RBAC Schemas ---

class UserRole(str, Enum):
    CITIZEN = "CITIZEN"
    AUTHORITY = "AUTHORITY"
    ADMIN = "ADMIN"

class CitizenRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name")
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid Email Address")
    password: str = Field(..., min_length=6, max_length=128, description="Password")
    confirm_password: Optional[str] = None
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    role_hint: Optional[str] = None

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None
    jurisdiction: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    created_at: str
    last_login_at: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserOut
    message: str = "Authentication successful"

class AuthorityProvisionRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid Email Address")
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.AUTHORITY
    department: str = Field(..., min_length=2)
    jurisdiction: str = Field(..., min_length=2)
    phone: Optional[str] = None


