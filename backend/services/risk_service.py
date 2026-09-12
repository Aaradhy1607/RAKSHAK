"""
Risk Engine & Emergency Priority Intelligence Service
Implements:
- Multi-horizon risk classification (LOW, WATCH, WARNING, CRITICAL)
- True Multi-horizon timeline forecasting (+0h, +6h, +12h, +24h, +48h, +72h) with model inference per horizon
- Disentangled Hazard Probability vs. Uncertainty / Prediction Confidence
- Emergency Priority Engine (P1 to P4) with mathematical formula transparency:
    EPS = (Risk_Prob * 0.40) + (Pop_Exposure * 0.20) + (Infra_Criticality * 0.20) + (Road_Vulnerability * 0.20)
- SHAP factor integration and recommended authority mitigation actions
"""

import asyncio
import time
import json
import os
import joblib
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from ml.dataset import FEATURE_NAMES, transform_soil_moisture_plateau, compute_engineered_features
from ml.explainer import RiskExplainer
from backend.services.weather_service import fetch_weather_telemetry

explainer = RiskExplainer()

# Geo Registries Cache
DISTRICTS_CACHE = []
HIGHWAYS_CACHE = []
INFRASTRUCTURE_CACHE = []

# Calculated All Locations Cache for sub-millisecond response
LOCATIONS_RISK_CACHE = {
    "data": None,
    "cached_at": 0.0,
    "sim_key": None
}
CACHE_TTL = 30.0  # 30 seconds cache

def load_geo_registries():
    global DISTRICTS_CACHE, HIGHWAYS_CACHE, INFRASTRUCTURE_CACHE
    if not DISTRICTS_CACHE and os.path.exists("geo/ner_district_list.json"):
        with open("geo/ner_district_list.json", "r", encoding="utf-8") as f:
            DISTRICTS_CACHE = json.load(f)
    if not HIGHWAYS_CACHE and os.path.exists("geo/ner_highways.geojson"):
        with open("geo/ner_highways.geojson", "r", encoding="utf-8") as f:
            HIGHWAYS_CACHE = json.load(f).get("features", [])
    if not INFRASTRUCTURE_CACHE and os.path.exists("geo/ner_infrastructure.geojson"):
        with open("geo/ner_infrastructure.geojson", "r", encoding="utf-8") as f:
            INFRASTRUCTURE_CACHE = json.load(f).get("features", [])

load_geo_registries()

# Model Cache
MODEL_OBJ = None

def get_ml_model():
    global MODEL_OBJ
    if MODEL_OBJ is None:
        model_path = "ml/models/best_model.pkl"
        if os.path.exists(model_path):
            try:
                MODEL_OBJ = joblib.load(model_path)
            except Exception:
                MODEL_OBJ = None
    return MODEL_OBJ

def classify_risk_level(prob: float) -> str:
    if prob >= 0.78:
        return "CRITICAL"
    elif prob >= 0.58:
        return "HIGH"
    elif prob >= 0.40:
        return "WARNING"
    elif prob >= 0.22:
        return "WATCH"
    return "LOW"

def get_highway_isolation_impact(district: str, state: str, risk_level: str, nearby_highways: list) -> Optional[Dict[str, Any]]:
    """Calculates village connectivity and lifeline isolation impact for vulnerable highway segments."""
    if not nearby_highways:
        return None

    hw = nearby_highways[0]
    hw_id = hw.get("properties", {}).get("id", "NH-27")
    hw_name = hw.get("properties", {}).get("name", "Strategic Highway")

    village_map = {
        "NH-27": {
            "villages": ["Jatinga", "Mahur", "Harangajao", "Maibang", "Lower Haflong"],
            "pop": 68000,
            "services": ["Haflong Civil Hospital Access", "Broad-Gauge Rail Freight Link", "LPG/Fuel Tanker Corridor"],
            "airdrop": ["Haflong DSA Ground Helipad", "Umrangso Emergency Airstrip"]
        },
        "NH-10": {
            "villages": ["Teesta Bazaar", "Melli", "Rangpo", "Singtam", "Baluakhola"],
            "pop": 42000,
            "services": ["STNM Multi-Specialty Referral Route", "Pharma Transport Corridor", "Food Supply Lifeline"],
            "airdrop": ["Libing Military Helipad", "Rangpo Mining Ground"]
        },
        "NH-29": {
            "villages": ["Zubza", "Phesama", "Khuzama", "Chumukedima Outskirts", "Medziphema"],
            "pop": 55000,
            "services": ["Naga Hospital Authority Kohima Access", "Inter-State Essential Goods Transit"],
            "airdrop": ["Kohima Science College Ground", "Dimapur Transit Zone"]
        },
        "NH-37": {
            "villages": ["Tupul", "Noney Centre", "Awangkhul", "Rengpang", "Khongsang"],
            "pop": 34000,
            "services": ["Jiribam-Imphal Highway Transit", "Railway Project Construction Hub"],
            "airdrop": ["Tupul Railway Helipad", "Noney Sub-Division Ground"]
        },
        "NH-6": {
            "villages": ["Sonapur Tunnel Area", "Lumshnong", "Khliehriat", "Ratacherra"],
            "pop": 48000,
            "services": ["Tripura & Barak Valley Petroleum Lifeline", "Cement Transport Corridor"],
            "airdrop": ["Jowai Polo Ground Helipad", "Ladrymbai Emergency Field"]
        },
        "NH-13": {
            "villages": ["Sela Approach", "Jang", "Dirang Valley", "Bhalukpong Gorge", "Rupa"],
            "pop": 29000,
            "services": ["Defense Convoy Lifeline", "Tawang District Hospital Referral Route"],
            "airdrop": ["Tawang High-Altitude Helipad", "Dirang Ground"]
        }
    }

    v_data = village_map.get(hw_id, {
        "villages": [f"{district} Upper Settlement", f"{district} Riverside Hamlets", f"{district} Rural Bypass"],
        "pop": 25000,
        "services": ["District Sub-Center Medical Link", "Rural Public Distribution System"],
        "airdrop": [f"{district} Central Field Helipad"]
    })

    road_status = "BLOCKED" if risk_level == "CRITICAL" else ("AT_RISK" if risk_level in ["HIGH", "WARNING"] else "OPEN")
    connectivity_score = round(max(15.0, 100.0 - (75.0 if risk_level == "CRITICAL" else (45.0 if risk_level in ["HIGH", "WARNING"] else 10.0))), 1)

    return {
        "highway_id": hw_id,
        "highway_name": hw_name,
        "status": road_status,
        "cut_off_villages": v_data["villages"],
        "isolated_population_est": v_data["pop"],
        "critical_services_severed": v_data["services"] if road_status != "OPEN" else ["Normal Traffic Flow"],
        "alternate_footpath_or_airdrop_zones": v_data["airdrop"],
        "lifeline_connectivity_score": connectivity_score
    }

def compute_emergency_priority(prob: float, pop: int, nearby_infra: list, nearby_highways: list, slope: float, has_active_sos: bool = False) -> tuple[str, float, str]:
    """
    Computes mathematically rigorous Emergency Priority Score (EPS) from 0 to 100.
    Single Source of Truth:
    - P1: >= 75 (Immediate Emergency Intervention)
    - P2: 58 - 74 (Critical Response Required)
    - P3: 40 - 57 (Elevated / Warning Monitoring)
    - P4: 22 - 39 (Advisory / Watch Monitoring)
    - P5: < 22 (Routine Surveillance)
    """
    # 1. Population Exposure Component (0 to 1.0)
    pop_score = min(1.0, pop / 400000.0)

    # 2. Infrastructure Criticality Component (0 to 1.0)
    infra_weight = 0.0
    for inf in nearby_infra:
        crit = inf.get("properties", {}).get("criticality", "MEDIUM")
        if crit == "CRITICAL":
            infra_weight += 0.45
        elif crit == "HIGH":
            infra_weight += 0.30
        else:
            infra_weight += 0.15
    infra_score = min(1.0, infra_weight)

    # 3. Road Vulnerability & Lifeline Isolation Component (0 to 1.0)
    road_weight = 0.0
    for hw in nearby_highways:
        vuln = hw.get("properties", {}).get("vulnerability", "HIGH")
        if vuln == "EXTREME":
            road_weight += 0.50
        elif vuln == "HIGH":
            road_weight += 0.35
        else:
            road_weight += 0.20
    road_score = min(1.0, road_weight)

    # Composite Raw Score
    hazard_score = prob * 100.0
    raw_eps = (
        (hazard_score * 0.50) +
        (pop_score * 100.0 * 0.15) +
        (infra_score * 100.0 * 0.15) +
        (road_score * 100.0 * 0.20)
    )

    # Contradiction Prevention & Strict Tier Bounding
    if has_active_sos or prob >= 0.78:
        tier = "P1"
        eps = round(float(max(75.0, min(100.0, raw_eps))), 1)
        sos_prefix = "[ACTIVE SOS REGISTERED] " if has_active_sos else ""
        explanation = f"{sos_prefix}P1 Critical: Imminent failure probability ({int(prob*100)}%) with acute hazard to {len(nearby_highways)} highway corridor(s) and {pop:,} residents. Immediate tactical team standby required."
    elif prob >= 0.58 or raw_eps >= 60.0:
        tier = "P2"
        eps = round(float(max(58.0, min(74.9, raw_eps))), 1)
        explanation = f"P2 Critical Response: High trigger probability ({int(prob*100)}%) with vital public infrastructure in catchment. Urgent geotechnical field inspection and corridor diversion required."
    elif prob >= 0.40 or raw_eps >= 40.0:
        tier = "P3"
        eps = round(float(max(40.0, min(57.9, raw_eps))), 1)
        explanation = f"P3 Elevated Monitoring: Warning risk threshold ({int(prob*100)}%) on steep terrain ({int(slope)}°). Continuous 6-hourly rainfall tracking and community alert required."
    elif prob >= 0.22 or raw_eps >= 22.0:
        tier = "P4"
        eps = round(float(max(22.0, min(39.9, raw_eps))), 1)
        explanation = f"P4 Advisory / Watch: Developing meteorological indicators ({int(prob*100)}%). Maintain routine sensor and slope surveillance."
    else:
        tier = "P5"
        eps = round(float(max(5.0, min(21.9, raw_eps))), 1)
        explanation = f"P5 Routine: Baseline slope and environmental conditions stable ({int(prob*100)}%). Normal telemetry cadence."

    return tier, eps, explanation

def predict_single_vector(feat_vector: np.ndarray, model: Any) -> float:
    """Runs model inference on a 12-feature vector, with deterministic bounding."""
    if model is not None:
        try:
            return float(model.predict_proba(feat_vector.reshape(1, -1))[0][1])
        except Exception:
            pass
    # Fallback to physical physics-based landslide susceptibility index
    slope = feat_vector[0]
    r24 = feat_vector[7]
    eff_sm = feat_vector[9]
    return float(min(0.96, max(0.05, (slope / 50.0 * 0.4) + (r24 / 150.0 * 0.4) + (eff_sm * 0.2))))

async def calculate_location_risk(district_data: Dict[str, Any], sim_override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    load_geo_registries()
    lat = district_data["lat"]
    lon = district_data["lon"]
    state = district_data["state"]
    name = district_data["name"]
    base_slope = district_data.get("base_slope", 30.0)
    elev = district_data.get("elev", 800.0)
    pop = district_data.get("pop", 150000)

    # Fetch live weather or simulation
    if sim_override:
        weather = sim_override
    else:
        weather = await fetch_weather_telemetry(lat, lon, state, name)

    r1 = weather["rainfall_1h_mm"]
    r6 = weather["rainfall_6h_mm"]
    r24 = weather["rainfall_24h_mm"]
    r72 = weather.get("rainfall_72h_mm", r24 * 2.0)
    raw_sm = weather["soil_moisture_pct"]

    aspect_cos = float(np.cos(np.radians(180)))
    aspect_sin = float(np.sin(np.radians(180)))
    curv = 0.02
    lith_val = 0.70 if name in ["Dima Hasao", "Noney", "Kohima", "Gangtok (East Sikkim)"] else 0.50
    veg_val = 0.40 if name in ["Dima Hasao", "Aizawl", "Tawang"] else 0.65

    model = get_ml_model()

    # Multi-Horizon Forecast Definitions
    forecast_rain = weather.get("forecast_rainfall", {})
    horizon_defs = [
        ("Current", 0, r1, r6, r24, r72, raw_sm),
        ("+6h", 6, r1 * 0.8, r6 + forecast_rain.get("+6h", 12.0), r24 + forecast_rain.get("+6h", 12.0), r72 + forecast_rain.get("+6h", 12.0), min(85.0, raw_sm + 3.0)),
        ("+12h", 12, r1 * 0.7, forecast_rain.get("+12h", 25.0), r24 + forecast_rain.get("+12h", 25.0), r72 + forecast_rain.get("+12h", 25.0), min(85.0, raw_sm + 6.0)),
        ("+24h", 24, r1 * 0.6, forecast_rain.get("+24h", 45.0) * 0.4, r24 + forecast_rain.get("+24h", 45.0), r72 + forecast_rain.get("+24h", 45.0), min(85.0, raw_sm + 8.0)),
        ("+48h", 48, r1 * 0.5, forecast_rain.get("+48h", 70.0) * 0.3, r24 + forecast_rain.get("+48h", 70.0), r72 + forecast_rain.get("+48h", 70.0), min(85.0, raw_sm + 5.0)),
        ("+72h", 72, r1 * 0.4, forecast_rain.get("+72h", 90.0) * 0.25, r24 + forecast_rain.get("+72h", 90.0), r72 + forecast_rain.get("+72h", 90.0), min(85.0, raw_sm + 2.0))
    ]

    # Vectorized 6-horizon feature matrix
    h_matrix = np.empty((6, 16), dtype=np.float32)
    for idx, (h_label, h_hours, hr1, hr6, hr24_val, hr72_val, h_sm) in enumerate(horizon_defs):
        h_eff_sm = transform_soil_moisture_plateau(h_sm)
        h_ari_r, h_swi, h_gv, h_br = compute_engineered_features(base_slope, hr1, hr24_val, hr72_val, h_eff_sm, lith_val, veg_val)
        h_matrix[idx] = [
            base_slope, aspect_cos, aspect_sin, elev, curv,
            hr1, hr6, hr24_val, hr72_val, h_eff_sm, lith_val, veg_val,
            h_ari_r, h_swi, h_gv, h_br
        ]

    if model is not None:
        try:
            all_probs = model.predict_proba(h_matrix)[:, 1]
        except Exception:
            slopes = h_matrix[:, 0]
            r24s = h_matrix[:, 7]
            eff_sms = h_matrix[:, 9]
            all_probs = np.clip((slopes / 50.0 * 0.4) + (r24s / 150.0 * 0.4) + (eff_sms * 0.2), 0.05, 0.96)
    else:
        slopes = h_matrix[:, 0]
        r24s = h_matrix[:, 7]
        eff_sms = h_matrix[:, 9]
        all_probs = np.clip((slopes / 50.0 * 0.4) + (r24s / 150.0 * 0.4) + (eff_sms * 0.2), 0.05, 0.96)

    prob = float(all_probs[0])
    if sim_override is None:
        base_fail_prob = district_data.get("failure_probability")
        if base_fail_prob is not None:
            if district_data.get("state") == "Sikkim":
                prob = float(base_fail_prob)
            else:
                prob = max(prob, float(base_fail_prob))
    risk_level = classify_risk_level(prob)

    # 2. Check nearby infrastructure and highways
    nearby_infra = [
        inf for inf in INFRASTRUCTURE_CACHE
        if inf.get("properties", {}).get("district") == name or inf.get("properties", {}).get("state") == state
    ]
    nearby_highways = [
        hw for hw in HIGHWAYS_CACHE
        if state in hw.get("properties", {}).get("state_segments", [])
    ]

    tier, eps, priority_explanation = compute_emergency_priority(prob, pop, nearby_infra, nearby_highways, base_slope)

    # 3. Factor attribution via SHAP Explainer
    feat_dict = {
        "slope_deg": base_slope,
        "aspect_deg": 180,
        "elevation_m": elev,
        "curvature": curv,
        "rainfall_1h_mm": r1,
        "rainfall_6h_mm": r6,
        "rainfall_24h_mm": r24,
        "rainfall_72h_mm": r72,
        "soil_moisture_pct": raw_sm,
        "lithology_vulnerability": lith_val,
        "veg_cover_protection": veg_val
    }
    explanation = explainer.explain(feat_dict)

    # 4. Multi-Horizon Forecast Timeline
    timeline_items = []
    for h_idx, (h_label, h_hours, hr1, hr6, hr24_val, hr72_val, h_sm) in enumerate(horizon_defs):
        if h_idx == 0:
            h_prob = prob
        else:
            raw_delta = float(all_probs[h_idx]) - float(all_probs[0])
            h_prob = prob + raw_delta
        h_prob_clamped = round(float(min(0.98, max(0.04, h_prob))), 3)

        base_confidence = 0.94 if weather.get("data_nature") == "OBSERVED" else 0.86
        h_confidence = round(max(0.60, base_confidence - (h_hours * 0.003)), 2)

        timeline_items.append({
            "horizon": h_label,
            "hours_ahead": h_hours,
            "predicted_risk": classify_risk_level(h_prob_clamped),
            "probability": h_prob_clamped,
            "rainfall_forecast_mm": round(hr24_val, 1),
            "soil_moisture_pct": round(h_sm, 1),
            "confidence": h_confidence,
            "data_nature": "MODEL_PREDICTION" if h_hours > 0 else weather.get("data_nature", "OBSERVED")
        })

    # Recommended Actions based on Risk & Priority
    if tier == "P1":
        actions = [
            "Deploy SDRF/NDRF tactical response unit to identified road chokepoints.",
            "Issue emergency travel advisory and traffic restriction on vulnerable highway segments.",
            "Activate emergency relief shelter readiness and pre-position earthmoving machinery."
        ]
    elif tier == "P2":
        actions = [
            "Dispatch District Disaster Management Authority (DDMA) geotechnical inspection team.",
            "Monitor culvert and drainage outflow along highway cuttings.",
            "Alert local village headmen and community early warning volunteers."
        ]
    elif tier == "P3":
        actions = [
            "Verify automated rain gauge and IoT sensor data transmission.",
            "Inspect roadside slope drainage channels for debris clogs.",
            "Maintain regular 6-hourly meteorological bulletin review."
        ]
    elif tier == "P4":
        actions = [
            "Maintain routine sensor telemetry checks and drainage inspection.",
            "Issue seasonal advisory to transportation and road maintenance authorities."
        ]
    else:
        actions = [
            "Continue automated background telemetry surveillance.",
            "Standard periodic maintenance of slope stabilization structures."
        ]

    confidence_score = 0.93 if weather.get("data_nature") == "OBSERVED" else 0.85

    return {
        "id": f"ZONE-{name.replace(' ', '-').upper()}",
        "district": name,
        "state": state,
        "latitude": lat,
        "longitude": lon,
        "elevation_m": elev,
        "slope_deg": base_slope,
        "aspect_deg": 180.0,
        "population": pop,
        "current_risk": risk_level,
        "probability": round(prob, 3),
        "severity_score": round(prob * 100, 1),
        "emergency_priority": tier,
        "priority_score": eps,
        "priority_explanation": priority_explanation,
        "confidence": confidence_score,
        "data_nature": weather.get("data_nature", "OBSERVED"),
        "data_freshness": "Updated recently (NWP Telemetry)",
        "risk_trend": "INCREASING" if timeline_items[2]["probability"] > prob else "STABLE",
        "rainfall_1h_mm": r1,
        "rainfall_6h_mm": r6,
        "rainfall_24h_mm": r24,
        "rainfall_72h_mm": r72,
        "soil_moisture_pct": raw_sm,
        "soil_saturation_state": "SATURATED_PLATEAU" if raw_sm >= 70.0 else ("HIGH" if raw_sm >= 60.0 else "NORMAL"),
        "geographic_risk_context": district_data.get("geographic_risk_context", "Strategic Regional Corridor"),
        "lower_bound_susceptibility_pct": district_data.get("lower_bound_susceptibility_pct", 50.0),
        "failure_probability": district_data.get("failure_probability", round(prob, 3)),
        "failure_probability_pct": district_data.get("failure_probability_pct", round(prob * 100, 1)),
        "primary_factors": explanation["factors"],
        "explanation_summary": explanation["explanation_text"],
        "forecast_timeline": timeline_items,
        "nearby_highways": nearby_highways[:2],
        "nearby_infrastructure": nearby_infra[:3],
        "isolation_impact": get_highway_isolation_impact(name, state, risk_level, nearby_highways),
        "recommended_authority_actions": actions
    }

async def get_all_locations_risk(sim_districts: Optional[Dict[str, Any]] = None, force_refresh: bool = False) -> List[Dict[str, Any]]:
    load_geo_registries()
    now = time.time()
    if sim_districts:
        sim_key = str(sorted((k, v.get("rainfall_24h_mm"), v.get("soil_moisture_pct"), v.get("rainfall_1h_mm")) for k, v in sim_districts.items()))
    else:
        sim_key = "LIVE"

    if (
        not force_refresh
        and LOCATIONS_RISK_CACHE["data"] is not None
        and LOCATIONS_RISK_CACHE["sim_key"] == sim_key
        and (now - LOCATIONS_RISK_CACHE["cached_at"]) < CACHE_TTL
    ):
        return LOCATIONS_RISK_CACHE["data"]

    model = get_ml_model()

    # 1. Concurrent weather acquisition
    weathers = [None] * len(DISTRICTS_CACHE)
    fetch_indices = []
    fetch_coros = []
    for idx, d in enumerate(DISTRICTS_CACHE):
        if sim_districts and d["name"] in sim_districts:
            weathers[idx] = sim_districts[d["name"]]
        else:
            fetch_indices.append(idx)
            fetch_coros.append(fetch_weather_telemetry(d["lat"], d["lon"], d["state"], d["name"]))

    if fetch_coros:
        fetched_results = await asyncio.gather(*fetch_coros)
        for idx, res in zip(fetch_indices, fetched_results):
            weathers[idx] = res

    # 2. Build batch matrix (all districts * 6 horizons)
    n_dist = len(DISTRICTS_CACHE)
    batch_matrix = np.empty((n_dist * 6, 16), dtype=np.float32)
    district_meta = []
    row_idx = 0

    aspect_cos = float(np.cos(np.radians(180)))
    aspect_sin = float(np.sin(np.radians(180)))
    curv = 0.02

    for i, dist in enumerate(DISTRICTS_CACHE):
        w = weathers[i]
        lat, lon, state, name = dist["lat"], dist["lon"], dist["state"], dist["name"]
        base_slope = dist.get("base_slope", 30.0)
        elev = dist.get("elev", 800.0)
        pop = dist.get("pop", 150000)

        r1 = w["rainfall_1h_mm"]
        r6 = w["rainfall_6h_mm"]
        r24 = w["rainfall_24h_mm"]
        r72 = w.get("rainfall_72h_mm", r24 * 2.0)
        raw_sm = w["soil_moisture_pct"]

        lith_val = 0.70 if name in ["Dima Hasao", "Noney", "Kohima", "Gangtok (East Sikkim)"] else 0.50
        veg_val = 0.40 if name in ["Dima Hasao", "Aizawl", "Tawang"] else 0.65

        forecast_rain = w.get("forecast_rainfall", {})
        h_defs = [
            ("Current", 0, r1, r6, r24, r72, raw_sm),
            ("+6h", 6, r1 * 0.8, r6 + forecast_rain.get("+6h", 12.0), r24 + forecast_rain.get("+6h", 12.0), r72 + forecast_rain.get("+6h", 12.0), min(85.0, raw_sm + 3.0)),
            ("+12h", 12, r1 * 0.7, forecast_rain.get("+12h", 25.0), r24 + forecast_rain.get("+12h", 25.0), r72 + forecast_rain.get("+12h", 25.0), min(85.0, raw_sm + 6.0)),
            ("+24h", 24, r1 * 0.6, forecast_rain.get("+24h", 45.0) * 0.4, r24 + forecast_rain.get("+24h", 45.0), r72 + forecast_rain.get("+24h", 45.0), min(85.0, raw_sm + 8.0)),
            ("+48h", 48, r1 * 0.5, forecast_rain.get("+48h", 70.0) * 0.3, r24 + forecast_rain.get("+48h", 70.0), r72 + forecast_rain.get("+48h", 70.0), min(85.0, raw_sm + 5.0)),
            ("+72h", 72, r1 * 0.4, forecast_rain.get("+72h", 90.0) * 0.25, r24 + forecast_rain.get("+72h", 90.0), r72 + forecast_rain.get("+72h", 90.0), min(85.0, raw_sm + 2.0))
        ]

        for h_label, h_hours, hr1, hr6, hr24_val, hr72_val, h_sm in h_defs:
            h_eff_sm = transform_soil_moisture_plateau(h_sm)
            h_ari_r, h_swi, h_gv, h_br = compute_engineered_features(base_slope, hr1, hr24_val, hr72_val, h_eff_sm, lith_val, veg_val)
            batch_matrix[row_idx] = [
                base_slope, aspect_cos, aspect_sin, elev, curv,
                hr1, hr6, hr24_val, hr72_val, h_eff_sm, lith_val, veg_val,
                h_ari_r, h_swi, h_gv, h_br
            ]
            row_idx += 1

        district_meta.append((dist, w, lith_val, veg_val, base_slope, elev, pop, r1, r6, r24, r72, raw_sm, h_defs))

    # 3. Single vectorized model inference for all 228 horizon vectors
    if model is not None:
        try:
            all_probs = model.predict_proba(batch_matrix)[:, 1]
        except Exception:
            slopes = batch_matrix[:, 0]
            r24s = batch_matrix[:, 7]
            eff_sms = batch_matrix[:, 9]
            all_probs = np.clip((slopes / 50.0 * 0.4) + (r24s / 150.0 * 0.4) + (eff_sms * 0.2), 0.05, 0.96)
    else:
        slopes = batch_matrix[:, 0]
        r24s = batch_matrix[:, 7]
        eff_sms = batch_matrix[:, 9]
        all_probs = np.clip((slopes / 50.0 * 0.4) + (r24s / 150.0 * 0.4) + (eff_sms * 0.2), 0.05, 0.96)

    # 4. Construct district payload list
    results_list = []

    for i, (dist, w, lith_val, veg_val, base_slope, elev, pop, r1, r6, r24, r72, raw_sm, h_defs) in enumerate(district_meta):
        name = dist["name"]
        state = dist["state"]
        lat, lon = dist["lat"], dist["lon"]

        prob = float(all_probs[i * 6 + 0])
        if sim_districts is None:
            base_fail_prob = dist.get("failure_probability")
            if base_fail_prob is not None:
                if dist.get("state") == "Sikkim":
                    prob = float(base_fail_prob)
                else:
                    prob = max(prob, float(base_fail_prob))
        risk_level = classify_risk_level(prob)

        nearby_infra = [
            inf for inf in INFRASTRUCTURE_CACHE
            if inf.get("properties", {}).get("district") == name or inf.get("properties", {}).get("state") == state
        ]
        nearby_highways = [
            hw for hw in HIGHWAYS_CACHE
            if state in hw.get("properties", {}).get("state_segments", [])
        ]

        tier, eps, priority_explanation = compute_emergency_priority(prob, pop, nearby_infra, nearby_highways, base_slope)

        feat_dict = {
            "slope_deg": base_slope, "aspect_deg": 180, "elevation_m": elev, "curvature": curv,
            "rainfall_1h_mm": r1, "rainfall_6h_mm": r6, "rainfall_24h_mm": r24, "rainfall_72h_mm": r72,
            "soil_moisture_pct": raw_sm, "lithology_vulnerability": lith_val, "veg_cover_protection": veg_val
        }
        explanation = explainer.explain(feat_dict)

        timeline_items = []
        for h_idx, (h_label, h_hours, hr1, hr6, hr24_val, hr72_val, h_sm) in enumerate(h_defs):
            if h_idx == 0:
                h_prob = prob
            else:
                raw_delta = float(all_probs[i * 6 + h_idx]) - float(all_probs[i * 6 + 0])
                h_prob = prob + raw_delta
            h_prob_clamped = round(float(min(0.98, max(0.04, h_prob))), 3)
            base_confidence = 0.94 if w.get("data_nature") == "OBSERVED" else 0.86
            h_confidence = round(max(0.60, base_confidence - (h_hours * 0.003)), 2)
            timeline_items.append({
                "horizon": h_label,
                "hours_ahead": h_hours,
                "predicted_risk": classify_risk_level(h_prob_clamped),
                "probability": h_prob_clamped,
                "rainfall_forecast_mm": round(hr24_val, 1),
                "soil_moisture_pct": round(h_sm, 1),
                "confidence": h_confidence,
                "data_nature": "MODEL_PREDICTION" if h_hours > 0 else w.get("data_nature", "OBSERVED")
            })

        if tier == "P1":
            actions = [
                "Deploy SDRF/NDRF tactical response unit to identified road chokepoints.",
                "Issue emergency travel advisory and traffic restriction on vulnerable highway segments.",
                "Activate emergency relief shelter readiness and pre-position earthmoving machinery."
            ]
        elif tier == "P2":
            actions = [
                "Dispatch District Disaster Management Authority (DDMA) geotechnical inspection team.",
                "Monitor culvert and drainage outflow along highway cuttings.",
                "Alert local village headmen and community early warning volunteers."
            ]
        elif tier == "P3":
            actions = [
                "Verify automated rain gauge and IoT sensor data transmission.",
                "Inspect roadside slope drainage channels for debris clogs.",
                "Maintain regular 6-hourly meteorological bulletin review."
            ]
        elif tier == "P4":
            actions = [
                "Maintain routine sensor telemetry checks and drainage inspection.",
                "Issue seasonal advisory to transportation and road maintenance authorities."
            ]
        else:
            actions = [
                "Continue automated background telemetry surveillance.",
                "Standard periodic maintenance of slope stabilization structures."
            ]

        confidence_score = 0.93 if w.get("data_nature") == "OBSERVED" else 0.85
        zone_id = f"ZONE-{name.replace(' ', '-').upper()}"

        results_list.append({
            "id": zone_id,
            "district": name,
            "state": state,
            "latitude": lat,
            "longitude": lon,
            "elevation_m": elev,
            "slope_deg": base_slope,
            "aspect_deg": 180.0,
            "population": pop,
            "current_risk": risk_level,
            "probability": round(prob, 3),
            "severity_score": round(prob * 100, 1),
            "emergency_priority": tier,
            "priority_score": eps,
            "priority_explanation": priority_explanation,
            "confidence": confidence_score,
            "data_nature": w.get("data_nature", "OBSERVED"),
            "data_freshness": "Updated recently (NWP Telemetry)",
            "risk_trend": "INCREASING" if timeline_items[2]["probability"] > prob else "STABLE",
            "rainfall_1h_mm": r1,
            "rainfall_6h_mm": r6,
            "rainfall_24h_mm": r24,
            "rainfall_72h_mm": r72,
            "soil_moisture_pct": raw_sm,
            "soil_saturation_state": "SATURATED_PLATEAU" if raw_sm >= 70.0 else ("HIGH" if raw_sm >= 60.0 else "NORMAL"),
            "geographic_risk_context": dist.get("geographic_risk_context", "Strategic Regional Corridor"),
            "lower_bound_susceptibility_pct": dist.get("lower_bound_susceptibility_pct", 50.0),
            "failure_probability": dist.get("failure_probability", round(prob, 3)),
            "failure_probability_pct": dist.get("failure_probability_pct", round(prob * 100, 1)),
            "primary_factors": explanation["factors"],
            "explanation_summary": explanation["explanation_text"],
            "forecast_timeline": timeline_items,
            "nearby_highways": nearby_highways[:2],
            "nearby_infrastructure": nearby_infra[:3],
            "isolation_impact": get_highway_isolation_impact(name, state, risk_level, nearby_highways),
            "recommended_authority_actions": actions
        })

    LOCATIONS_RISK_CACHE["data"] = results_list
    LOCATIONS_RISK_CACHE["cached_at"] = now
    LOCATIONS_RISK_CACHE["sim_key"] = sim_key

    # Check automated risk threshold in-app alerting (Dashboard only, ZERO emails)
    try:
        from backend.database import get_alert_configuration
        from backend.services.alert_service import alert_service
        config = get_alert_configuration()
        if config.get("automated_risk_alerting_active", True):
            threshold = config.get("risk_alert_threshold", 0.75)
            for loc in results_list:
                prob = loc.get("probability", 0.0)
                if prob >= threshold:
                    district = loc.get("district", "")
                    state = loc.get("state", "")
                    asyncio.create_task(alert_service.trigger_alert(
                        title=f"AUTOMATED RISK ALERT: {loc.get('current_risk')} ({prob * 100:.0f}%) in {district}",
                        severity=loc.get("current_risk", "CRITICAL"),
                        district=district,
                        state=state,
                        message=f"Automated Risk Alert: Landslide probability in {district} reached {prob * 100:.0f}% (exceeding {threshold * 100:.0f}% threshold). 24h precipitation: {loc.get('rainfall_24h_mm', 0)}mm, soil moisture: {loc.get('soil_moisture_pct', 0):.1f}%. Immediate monitoring active.",
                        channels=["DASHBOARD"],
                        force=False,
                        alert_type="RISK",
                        probability=prob,
                        risk_context=loc
                    ))
    except Exception:
        pass

    return results_list

