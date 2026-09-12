"""
Weather & Meteorological Data Router
"""

from fastapi import APIRouter, Query
from backend.services.weather_service import fetch_weather_telemetry

router = APIRouter(prefix="/weather", tags=["Meteorology & Rainfall"])

@router.get("/live")
async def get_live_weather(
    lat: float = Query(26.2006, description="Latitude"),
    lon: float = Query(92.9376, description="Longitude"),
    state: str = Query("Assam", description="State name"),
    district: str = Query("", description="District name")
):
    return await fetch_weather_telemetry(lat, lon, state=state, district=district)
