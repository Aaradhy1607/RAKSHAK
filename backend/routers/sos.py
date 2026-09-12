"""
Emergency SOS Dispatch & Incident Command Router
Upgraded RAKSHAK Rapid Response, Risk Context Attachment & Escalation Engine:
- Captures GPS, emergency type, people affected, contact phone
- Immediately looks up and attaches live Landslide Risk Intelligence & Telemetry (Probability, SHAP factors, Rainfall, Soil Saturation, Nearby Shelters)
- Dispatches simultaneous Level 1 Emergency Alert to all registered primary responders
- Manages complete lifecycle: NEW -> AWAITING_ACKNOWLEDGEMENT -> ACKNOWLEDGED / RESPONSE_IN_PROGRESS -> ESCALATED (L2/L3) -> RESOLVED
- Full audit timeline and WebSocket broadcast for real-time Command Center coordination
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
import time
import uuid
from datetime import datetime, timezone
import math

from backend.models import (
    SOSTriggerCreate,
    SOSStatusUpdate,
    SOSIncidentAcknowledgeRequest,
    SOSIncidentEscalateRequest,
    SOSIncidentResolveRequest
)
from backend.database import (
    insert_sos_incident,
    get_sos_incidents,
    get_sos_incident_by_id,
    update_sos_status,
    acknowledge_sos_incident,
    escalate_sos_incident,
    resolve_sos_incident,
    get_escalation_events,
    utcnow_str
)
from backend.services.websocket_manager import ws_hub
from backend.services.alert_service import alert_service
from backend.services.auth_service import (
    get_current_user_optional,
    require_authority_or_admin,
    sanitize_sos_pii
)

router = APIRouter(prefix="/sos", tags=["Emergency SOS & Rapid Response"])


async def _fetch_live_risk_context(lat: float, lon: float, district: str) -> Dict[str, Any]:
    """
    Attaches real landslide intelligence to the SOS incident from RAKSHAK risk engine.
    """
    try:
        from backend.services.risk_service import get_all_locations_risk, INFRASTRUCTURE_CACHE
        all_locs = await get_all_locations_risk()
        
        # Find closest monitored district / zone
        closest_loc = None
        min_dist = float("inf")
        for loc in all_locs:
            if loc.get("district", "").lower() == district.lower():
                closest_loc = loc
                break
            d = math.hypot(loc.get("latitude", 0) - lat, loc.get("longitude", 0) - lon)
            if d < min_dist:
                min_dist = d
                closest_loc = loc

        # Find nearest hospital & shelter from infrastructure cache
        nearest_hospital = None
        nearest_shelter = None
        min_hosp_dist = float("inf")
        min_shlt_dist = float("inf")

        for f in INFRASTRUCTURE_CACHE:
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [lon, lat])
            c_lat, c_lon = coords[1], coords[0]
            dist_km = math.hypot(c_lat - lat, c_lon - lon) * 111.0 # Approximate km

            itype = props.get("type", "").upper()
            if "HOSPITAL" in itype and dist_km < min_hosp_dist:
                min_hosp_dist = dist_km
                nearest_hospital = {
                    "name": props.get("name"),
                    "type": props.get("type"),
                    "district": props.get("district"),
                    "distance_km": round(dist_km, 1),
                    "beds": props.get("beds", 50),
                    "status": props.get("status", "OPERATIONAL")
                }
            elif ("SHELTER" in itype or "RELIEF" in itype or "SCHOOL" in itype) and dist_km < min_shlt_dist:
                min_shlt_dist = dist_km
                nearest_shelter = {
                    "name": props.get("name"),
                    "type": props.get("type"),
                    "district": props.get("district"),
                    "distance_km": round(dist_km, 1),
                    "capacity": props.get("capacity", 200),
                    "status": props.get("status", "OPERATIONAL")
                }

        if closest_loc:
            return {
                "status": "ATTACHED",
                "probability": closest_loc.get("probability", 0.0),
                "current_risk": closest_loc.get("current_risk", "LOW"),
                "emergency_priority": closest_loc.get("emergency_priority", "P1"),
                "confidence": closest_loc.get("confidence", 0.90),
                "data_freshness": closest_loc.get("data_freshness", "Real-time Telemetry (1m ago)"),
                "rainfall_1h_mm": closest_loc.get("rainfall_1h_mm", 0.0),
                "rainfall_24h_mm": closest_loc.get("rainfall_24h_mm", 0.0),
                "soil_moisture_pct": closest_loc.get("soil_moisture_pct", 0.0),
                "soil_saturation_state": closest_loc.get("soil_saturation_state", "NORMAL"),
                "primary_factors": closest_loc.get("primary_factors", [])[:3],
                "explanation_summary": closest_loc.get("explanation_summary", "High local precipitation and steep slope conditions."),
                "elevation_m": closest_loc.get("elevation_m", 600.0),
                "slope_deg": closest_loc.get("slope_deg", 28.5),
                "nearest_hospital": nearest_hospital,
                "nearest_shelter": nearest_shelter
            }
        else:
            return {
                "status": "RISK_CONTEXT_CURRENTLY_UNAVAILABLE",
                "explanation_summary": "Risk context calculated from nearest geo-corridor coordinates.",
                "nearest_hospital": nearest_hospital,
                "nearest_shelter": nearest_shelter
            }
    except Exception as e:
        return {
            "status": "RISK_CONTEXT_CURRENTLY_UNAVAILABLE",
            "error": str(e)
        }


@router.get("")
async def list_sos(
    limit: int = 100,
    district: Optional[str] = None,
    my_sos: bool = False,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    user_role = (user_dict.get("role") or "").upper() if user_dict else None

    # If specifically requested my_sos or if user is a registered citizen, return their own SOS beacons
    if my_sos or user_role == "CITIZEN":
        if not user_dict:
            return []
        incidents = get_sos_incidents(
            limit=limit,
            user_email=user_dict.get("email"),
            user_id=user_dict.get("sub"),
            district=district
        )
    else:
        incidents = get_sos_incidents(limit=limit, district=district)

    return [sanitize_sos_pii(s, user_dict) for s in incidents]


@router.get("/{sos_id}")
async def get_sos_detail(
    sos_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    sos = get_sos_incident_by_id(sos_id)
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS Incident '{sos_id}' not found.")
    escalation_events = get_escalation_events(incident_id=sos_id)
    sos["escalation_events"] = escalation_events
    return sanitize_sos_pii(sos, user_dict)


@router.post("")
async def trigger_sos(
    payload: SOSTriggerCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    sos_id = f"SOS-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
    now_str = utcnow_str()
    district = payload.district or "Dima Hasao"
    state = payload.state or "Assam"
    map_link = f"https://www.google.com/maps?q={payload.latitude:.6f},{payload.longitude:.6f}"

    # Determine caller identity
    user_id = user_dict.get("sub") if user_dict else None
    reporter_email = user_dict.get("email") if user_dict else None

    # 1. Attach live Landslide Risk Intelligence
    risk_context = await _fetch_live_risk_context(payload.latitude, payload.longitude, district)
    risk_context["latitude"] = payload.latitude
    risk_context["longitude"] = payload.longitude
    risk_context["accuracy_m"] = payload.accuracy_m or 10.0

    sos_data = {
        "id": sos_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy_m": payload.accuracy_m or 10.0,
        "district": district,
        "state": state,
        "emergency_type": payload.emergency_type,
        "message": payload.message or "Immediate emergency assistance requested.",
        "people_affected": payload.people_affected or 1,
        "contact_phone": payload.contact_phone or "",
        "status": "AWAITING_ACKNOWLEDGEMENT",
        "assigned_team": None,
        "priority": "P1",
        "is_synced_from_offline": False,
        "created_at": now_str,
        "current_escalation_level": 1,
        "map_link": map_link,
        "hazard_category": "LANDSLIDE_DISASTER",
        "risk_context": risk_context,
        "user_id": user_id,
        "reporter_email": reporter_email,
        "timeline": [
            {
                "timestamp": now_str,
                "status": "AWAITING_ACKNOWLEDGEMENT",
                "assigned_team": None,
                "note": f"Emergency SOS beacon triggered. Distress message: '{payload.message}'. People affected: {payload.people_affected}.",
                "updated_by": user_dict.get("name") if user_dict else "Citizen Mobile Beacon"
            }
        ]
    }

    # Store in database
    insert_sos_incident(sos_data)

    # 2. Real-time broadcast to Command Center via WebSocket
    await ws_hub.broadcast("NEW_SOS_TRIGGERED", sos_data)

    # 3. Simultaneously dispatch Level 1 Emergency Alert across Email, In-App to Level 1 contacts
    prob_str = f"{risk_context.get('probability', 0.0) * 100:.0f}%" if risk_context.get("probability") is not None else "N/A"
    dispatch_result = await alert_service.dispatch_escalation_alert(
        incident_id=sos_id,
        escalation_level=1,
        title=f"CRITICAL SOS: {payload.emergency_type} in {district}",
        severity="CRITICAL",
        district=district,
        state=state,
        message=f"SOS Alert ID: {sos_id}. {payload.people_affected} person(s) reported trapped/stranded near ({payload.latitude:.4f}, {payload.longitude:.4f}). Landslide Hazard Risk: {prob_str}. Immediate tactical dispatch requested.",
        risk_context=risk_context,
        map_link=map_link
    )

    return {
        "status": "SOS_DISPATCHED",
        "message": "Emergency SOS received. Level 1 Response Team and District Emergency Operation Center alerted simultaneously.",
        "incident_id": sos_id,
        "sos_incident": sanitize_sos_pii(sos_data, user_dict),
        "dispatch_summary": dispatch_result
    }


@router.post("/{sos_id}/acknowledge")
async def acknowledge_sos(
    sos_id: str,
    payload: SOSIncidentAcknowledgeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    actor = payload.acknowledged_by
    if user_dict and (not actor or actor == "Duty Officer"):
        actor = f"{user_dict.get('name')} ({user_dict.get('department', 'Command')})"

    updated = acknowledge_sos_incident(
        sos_id=sos_id,
        acknowledged_by=actor,
        notes=payload.notes
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"SOS Incident '{sos_id}' not found.")

    # Broadcast acknowledgement event over WebSocket
    await ws_hub.broadcast("SOS_ACKNOWLEDGED", updated)
    await ws_hub.broadcast("SOS_STATUS_UPDATED", updated)

    return {
        "status": "ACKNOWLEDGED",
        "message": f"Incident {sos_id} successfully acknowledged by {actor}. Automatic escalation halted.",
        "sos_incident": updated
    }


@router.post("/{sos_id}/escalate")
async def escalate_sos(
    sos_id: str,
    payload: SOSIncidentEscalateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    current = get_sos_incident_by_id(sos_id)
    if not current:
        raise HTTPException(status_code=404, detail=f"SOS Incident '{sos_id}' not found.")

    current_lvl = current.get("current_escalation_level", 1)
    target_lvl = payload.escalate_to_level or min(current_lvl + 1, 3)

    if current.get("status") == "RESOLVED":
        raise HTTPException(status_code=400, detail="Cannot escalate an already resolved incident.")

    actor = payload.actor
    if user_dict and (not actor or actor == "Command Officer"):
        actor = f"{user_dict.get('name')} ({user_dict.get('department', 'Command')})"

    # Execute escalation
    updated = escalate_sos_incident(
        sos_id=sos_id,
        to_level=target_lvl,
        reason=payload.reason or f"Escalated to Level {target_lvl}",
        actor=actor or "Command Officer"
    )

    # Simultaneously alert all contacts in the target escalation group
    dispatch_result = await alert_service.dispatch_escalation_alert(
        incident_id=sos_id,
        escalation_level=target_lvl,
        title=f"ESCALATION ALERT (LEVEL {target_lvl}): {current.get('emergency_type', 'LANDSLIDE')} in {current.get('district')}",
        severity="CRITICAL",
        district=current.get("district", ""),
        state=current.get("state", ""),
        message=f"URGENT ESCALATION to Level {target_lvl} for Incident {sos_id}. Reason: {payload.reason}. Immediate higher-tier intervention mandated.",
        risk_context=current.get("risk_context"),
        map_link=current.get("map_link")
    )

    await ws_hub.broadcast("SOS_ESCALATED", updated)
    await ws_hub.broadcast("SOS_STATUS_UPDATED", updated)

    return {
        "status": "ESCALATED",
        "escalation_level": target_lvl,
        "message": f"Incident {sos_id} escalated to Level {target_lvl}. Level {target_lvl} responder group notified.",
        "sos_incident": updated,
        "dispatch_summary": dispatch_result
    }


@router.post("/{sos_id}/resolve")
async def resolve_sos(
    sos_id: str,
    payload: SOSIncidentResolveRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    actor = payload.resolved_by
    if user_dict and (not actor or actor == "Command Officer"):
        actor = f"{user_dict.get('name')} ({user_dict.get('department', 'Command')})"

    updated = resolve_sos_incident(
        sos_id=sos_id,
        resolved_by=actor,
        resolution_notes=payload.resolution_notes,
        assigned_team=payload.assigned_team
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"SOS Incident '{sos_id}' not found.")

    await ws_hub.broadcast("SOS_RESOLVED", updated)
    await ws_hub.broadcast("SOS_STATUS_UPDATED", updated)

    return {
        "status": "RESOLVED",
        "message": f"Incident {sos_id} successfully marked as resolved by {actor}.",
        "sos_incident": updated
    }


@router.patch("/{sos_id}/status")
async def update_status(
    sos_id: str,
    payload: SOSStatusUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    user_dict = current_user if isinstance(current_user, dict) else None
    actor = payload.updated_by
    if user_dict and (not actor or actor == "Command Officer"):
        actor = f"{user_dict.get('name')} ({user_dict.get('department', 'Command')})"

    updated = update_sos_status(
        sos_id=sos_id,
        new_status=payload.status.value,
        assigned_team=payload.assigned_team,
        note=payload.notes,
        updated_by=actor or "Command Officer"
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"SOS Incident '{sos_id}' not found.")

    await ws_hub.broadcast("SOS_STATUS_UPDATED", updated)
    return {
        "status": "SUCCESS",
        "sos_incident": updated
    }

