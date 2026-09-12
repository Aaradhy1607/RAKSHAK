from fastapi import APIRouter, Body
from backend.models import WhatIfScenarioRequest
from backend.services.scenario_service import run_custom_what_if_simulation

router = APIRouter(prefix="/scenario", tags=["Sensitivity & What-If Simulation"])

@router.post("/simulate-what-if")
async def simulate_what_if(payload: WhatIfScenarioRequest = Body(...)):
    """Simulates a custom disaster scenario with user-defined rainfall surges and road disruptions for What-If modal."""
    return await run_custom_what_if_simulation(
        rainfall_multiplier=payload.rainfall_multiplier,
        soil_saturation_override=payload.soil_saturation_override,
        blocked_highways=payload.blocked_highways,
        target_state=payload.target_state
    )
