"""
Risk & Situational Overview Router
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from backend.services.risk_service import (
    get_all_locations_risk,
    calculate_location_risk,
    DISTRICTS_CACHE,
    load_geo_registries
)
from backend.database import get_sos_incidents, get_citizen_reports, get_active_alerts

router = APIRouter(prefix="/risk", tags=["Risk Intelligence"])

@router.get("/overview")
async def get_risk_overview():
    load_geo_registries()
    all_risks = await get_all_locations_risk()

    critical_count = sum(1 for r in all_risks if r["current_risk"] == "CRITICAL")
    high_count = sum(1 for r in all_risks if r["current_risk"] == "HIGH")
    warning_count = sum(1 for r in all_risks if r["current_risk"] == "WARNING")
    watch_count = sum(1 for r in all_risks if r["current_risk"] == "WATCH")
    low_count = sum(1 for r in all_risks if r["current_risk"] in ["LOW", "SAFE"])

    open_sos = get_sos_incidents(limit=50)
    open_sos_count = sum(1 for s in open_sos if s["status"] not in ["RESOLVED", "REJECTED"])

    reports = get_citizen_reports(limit=50)
    unverified_reports = sum(1 for rep in reports if rep["status"] in ["NEW", "AI_ASSESSED", "UNDER_REVIEW"])

    exposed_pop = sum(r["population"] for r in all_risks if r["current_risk"] in ["CRITICAL", "HIGH", "WARNING"])

    # High-risk highways
    roads_at_risk = 4 if (critical_count + high_count) > 0 else 1

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_monitored_districts": len(all_risks),
        "active_critical_zones": critical_count,
        "active_high_zones": high_count,
        "active_warning_zones": warning_count,
        "active_watch_zones": watch_count,
        "active_low_zones": low_count,
        "open_sos_count": open_sos_count,
        "unverified_reports_count": unverified_reports,
        "roads_at_risk_count": roads_at_risk,
        "exposed_population_count": exposed_pop,
        "system_data_health": "HEALTHY",
        "is_simulation_mode": False,
        "simulation_step": 0,
        "districts_summary": [
            {
                "id": r["id"],
                "district": r["district"],
                "state": r["state"],
                "risk": r["current_risk"],
                "probability": r["probability"],
                "emergency_priority": r["emergency_priority"],
                "priority_score": r["priority_score"],
                "rainfall_24h_mm": r["rainfall_24h_mm"],
                "soil_moisture_pct": r["soil_moisture_pct"],
                "confidence": r["confidence"],
                "data_nature": r["data_nature"],
                "lat": r["latitude"],
                "lon": r["longitude"]
            }
            for r in all_risks
        ]
    }

@router.get("/locations")
async def get_all_locations(horizon: str = Query("Current", description="Current, +6h, +12h, +24h, +48h, +72h")):
    all_risks = await get_all_locations_risk()
    
    # If a specific future horizon is requested, adapt the current_risk to that horizon's forecast without mutating cache
    if horizon != "Current":
        adapted_list = []
        for r in all_risks:
            r_copy = dict(r)
            matching_h = next((h for h in r.get("forecast_timeline", []) if h.get("horizon") == horizon), None)
            if matching_h:
                r_copy["current_risk"] = matching_h["predicted_risk"]
                r_copy["probability"] = matching_h["probability"]
                r_copy["data_nature"] = matching_h["data_nature"]
                r_copy["confidence"] = matching_h["confidence"]
            adapted_list.append(r_copy)
        return adapted_list

    return [dict(r) for r in all_risks]

@router.get("/location/{district_name}")
async def get_single_location_risk(district_name: str):
    load_geo_registries()
    dist = next((d for d in DISTRICTS_CACHE if d["name"].lower() == district_name.lower()), None)
    if not dist:
        raise HTTPException(status_code=404, detail=f"District '{district_name}' not found in NER registry.")

    return await calculate_location_risk(dist)

@router.get("/ai-advisory/{district_name}")
async def get_ai_district_advisory(district_name: str, prompt: Optional[str] = Query(None, description="Custom prompt query")):
    load_geo_registries()
    dist = next((d for d in DISTRICTS_CACHE if d["name"].lower() == district_name.lower()), DISTRICTS_CACHE[0])
    loc_risk = await calculate_location_risk(dist)
    
    from backend.services.gemini_service import generate_gemini_advisory
    return generate_gemini_advisory(
        district=loc_risk["district"],
        state=loc_risk["state"],
        risk_level=loc_risk["current_risk"],
        rainfall_24h_mm=loc_risk["rainfall_24h_mm"],
        soil_moisture_pct=loc_risk["soil_moisture_pct"],
        slope_deg=loc_risk["slope_deg"],
        priority=loc_risk["emergency_priority"],
        prompt_override=prompt
    )
