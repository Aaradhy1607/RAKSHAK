import pytest
import asyncio
import numpy as np
from backend.services.risk_service import (
    DISTRICTS_CACHE,
    load_geo_registries,
    calculate_location_risk,
    get_all_locations_risk,
    get_ml_model,
    LOCATIONS_RISK_CACHE
)
from backend.services.scenario_service import run_custom_what_if_simulation
from ml.dataset import transform_soil_moisture_plateau, compute_engineered_features

@pytest.fixture(autouse=True)
def setup_registries():
    load_geo_registries()

@pytest.mark.asyncio
async def test_baseline_vs_simulation_separation():
    """Ensure baseline data remains pure and is not mutated by simulated overrides."""
    base_locs = await get_all_locations_risk(force_refresh=True)
    dima_base = next(loc for loc in base_locs if loc["district"] == "Dima Hasao")
    base_prob = dima_base["probability"]
    base_rain = dima_base["rainfall_24h_mm"]

    # Run intense simulation (+150% rain, 95% soil)
    sim_res = await run_custom_what_if_simulation(rainfall_multiplier=2.5, soil_saturation_override=95.0)
    dima_sim = next(loc for loc in sim_res["projected_locations"] if loc["district"] == "Dima Hasao")

    # Simulation must reflect new inputs and risk
    assert dima_sim["rainfall_24h_mm"] > base_rain
    assert dima_sim["soil_moisture_pct"] == 95.0
    assert dima_sim["probability"] > 0.85

    # Re-fetch baseline and verify ZERO mutation
    base_locs_after = await get_all_locations_risk(force_refresh=True)
    dima_base_after = next(loc for loc in base_locs_after if loc["district"] == "Dima Hasao")
    assert dima_base_after["rainfall_24h_mm"] == base_rain
    assert dima_base_after["probability"] == base_prob

@pytest.mark.asyncio
async def test_feature_engineering_recalculation():
    """Verify that all derived/engineered features are recalculated correctly upon override."""
    base_slope = 35.0
    r1_a = 5.0
    r24_a = 30.0
    r72_a = 60.0
    sm_a = 50.0
    eff_sm_a = transform_soil_moisture_plateau(sm_a)
    ari_a, swi_a, gv_a, br_a = compute_engineered_features(base_slope, r1_a, r24_a, r72_a, eff_sm_a, 0.7, 0.4)

    # Simulated surge
    r1_b = 25.0
    r24_b = 100.0
    r72_b = 250.0
    sm_b = 85.0
    eff_sm_b = transform_soil_moisture_plateau(sm_b)
    ari_b, swi_b, gv_b, br_b = compute_engineered_features(base_slope, r1_b, r24_b, r72_b, eff_sm_b, 0.7, 0.4)

    # Derived values must genuinely reflect changes in inputs
    assert eff_sm_b > eff_sm_a
    assert swi_b > swi_a
    assert ari_b != ari_a
    assert br_b != br_a

@pytest.mark.asyncio
async def test_different_scenarios_produce_different_predictions():
    """Verify that low, moderate, high, and extreme scenarios produce dynamically different results."""
    res_low = await run_custom_what_if_simulation(rainfall_multiplier=0.5, soil_saturation_override=45.0)
    res_mod = await run_custom_what_if_simulation(rainfall_multiplier=1.0, soil_saturation_override=60.0)
    res_high = await run_custom_what_if_simulation(rainfall_multiplier=1.5, soil_saturation_override=75.0)
    res_ext = await run_custom_what_if_simulation(rainfall_multiplier=2.5, soil_saturation_override=95.0)

    dima_low = next(l for l in res_low["projected_locations"] if l["district"] == "Dima Hasao")
    dima_mod = next(l for l in res_mod["projected_locations"] if l["district"] == "Dima Hasao")
    dima_high = next(l for l in res_high["projected_locations"] if l["district"] == "Dima Hasao")
    dima_ext = next(l for l in res_ext["projected_locations"] if l["district"] == "Dima Hasao")

    assert dima_low["probability"] < dima_mod["probability"] < dima_high["probability"] < dima_ext["probability"]
    assert res_low["projected_critical_count"] <= res_mod["projected_critical_count"] <= res_high["projected_critical_count"] <= res_ext["projected_critical_count"]
    assert res_ext["projected_exposed_pop"] >= res_low["projected_exposed_pop"]

@pytest.mark.asyncio
async def test_batch_vs_single_inference_equivalence():
    """Verify that vectorized batch inference gives mathematically identical probabilities to single inference."""
    model = get_ml_model()
    if model is None:
        pytest.skip("Model not loaded")

    dima = next(d for d in DISTRICTS_CACHE if d["name"] == "Dima Hasao")
    override = {
        "source": "SIMULATION",
        "data_nature": "SIMULATION",
        "timestamp": "2026-09-06T12:00:00Z",
        "is_fallback": False,
        "temperature_c": 21.0,
        "humidity_pct": 98.0,
        "wind_speed_kmh": 20.0,
        "rainfall_1h_mm": 15.0,
        "rainfall_6h_mm": 45.0,
        "rainfall_24h_mm": 100.0,
        "rainfall_72h_mm": 220.0,
        "soil_moisture_pct": 82.0
    }

    # Single inference
    single_res = await calculate_location_risk(dima, sim_override=override)

    # Batch inference
    batch_res = await get_all_locations_risk(sim_districts={"Dima Hasao": override}, force_refresh=True)
    batch_dima = next(l for l in batch_res if l["district"] == "Dima Hasao")

    assert abs(single_res["probability"] - batch_dima["probability"]) < 1e-4

@pytest.mark.asyncio
async def test_cache_key_isolation():
    """Verify that distinct simulations with different parameter values do not collide in cache."""
    # Sim 1
    s1 = await run_custom_what_if_simulation(rainfall_multiplier=1.2, soil_saturation_override=65.0)
    dima_s1 = next(l for l in s1["projected_locations"] if l["district"] == "Dima Hasao")

    # Sim 2 (different params)
    s2 = await run_custom_what_if_simulation(rainfall_multiplier=2.0, soil_saturation_override=90.0)
    dima_s2 = next(l for l in s2["projected_locations"] if l["district"] == "Dima Hasao")

    assert dima_s1["probability"] != dima_s2["probability"]

@pytest.mark.asyncio
async def test_baseline_vs_simulated_deltas_present_and_consistent():
    """Verify that every simulated location includes baseline values and a mathematically consistent delta."""
    sim_res = await run_custom_what_if_simulation(rainfall_multiplier=1.8, soil_saturation_override=80.0)
    for loc in sim_res["projected_locations"]:
        assert "baseline_probability" in loc
        assert "baseline_risk" in loc
        assert "risk_delta_pct" in loc
        expected_delta = round((loc["probability"] - loc["baseline_probability"]) * 100, 1)
        assert abs(loc["risk_delta_pct"] - expected_delta) < 0.2

@pytest.mark.asyncio
async def test_reproducibility_identical_inputs():
    """Verify that identical simulation parameters produce identical predictions."""
    sim_a = await run_custom_what_if_simulation(rainfall_multiplier=1.4, soil_saturation_override=70.0)
    sim_b = await run_custom_what_if_simulation(rainfall_multiplier=1.4, soil_saturation_override=70.0)

    for loc_a, loc_b in zip(sim_a["projected_locations"], sim_b["projected_locations"]):
        assert loc_a["district"] == loc_b["district"]
        assert loc_a["probability"] == loc_b["probability"]

@pytest.mark.asyncio
async def test_scope_region_filter():
    """Verify that scoping the simulation to a specific state properly isolates the target region."""
    sim_assam = await run_custom_what_if_simulation(rainfall_multiplier=1.5, soil_saturation_override=75.0, target_state="Assam")
    for loc in sim_assam["projected_locations"]:
        assert loc["state"] == "Assam"
    assert len(sim_assam["projected_locations"]) > 0
    assert len(sim_assam["projected_locations"]) < len(DISTRICTS_CACHE)
