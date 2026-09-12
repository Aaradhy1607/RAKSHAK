"""
Citizen Incident Reporting & Verification Router
Implements:
- Citizen & field officer reporting for slope failures, cracks, blockages
- Automated Computer Vision AI preliminary triage on uploaded photos
- Multi-step verification lifecycle (NEW -> AI_ASSESSED -> UNDER_REVIEW -> VERIFIED -> DISPATCHED -> RESOLVED)
- Real-time WebSocket event broadcasting
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, List, Dict, Any
import uuid
import os
import shutil
import time
from datetime import datetime, timezone
from backend.config import settings
from backend.database import (
    insert_citizen_report,
    get_citizen_reports,
    update_citizen_report_status
)
from backend.services.cv_service import assess_landslide_image
from backend.services.clustering_service import cluster_citizen_reports
from backend.services.websocket_manager import ws_hub
from backend.services.auth_service import (
    get_current_user_optional,
    require_authority_or_admin,
    sanitize_report_pii
)

router = APIRouter(prefix="/reports", tags=["Citizen Reporting"])

@router.get("")
async def list_reports(
    limit: int = 50,
    district: Optional[str] = None,
    my_reports: bool = False,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    if my_reports:
        if not current_user:
            return []
        reports = get_citizen_reports(
            limit=limit,
            user_email=current_user.get("email"),
            user_id=current_user.get("sub"),
            district=district
        )
    else:
        reports = get_citizen_reports(limit=limit, district=district)

    # Sanitize PII for non-authorities and non-owners
    return [sanitize_report_pii(r, current_user) for r in reports]

@router.get("/clusters")
async def list_report_clusters(
    district: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    reports = get_citizen_reports(limit=200, district=district)
    sanitized = [sanitize_report_pii(r, current_user) for r in reports]
    return cluster_citizen_reports(sanitized)

@router.post("")
async def create_report(
    category: str = Form(...),
    description: Optional[str] = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy_m: Optional[float] = Form(10.0),
    district: Optional[str] = Form("Dima Hasao"),
    state: Optional[str] = Form("Assam"),
    reporter_name: Optional[str] = Form("Anonymous Citizen"),
    reporter_phone: Optional[str] = Form(""),
    is_synced_from_offline: Optional[bool] = Form(False),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    report_id = f"REP-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
    image_url = None
    ai_assessment = None

    if image and image.filename:
        safe_filename = f"{report_id}_{image.filename.replace(' ', '_')}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/api/static/{safe_filename}"

        # Run AI Computer Vision Assessment
        ai_assessment = assess_landslide_image(file_path)
    else:
        ai_assessment = {
            "hazard_label": f"Citizen Reported {category}",
            "hazard_detected": True,
            "confidence": 0.70,
            "detected_indicators": ["Citizen field observation without attached photo"],
            "severity_rating": "MODERATE",
            "recommendation": "Field geotechnical verification recommended upon patrol schedule.",
            "disclaimer": "AI-assisted preliminary assessment — does not replace certified geotechnical survey."
        }

    status = "AI_ASSESSED" if ai_assessment else "NEW"
    now_str = datetime.now(timezone.utc).isoformat()

    # Determine caller identity
    final_name = reporter_name
    final_email = None
    user_id = None

    if current_user:
        user_id = current_user.get("sub")
        final_email = current_user.get("email")
        if not final_name or final_name == "Anonymous Citizen":
            final_name = current_user.get("name", "Verified Citizen")

    report_data = {
        "id": report_id,
        "category": category,
        "description": description or f"Reported {category} near coordinates ({latitude:.4f}, {longitude:.4f})",
        "latitude": latitude,
        "longitude": longitude,
        "accuracy_m": accuracy_m or 10.0,
        "district": district or "NER District",
        "state": state or "NER State",
        "status": status,
        "image_url": image_url,
        "ai_assessment": ai_assessment,
        "reporter_name": final_name or "Anonymous Citizen",
        "reporter_phone": reporter_phone or "",
        "is_synced_from_offline": is_synced_from_offline or False,
        "created_at": now_str,
        "user_id": user_id,
        "reporter_email": final_email
    }

    insert_citizen_report(report_data)

    # Broadcast real-time event to Command Center
    await ws_hub.broadcast("NEW_CITIZEN_REPORT", report_data)

    return {
        "status": "SUCCESS",
        "message": "Incident report successfully logged and routed to district emergency queue.",
        "report": sanitize_report_pii(report_data, current_user)
    }

@router.patch("/{report_id}/status")
async def update_status(
    report_id: str,
    status: str = Form(...),
    notes: Optional[str] = Form(""),
    verified_by: Optional[str] = Form("Duty Officer"),
    current_user: Dict[str, Any] = Depends(require_authority_or_admin)
):
    actor_label = verified_by
    if current_user:
        actor_label = f"{current_user.get('name')} ({current_user.get('department', 'Command')})"

    updated = update_citizen_report_status(report_id, status, verified_by=actor_label, notes=notes)
    if not updated:
        raise HTTPException(status_code=404, detail="Report ID not found.")

    await ws_hub.broadcast("REPORT_STATUS_UPDATED", {"report_id": report_id, "status": status, "notes": notes, "verified_by": actor_label})
    return {"status": "SUCCESS", "report": updated}
