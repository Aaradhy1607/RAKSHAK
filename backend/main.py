"""
Main FastAPI Application Entrypoint
NER Landslide Early Warning & Risk Monitoring System (SIH 26001)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.config import settings
from backend.database import init_db
from backend.services.websocket_manager import ws_hub

# Routers
from backend.routers.risk import router as risk_router
from backend.routers.weather import router as weather_router
from backend.routers.reports import router as reports_router
from backend.routers.sos import router as sos_router
from backend.routers.roads import router as roads_router
from backend.routers.infrastructure import router as infra_router
from backend.routers.analytics import router as analytics_router
from backend.routers.data_health import router as health_router
from backend.routers.scenario import router as scenario_router
from backend.routers.export import router as export_router
from backend.routers.admin import router as admin_router
from backend.routers.auth import router as auth_router
import asyncio
import time
from datetime import datetime, timezone

# Initialize database
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Based Early Warning and Landslide Risk Monitoring System for North Eastern Region (MDoNER / SIH 26001)",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images and sample assets
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/api/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# Include Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(risk_router, prefix=settings.API_V1_STR)
app.include_router(weather_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(sos_router, prefix=settings.API_V1_STR)
app.include_router(roads_router, prefix=settings.API_V1_STR)
app.include_router(infra_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(scenario_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.post("/api/webhooks/brevo")
async def brevo_webhook_alias(payload: dict):
    from backend.routers.admin import handle_brevo_webhook
    return await handle_brevo_webhook(payload)

async def auto_escalation_monitor():
    """Background worker that continuously monitors unacknowledged SOS incidents for timeout escalation."""
    while True:
        try:
            await asyncio.sleep(10)
            from backend.database import get_sos_incidents, get_alert_configuration, escalate_sos_incident
            from backend.services.alert_service import alert_service

            config = get_alert_configuration()
            timeout_sec = config.get("escalation_timeout_seconds", 120)
            max_lvl = config.get("max_escalation_level", 3)

            incidents = get_sos_incidents(limit=50)
            now = time.time()

            for inc in incidents:
                if inc.get("status") in ["AWAITING_ACKNOWLEDGEMENT", "NEW", "ESCALATED"]:
                    current_lvl = inc.get("current_escalation_level", 1)
                    if current_lvl < max_lvl:
                        # Check timestamp of created_at or updated_at
                        ts_str = inc.get("updated_at") or inc.get("created_at")
                        if ts_str:
                            try:
                                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                                elapsed = now - dt.timestamp()
                                if elapsed > timeout_sec:
                                    target_lvl = current_lvl + 1
                                    reason = f"Automated escalation: Acknowledgement timeout ({int(elapsed)}s > {timeout_sec}s threshold) exceeded for Level {current_lvl}."
                                    updated = escalate_sos_incident(
                                        sos_id=inc["id"],
                                        to_level=target_lvl,
                                        reason=reason,
                                        actor="Automated Escalation Daemon"
                                    )
                                    if updated:
                                        await ws_hub.broadcast("SOS_ESCALATED", updated)
                                        await ws_hub.broadcast("SOS_STATUS_UPDATED", updated)
                                        await alert_service.dispatch_escalation_alert(
                                            incident_id=inc["id"],
                                            escalation_level=target_lvl,
                                            title=f"AUTOMATED ESCALATION (LEVEL {target_lvl}): {inc.get('emergency_type', 'LANDSLIDE')} in {inc.get('district')}",
                                            severity="CRITICAL",
                                            district=inc.get("district", ""),
                                            state=inc.get("state", ""),
                                            message=f"Urgent Level {target_lvl} Escalation for SOS ID {inc['id']}. Acknowledgement timeout exceeded. Immediate intervention required.",
                                            risk_context=inc.get("risk_context"),
                                            map_link=inc.get("map_link")
                                        )
                            except Exception:
                                pass
        except Exception:
            pass

@app.on_event("startup")
async def startup_prewarm():
    """Warm lightweight registries locally; avoid long-lived server workers on Vercel."""
    try:
        from backend.services.risk_service import load_geo_registries, get_ml_model
        load_geo_registries()
        get_ml_model()

        # Vercel Functions are request-driven; avoid a full NER weather/model
        # sweep and an infinite background worker during cold starts.
        if not os.getenv("VERCEL"):
            from backend.services.risk_service import get_all_locations_risk
            await get_all_locations_risk()
            asyncio.create_task(auto_escalation_monitor())
    except Exception as e:
        print(f"[STARTUP] Pre-warm notice: {e}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_hub.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception:
        ws_hub.disconnect(websocket)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "supported_states": [
            "Assam", "Arunachal Pradesh", "Manipur", "Meghalaya",
            "Mizoram", "Nagaland", "Sikkim", "Tripura"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
