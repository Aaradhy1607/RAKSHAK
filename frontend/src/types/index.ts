export type RiskLevel = 'LOW' | 'SAFE' | 'WATCH' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type PriorityTier = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type RoadStatus = 'OPEN' | 'AT_RISK' | 'RESTRICTED' | 'BLOCKED' | 'UNKNOWN';
export type IncidentStatus =
  | 'NEW'
  | 'AWAITING_ACKNOWLEDGEMENT'
  | 'ACKNOWLEDGED'
  | 'RESPONSE_IN_PROGRESS'
  | 'ESCALATED'
  | 'AI_ASSESSED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'FIELD_INSPECTION'
  | 'DISPATCHED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';
export type DataSourceType = 'LIVE' | 'OBSERVED' | 'FORECAST' | 'MODEL_PREDICTION' | 'HISTORICAL' | 'SATELLITE' | 'CITIZEN_REPORTED' | 'SENSOR' | 'SIMULATION' | 'DEMO_DATA';

export interface FeatureFactor {
  feature_key: string;
  label: string;
  contribution_pct: number;
  raw_value: number;
  importance_rank: number;
  influence_direction?: 'POSITIVE' | 'NEGATIVE';
}

export interface ForecastHorizon {
  horizon: string;
  hours_ahead: number;
  predicted_risk: RiskLevel;
  probability: number;
  rainfall_forecast_mm: number;
  soil_moisture_pct: number;
  confidence: number;
  data_nature: DataSourceType;
}

export interface VillageIsolationImpact {
  highway_id: string;
  highway_name: string;
  route?: string;
  status: RoadStatus;
  lifeline_score?: number;
  cut_off_villages: string[];
  isolated_population_est: number;
  critical_services_severed: string[];
  alternate_footpath_or_airdrop_zones?: string[];
  alternate_relief_routes?: string[];
  lifeline_connectivity_score?: number;
}

export interface LocationRiskDetail {
  id: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  slope_deg: number;
  aspect_deg: number;
  population: number;
  current_risk: RiskLevel;
  probability: number;
  severity_score: number;
  emergency_priority: PriorityTier;
  priority_score: number;
  priority_explanation: string;
  confidence: number;
  data_nature: DataSourceType;
  data_freshness: string;
  risk_trend: string;
  rainfall_1h_mm: number;
  rainfall_6h_mm: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  soil_moisture_pct: number;
  soil_saturation_state: string;
  primary_factors: FeatureFactor[];
  explanation_summary: string;
  forecast_timeline: ForecastHorizon[];
  nearby_highways: any[];
  nearby_infrastructure: any[];
  isolation_impact?: VillageIsolationImpact;
  recommended_authority_actions: string[];
  baseline_probability?: number;
  baseline_risk?: RiskLevel;
  risk_delta_pct?: number;
  rainfall_baseline_mm?: number;
  soil_moisture_baseline_pct?: number;
}

export interface OverviewStats {
  timestamp: string;
  total_monitored_districts: number;
  active_critical_zones: number;
  active_high_zones?: number;
  active_warning_zones: number;
  active_watch_zones: number;
  active_low_zones?: number;
  open_sos_count: number;
  unverified_reports_count: number;
  roads_at_risk_count: number;
  exposed_population_count: number;
  system_data_health: string;
  is_simulation_mode: boolean;
  simulation_step: number;
  districts_summary: {
    id: string;
    district: string;
    state: string;
    risk: RiskLevel;
    probability: number;
    emergency_priority: PriorityTier;
    priority_score: number;
    rainfall_24h_mm: number;
    soil_moisture_pct: number;
    lat: number;
    lon: number;
  }[];
}

export interface AIAssessmentResult {
  hazard_label: string;
  hazard_detected: boolean;
  confidence: number;
  detected_indicators: string[];
  severity_rating: string;
  recommendation: string;
  disclaimer: string;
}

export interface CitizenReport {
  id: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  status: IncidentStatus;
  verification_status?: string;
  verified_by_officer?: string;
  image_url?: string;
  ai_assessment?: AIAssessmentResult;
  ai_confidence_score?: number;
  ai_classification_tag?: string;
  created_at: string;
  timestamp?: string;
  reporter_name: string;
  reporter_phone: string;
  user_id?: string;
  reporter_email?: string;
  cluster_id?: string;
}

export interface ReportCluster {
  cluster_id: string;
  centroid_lat: number;
  centroid_lon: number;
  district: string;
  state: string;
  report_count: number;
  categories: string[];
  reports: CitizenReport[];
  earliest_report_at: string;
  latest_report_at: string;
  cluster_severity: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  escalation_level: number;
  is_enabled: boolean;
  sms_enabled?: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderStatusResponse {
  email: {
    provider: string;
    is_enabled: boolean;
    is_configured: boolean;
    primary_provider_name: string;
    sender_email: string;
    sender_name: string;
    endpoint: string;
  };
  websocket: {
    is_connected: boolean;
    active_clients: number;
    is_enabled?: boolean;
  };
  network?: {
    enforce_ipv4: boolean;
    ip_stability: string;
  };
  demo_mode: boolean;
}

export interface NotificationDiagnosticsResponse {
  status?: string;
  timestamp?: string;
  configured_primary_channels?: string[];
  total_registered_contacts?: number;
  contacts_by_level?: {
    level_1: number;
    level_2: number;
    level_3: number;
  };
  email_gateway?: {
    provider: string;
    is_ready: boolean;
    sender: string;
    masked_key: string;
    notes: string;
  };
  in_app_websocket?: {
    status: string;
    active_connections: number;
  };
  count?: number;
  dispatches?: NotificationDispatch[];
}

export interface AlertConfiguration {
  id: number;
  engine_mode?: 'ACTIVE' | 'PAUSED';
  risk_probability_threshold_pct?: number;
  priority_p1_threshold_pct?: number;
  cooldown_period_minutes?: number;
  acknowledgement_timeout_minutes?: number;
  level_2_escalation_timeout_minutes?: number;
  level_3_escalation_timeout_minutes?: number;
  channels_enabled?: string[];
  sms_enabled?: boolean;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  risk_alert_threshold?: number;
  automated_risk_alerting_active?: boolean;
  escalation_timeout_seconds?: number;
  alert_cooldown_seconds?: number;
  max_escalation_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationDispatch {
  id: string;
  alert_id: string;
  incident_id?: string;
  contact_id?: string;
  contact_name?: string;
  contact_role?: string;
  channel: 'EMAIL' | 'IN_APP' | 'SMS' | string;
  recipient: string;
  normalized_recipient?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'PROVIDER_ACCEPTED' | 'DELIVERY_PENDING' | 'NOT_CONFIGURED' | 'SIMULATED' | string;
  provider_message_id?: string;
  provider_reference?: string;
  delivery_event?: string;
  rejection_reason?: string;
  provider_response?: string;
  http_status?: number;
  escalation_level?: number;
  attempt_count?: number;
  error_message?: string;
  sent_at?: string;
  attempted_at?: string;
  created_at: string;
}

export interface AlertSimulationResult {
  simulated_alert: {
    id: string;
    title: string;
    severity: string;
    district: string;
    state: string;
    message: string;
    channels: string[];
    is_simulated: boolean;
  };
  dispatches: NotificationDispatch[];
}

export interface AlertHistoryItem {
  id: string;
  title: string;
  severity: RiskLevel;
  district: string;
  state: string;
  message: string;
  channels: string[];
  created_at: string;
  is_active: number;
  alert_type: string;
  incident_id?: string;
  is_simulated: boolean;
  dispatches?: NotificationDispatch[];
}

export interface EscalationEvent {
  id: string;
  incident_id: string;
  from_level: number;
  to_level: number;
  triggered_at: string;
  reason: string;
  actor: string;
  notification_summary?: string;
}

export interface SOSRiskContext {
  status: string;
  probability?: number;
  current_risk?: RiskLevel;
  emergency_priority?: PriorityTier;
  confidence?: number;
  data_freshness?: string;
  rainfall_1h_mm?: number;
  rainfall_24h_mm?: number;
  soil_moisture_pct?: number;
  soil_saturation_state?: string;
  primary_factors?: FeatureFactor[];
  explanation_summary?: string;
  elevation_m?: number;
  slope_deg?: number;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
  nearest_hospital?: {
    name: string;
    type: string;
    district: string;
    distance_km: number;
    beds?: number;
    status: string;
  };
  nearest_shelter?: {
    name: string;
    type: string;
    district: string;
    distance_km: number;
    capacity?: number;
    status: string;
  };
  error?: string;
}

export interface SOSIncident {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  district: string;
  state: string;
  emergency_type: string;
  message: string;
  people_affected: number;
  contact_phone: string;
  status: IncidentStatus;
  assigned_team?: string;
  priority: PriorityTier;
  created_at: string;
  current_escalation_level?: number;
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledgement_notes?: string;
  map_link?: string;
  hazard_category?: string;
  user_id?: string;
  reporter_email?: string;
  risk_context?: SOSRiskContext;
  escalation_events?: EscalationEvent[];
  timeline: {
    timestamp: string;
    status: string;
    assigned_team?: string;
    note: string;
    updated_by: string;
  }[];
}

export interface HighwayRisk {
  id: string;
  name: string;
  route: string;
  importance: string;
  vulnerability: string;
  status: RoadStatus;
  blockage_reported: boolean;
  critical_chokepoints: string[];
  state_segments: string[];
  traffic_advisory: string;
  alternate_evacuation_route: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export interface InfrastructureNode {
  id: string;
  name: string;
  type: string;
  state: string;
  district: string;
  criticality: string;
  status?: string;
  beds?: number;
  capacity?: number;
  latitude: number;
  longitude: number;
}

export interface ScenarioStep {
  step_index: number;
  title: string;
  description: string;
  rainfall_24h: number;
  soil_moisture: number;
  status_tag: string;
}

export interface WhatIfScenarioRequest {
  rainfall_multiplier: number;
  soil_saturation_override?: number;
  blocked_highways?: string[];
  target_state?: string;
}

export interface WhatIfScenarioResult {
  scenario_id: string;
  timestamp: string;
  baseline_critical_count: number;
  projected_critical_count: number;
  baseline_exposed_pop: number;
  projected_exposed_pop: number;
  rainfall_surge_pct: number;
  soil_saturation_override_pct?: number;
  projected_locations: LocationRiskDetail[];
  highways_affected: {
    highway_id: string;
    simulated_status: RoadStatus;
    connectivity_loss_pct: number;
  }[];
  cascading_impact_chain: string[];
  provenance: DataSourceType;
}

export interface ModelTransparencyInfo {
  platform_name: string;
  current_model_version: string;
  model_architecture: string;
  primary_features: {
    name: string;
    role: string;
    weight_pct: number;
  }[];
  validation_strategy: string;
  evaluation_metrics: {
    spatial_cv_f1: number;
    holdout_f1: number;
    roc_auc: number;
    pr_auc: number;
    brier_calibration_score: number;
  };
  scientific_citations: string[];
  operational_limitations: string[];
  data_provenance_commitment: string;
}

export interface CascadingImpactGraph {
  title: string;
  nodes: {
    id: string;
    label: string;
    category: string;
    status: string;
    impact_tier: string;
  }[];
  edges: {
    from: string;
    to: string;
    relationship: string;
  }[];
  mitigation_interventions: {
    stage: string;
    action: string;
    effectiveness: string;
  }[];
}

// --- User Authentication & RBAC ---
export type UserRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  jurisdiction?: string;
  badge_number?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role_hint?: string;
}

export interface RegisterCitizenPayload {
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  phone?: string;
}

export interface ProvisionAuthorityPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  jurisdiction: string;
  phone?: string;
}

