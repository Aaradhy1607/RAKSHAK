"""
Unit & Integration Tests for Landslide Early Warning Backend API
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# Fast deterministic mock weather for test isolation
MOCK_WEATHER = {
    "source": "Open-Meteo Test Mock",
    "data_nature": "OBSERVED",
    "timestamp": "2026-09-02T12:00:00Z",
    "is_fallback": False,
    "temperature_c": 22.5,
    "humidity_pct": 82.0,
    "wind_speed_kmh": 10.0,
    "rainfall_1h_mm": 12.0,
    "rainfall_6h_mm": 35.0,
    "rainfall_24h_mm": 85.0,
    "rainfall_72h_mm": 160.0,
    "soil_moisture_pct": 72.0,
    "forecast_rainfall": {
        "+6h": 20.0,
        "+12h": 40.0,
        "+24h": 65.0,
        "+48h": 90.0,
        "+72h": 110.0
    }
}

@pytest.fixture(autouse=True)
def mock_external_weather():
    with patch("backend.services.risk_service.fetch_weather_telemetry", new_callable=AsyncMock) as m:
        m.return_value = MOCK_WEATHER
        yield m

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "Assam" in data["supported_states"]
    assert "Sikkim" in data["supported_states"]

def test_risk_overview():
    response = client.get("/api/risk/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_monitored_districts" in data
    assert data["total_monitored_districts"] > 0
    assert "active_critical_zones" in data
    assert "system_data_health" in data

def test_risk_locations_multi_horizon():
    # Test Current horizon
    resp_curr = client.get("/api/risk/locations?horizon=Current")
    assert resp_curr.status_code == 200
    data_curr = resp_curr.json()
    assert len(data_curr) > 0
    first = data_curr[0]
    assert "district" in first
    assert "current_risk" in first
    assert "probability" in first
    assert "emergency_priority" in first
    assert "primary_factors" in first

    # Test +24h horizon
    resp_24h = client.get("/api/risk/locations?horizon=%2B24h")
    assert resp_24h.status_code == 200
    data_24h = resp_24h.json()
    assert len(data_24h) > 0
    assert data_24h[0]["data_nature"] == "MODEL_PREDICTION"

def test_single_location_risk():
    response = client.get("/api/risk/location/Dima%20Hasao")
    assert response.status_code == 200
    data = response.json()
    assert data["district"] == "Dima Hasao"
    assert len(data["forecast_timeline"]) == 6
    assert data["forecast_timeline"][0]["horizon"] == "Current"
    assert data["forecast_timeline"][3]["horizon"] == "+24h"

def test_roads_api():
    response = client.get("/api/roads")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(hw["id"] == "NH-27" for hw in data)

def test_infrastructure_api():
    response = client.get("/api/infrastructure")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_citizen_report_submission_and_status():
    # Submit report
    resp = client.post("/api/reports", data={
        "category": "Slope Crack",
        "description": "Visible 10m road crack observed near NH-27 cut.",
        "latitude": 25.18,
        "longitude": 93.02,
        "district": "Dima Hasao",
        "state": "Assam",
        "reporter_name": "Field Volunteer",
        "reporter_phone": "+91 94350 12345"
    })
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "SUCCESS"
    report_id = res_data["report"]["id"]

    # Update status
    patch_resp = client.patch(f"/api/reports/{report_id}/status", data={
        "status": "VERIFIED",
        "notes": "Verified by DDMA geotechnical team on patrol."
    })
    assert patch_resp.status_code == 200
    assert patch_resp.json()["report"]["status"] == "VERIFIED"

def test_sos_lifecycle():
    # Trigger SOS
    sos_payload = {
        "latitude": 25.185,
        "longitude": 93.028,
        "district": "Dima Hasao",
        "state": "Assam",
        "emergency_type": "STRANDED_VEHICLE",
        "message": "Vehicle stuck in mud slip.",
        "people_affected": 4,
        "contact_phone": "+91 98640 12345"
    }
    resp = client.post("/api/sos", json=sos_payload)
    assert resp.status_code == 200
    sos_id = resp.json()["sos_incident"]["id"]
    assert resp.json()["sos_incident"]["priority"] == "P1"

    # Authority updates status to DISPATCHED
    update_resp = client.patch(f"/api/sos/{sos_id}/status", json={
        "status": "DISPATCHED",
        "assigned_team": "SDRF Tactical Unit 4",
        "notes": "Quick response team rolling out."
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["sos_incident"]["status"] == "DISPATCHED"

def test_analytics_api():
    response = client.get("/api/analytics/historical")
    assert response.status_code == 200
    data = response.json()
    assert data["total_verified_historical_incidents"] > 0

def test_ml_metrics_api():
    response = client.get("/api/analytics/ml/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "winning_model" in data
    assert "Random Forest" in data["winning_model"] or "Classifier" in data["winning_model"]

def test_data_health_api():
    response = client.get("/api/data-health")
    assert response.status_code == 200
    data = response.json()
    assert data["system_status"] == "OPERATIONAL"

def test_village_isolation_analysis_api():
    response = client.get("/api/roads/isolation-analysis")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(hw["highway_id"] == "NH-27" for hw in data)
    assert "cut_off_villages" in data[0]
    assert "isolated_population_est" in data[0]
    assert "lifeline_score" in data[0]

def test_report_clusters_api():
    response = client.get("/api/reports/clusters")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_model_transparency_api():
    response = client.get("/api/analytics/model-transparency")
    assert response.status_code == 200
    data = response.json()
    assert "current_model_version" in data
    assert "validation_strategy" in data
    assert "scientific_citations" in data

def test_cascading_impact_api():
    response = client.get("/api/analytics/cascading-impact")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "mitigation_interventions" in data

def test_what_if_simulation_api():
    payload = {
        "rainfall_multiplier": 1.4,
        "soil_saturation_override": 78.5,
        "blocked_highways": ["NH-27"]
    }
    response = client.post("/api/scenario/simulate-what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provenance"] == "SIMULATION"
    assert "projected_critical_count" in data
    assert len(data["projected_locations"]) > 0
    assert len(data["cascading_impact_chain"]) > 0
