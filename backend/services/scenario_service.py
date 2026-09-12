"""
What-If Scenario Simulation Engine for RAKSHAK
Implements:
- Custom What-If sensitivity analysis requested explicitly by authorities via WhatIfSimulatorModal
- Computes hypothetical rainfall surges and soil saturation modifiers across districts
- Results are isolated to the simulator modal and strictly labeled with provenance: "SIMULATION"
- Zero automatic background overrides or unsolicited state mutations
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone

async def run_custom_what_if_simulation(
    rainfall_multiplier: float = 1.0,
    soil_saturation_override: Optional[float] = None,
    blocked_highways: Optional[list] = None,
    target_state: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a high-performance What-If Disaster Simulation across all 8 NER states.
    Recalculates risk probabilities, emergency priority scores, and cascading impacts for the analytical simulator.
    Output is strictly demarcated with provenance: SIMULATION.
    """
    from backend.services.risk_service import DISTRICTS_CACHE, get_all_locations_risk, load_geo_registries
    load_geo_registries()

    now_str = datetime.now(timezone.utc).isoformat()
    blocked_hws = blocked_highways or []

    # 1. Obtain baseline operational risk data for true baseline KPI comparison
    baseline_all = await get_all_locations_risk()
    if target_state:
        baseline_locations = [loc for loc in baseline_all if loc["state"].lower() == target_state.lower()]
    else:
        baseline_locations = baseline_all

    baseline_critical = sum(1 for loc in baseline_locations if loc["current_risk"] == "CRITICAL")
    baseline_pop = sum(loc["population"] for loc in baseline_locations if loc["current_risk"] in ["CRITICAL", "HIGH", "WARNING"])

    # Create district baseline lookup
    base_loc_lookup = {loc["district"]: loc for loc in baseline_locations}

    # 2. Build simulated weather overrides for all relevant districts
    sim_overrides = {}
    for dist in DISTRICTS_CACHE:
        if target_state and dist["state"].lower() != target_state.lower():
            continue

        base_loc = base_loc_lookup.get(dist["name"])
        base_rain = max(40.0, base_loc["rainfall_24h_mm"]) if (base_loc and base_loc.get("rainfall_24h_mm")) else (
            45.0 if dist["state"] in ["Assam", "Meghalaya", "Sikkim"] else 35.0
        )
        scaled_rain = round(base_rain * rainfall_multiplier, 1)

        if soil_saturation_override is not None:
            sim_sm = float(soil_saturation_override)
        else:
            base_sm = base_loc["soil_moisture_pct"] if base_loc and base_loc.get("soil_moisture_pct") else 55.0
            sim_sm = min(95.0, max(35.0, base_sm + (scaled_rain - base_rain) * 0.25))

        sim_overrides[dist["name"]] = {
            "source": f"WHAT-IF SIMULATION (+{int((rainfall_multiplier - 1.0)*100)}% Surge)",
            "data_nature": "SIMULATION",
            "timestamp": now_str,
            "is_fallback": False,
            "temperature_c": 20.5,
            "humidity_pct": 98.0,
            "wind_speed_kmh": 22.0,
            "rainfall_1h_mm": round(scaled_rain * 0.15, 1),
            "rainfall_6h_mm": round(scaled_rain * 0.50, 1),
            "rainfall_24h_mm": scaled_rain,
            "rainfall_72h_mm": round(scaled_rain * 2.2, 1),
            "soil_moisture_pct": round(sim_sm, 1),
            "forecast_rainfall": {
                "+6h": round(scaled_rain * 0.3, 1),
                "+12h": round(scaled_rain * 0.6, 1),
                "+24h": round(scaled_rain * 1.1, 1),
                "+48h": round(scaled_rain * 1.5, 1),
                "+72h": round(scaled_rain * 1.8, 1)
            }
        }

    # 3. Run high-performance batch simulation
    simulated_all = await get_all_locations_risk(sim_districts=sim_overrides, force_refresh=True)
    if target_state:
        simulated_locations = [loc for loc in simulated_all if loc["state"].lower() == target_state.lower()]
    else:
        simulated_locations = simulated_all

    # 4. Projected KPI calculations and baseline decoration
    for loc in simulated_locations:
        base_loc = base_loc_lookup.get(loc["district"])
        if base_loc:
            loc["baseline_probability"] = base_loc.get("probability", loc["probability"])
            loc["baseline_risk"] = base_loc.get("current_risk", loc["current_risk"])
            loc["risk_delta_pct"] = round((loc["probability"] - loc["baseline_probability"]) * 100, 1)
            loc["rainfall_baseline_mm"] = base_loc.get("rainfall_24h_mm", 0.0)
            loc["soil_moisture_baseline_pct"] = base_loc.get("soil_moisture_pct", 0.0)
        else:
            loc["baseline_probability"] = loc["probability"]
            loc["baseline_risk"] = loc["current_risk"]
            loc["risk_delta_pct"] = 0.0
            loc["rainfall_baseline_mm"] = loc.get("rainfall_24h_mm", 0.0)
            loc["soil_moisture_baseline_pct"] = loc.get("soil_moisture_pct", 0.0)

    projected_critical = sum(1 for loc in simulated_locations if loc["current_risk"] == "CRITICAL")
    projected_high = sum(1 for loc in simulated_locations if loc["current_risk"] == "HIGH")
    projected_pop = sum(loc["population"] for loc in simulated_locations if loc["current_risk"] in ["CRITICAL", "HIGH", "WARNING"])

    # 5. Highway impacts
    highway_impacts = []
    for hw_id in ["NH-27", "NH-10", "NH-29", "NH-37", "NH-6", "NH-13"]:
        is_blocked = hw_id in blocked_hws or (projected_critical >= 3 and hw_id in ["NH-27", "NH-10"])
        highway_impacts.append({
            "highway_id": hw_id,
            "simulated_status": "BLOCKED" if is_blocked else ("AT_RISK" if projected_critical > 0 else "OPEN"),
            "connectivity_loss_pct": 85.0 if is_blocked else (40.0 if projected_critical > 0 else 5.0)
        })

    avg_sim_sm = sum(loc["soil_moisture_pct"] for loc in simulated_locations) / max(1, len(simulated_locations))
    cascading_chain = [
        f"Precipitation surge applied: {int((rainfall_multiplier - 1.0)*100):+d}% relative to district baseline",
        f"Soil moisture saturation shifts to {avg_sim_sm:.1f}% average across vulnerable slopes",
        f"Critical landslide risk zones change to {projected_critical} district(s) (High risk: {projected_high})",
        f"Estimated exposed population shifts to {projected_pop:,} residents",
        f"Strategic corridors at risk: {sum(1 for h in highway_impacts if h['simulated_status'] in ['BLOCKED', 'AT_RISK'])} lifelines"
    ]

    return {
        "scenario_id": f"WHATIF-{int(time.time())}",
        "timestamp": now_str,
        "baseline_critical_count": max(0, baseline_critical),
        "projected_critical_count": projected_critical,
        "baseline_exposed_pop": baseline_pop,
        "projected_exposed_pop": projected_pop,
        "rainfall_surge_pct": round((rainfall_multiplier - 1.0) * 100, 1),
        "soil_saturation_override_pct": soil_saturation_override,
        "projected_locations": simulated_locations,
        "highways_affected": highway_impacts,
        "cascading_impact_chain": cascading_chain,
        "provenance": "SIMULATION"
    }
