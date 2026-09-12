import pytest
import numpy as np
import joblib
from backend.services.risk_service import (
    calculate_location_risk, get_all_locations_risk, get_ml_model,
    predict_single_vector, DISTRICTS_CACHE, classify_risk_level,
    compute_emergency_priority
)
from ml.dataset import FEATURE_NAMES, transform_soil_moisture_plateau, compute_engineered_features
from ml.explainer import RiskExplainer

def test_canonical_feature_order():
    """Validates that the 16 features match the immutable canonical order."""
    expected_features = [
        "slope_deg",
        "aspect_cos",
        "aspect_sin",
        "elevation_m",
        "curvature",
        "rainfall_1h_mm",
        "rainfall_6h_mm",
        "rainfall_24h_mm",
        "rainfall_72h_mm",
        "soil_moisture_effective",
        "lithology_vulnerability",
        "veg_cover_protection",
        "antecedent_rainfall_ratio",
        "slope_wetness_index",
        "geotech_vulnerability",
        "rainfall_burst_ratio"
    ]
    assert FEATURE_NAMES == expected_features
    assert len(FEATURE_NAMES) == 16

def test_model_classes_order():
    """Ensures predict_proba output column index 1 corresponds to positive trigger."""
    model = get_ml_model()
    assert model is not None
    assert hasattr(model, "classes_")
    classes = list(model.classes_)
    assert classes == [0, 1]

@pytest.mark.asyncio
async def test_medium_risk_fixture():
    """
    Tests canonical medium-risk regional monsoon baseline fixtures:
    Aizawl (slope=43°, r1=5.8, r6=21.6, r24=48.0, r72=110.4, sm=64.0%, lith=0.5, veg=0.4) -> expected ~45%.
    East Khasi Hills (slope=37°, r1=8.2, r6=30.6, r24=68.0, r72=156.4, sm=72.0%, lith=0.5, veg=0.65) -> expected ~34%.
    """
    aizawl = {"name": "Aizawl", "lat": 23.73, "lon": 92.72, "state": "Mizoram", "base_slope": 43.0, "elev": 1132.0, "pop": 400000}
    sim_aizawl = {
        "source": "Live NWP & Meteorological Station Telemetry",
        "data_nature": "OBSERVED",
        "is_fallback": False,
        "temperature_c": 20.5, "humidity_pct": 83.0, "wind_speed_kmh": 10.0,
        "rainfall_1h_mm": 5.8, "rainfall_6h_mm": 21.6, "rainfall_24h_mm": 48.0,
        "rainfall_48h_mm": 84.0, "rainfall_72h_mm": 110.4, "soil_moisture_pct": 64.0,
        "forecast_rainfall": {"+6h": 20.5, "+12h": 41.0, "+24h": 52.8, "+48h": 86.4, "+72h": 115.2}
    }

    result = await calculate_location_risk(aizawl, sim_override=sim_aizawl)
    prob = result["probability"]

    assert 0.40 <= prob <= 0.55, f"Expected ~46% risk for Aizawl monsoon fixture, got {prob*100:.1f}%"
    assert result["current_risk"] in ["WARNING", "HIGH"]

@pytest.mark.asyncio
async def test_high_risk_fixture():
    """
    Tests extreme cloudburst trigger:
    Noney (slope=44°, r1=25.0, r6=70.0, r24=164.0, r72=360.0, sm=78.5%, lith=0.7, veg=0.4).
    Verifies high trigger risk (> 85%).
    """
    district = {"name": "Noney", "lat": 24.78, "lon": 93.60, "state": "Manipur", "base_slope": 44.0, "elev": 640.0, "pop": 45000}
    sim_weather = {
        "source": "Extreme Cloudburst",
        "data_nature": "OBSERVED",
        "is_fallback": False,
        "temperature_c": 21.0, "humidity_pct": 92.0, "wind_speed_kmh": 14.0,
        "rainfall_1h_mm": 25.0, "rainfall_6h_mm": 70.0, "rainfall_24h_mm": 164.0,
        "rainfall_48h_mm": 280.0, "rainfall_72h_mm": 360.0, "soil_moisture_pct": 78.5,
        "forecast_rainfall": {"+6h": 30.0, "+12h": 60.0, "+24h": 90.0, "+48h": 120.0, "+72h": 150.0}
    }

    result = await calculate_location_risk(district, sim_override=sim_weather)
    prob = result["probability"]
    assert prob >= 0.85, f"Expected >= 85% risk for extreme scenario, got {prob*100:.1f}%"
    assert result["current_risk"] == "CRITICAL"
    assert result["emergency_priority"] == "P1"

@pytest.mark.asyncio
async def test_low_risk_dry_fixture():
    """
    Tests dry baseline condition:
    Papum Pare (slope=25°, r1=0.0, r6=0.0, r24=0.5, r72=1.0, sm=22.0%).
    Verifies low risk (< 15%).
    """
    district = {"name": "Papum Pare", "lat": 27.12, "lon": 93.62, "state": "Arunachal Pradesh", "base_slope": 25.0, "elev": 450.0, "pop": 176000}
    sim_weather = {
        "source": "Dry Season",
        "data_nature": "OBSERVED",
        "is_fallback": False,
        "temperature_c": 24.0, "humidity_pct": 55.0, "wind_speed_kmh": 6.0,
        "rainfall_1h_mm": 0.0, "rainfall_6h_mm": 0.0, "rainfall_24h_mm": 0.5,
        "rainfall_48h_mm": 1.0, "rainfall_72h_mm": 1.0, "soil_moisture_pct": 22.0,
        "forecast_rainfall": {"+6h": 0.0, "+12h": 0.0, "+24h": 0.0, "+48h": 0.0, "+72h": 0.0}
    }

    result = await calculate_location_risk(district, sim_override=sim_weather)
    prob = result["probability"]
    assert prob <= 0.15, f"Expected <= 15% risk for dry scenario, got {prob*100:.1f}%"
    assert result["current_risk"] == "LOW"

@pytest.mark.asyncio
async def test_vectorization_numerical_parity_all_districts():
    """
    Enforces that batch vectorized prediction produces identical probabilities
    to single-sample prediction for all 38 districts across all 6 horizons.
    """
    all_batch = await get_all_locations_risk(force_refresh=True)
    assert len(all_batch) == len(DISTRICTS_CACHE)

    for i, dist in enumerate(DISTRICTS_CACHE):
        single = await calculate_location_risk(dist)
        batch = all_batch[i]

        assert single["district"] == batch["district"]
        assert abs(single["probability"] - batch["probability"]) < 1e-4, (
            f"Parity failure on {dist['name']}: single={single['probability']} vs batch={batch['probability']}"
        )
        assert single["current_risk"] == batch["current_risk"]
        assert single["emergency_priority"] == batch["emergency_priority"]

        # Verify all 6 horizons match
        assert len(single["forecast_timeline"]) == len(batch["forecast_timeline"])
        for h in range(len(single["forecast_timeline"])):
            h_single = single["forecast_timeline"][h]["probability"]
            h_batch = batch["forecast_timeline"][h]["probability"]
            assert abs(h_single - h_batch) < 1e-4, (
                f"Horizon {h} mismatch for {dist['name']}: single={h_single} vs batch={h_batch}"
            )

def test_explainer_does_not_mutate_inputs():
    """Verifies that RiskExplainer never mutates feature inputs."""
    exp = RiskExplainer()
    feat_dict = {
        "slope_deg": 36.0, "aspect_deg": 180, "elevation_m": 800, "curvature": 0.02,
        "rainfall_1h_mm": 20.0, "rainfall_6h_mm": 50.0, "rainfall_24h_mm": 120.0,
        "rainfall_72h_mm": 260.0, "soil_moisture_pct": 78.0, "lithology_vulnerability": 0.7,
        "veg_cover_protection": 0.4
    }
    feat_dict_copy = dict(feat_dict)
    res = exp.explain(feat_dict)

    assert feat_dict == feat_dict_copy
    assert "factors" in res
    assert len(res["factors"]) == 16
