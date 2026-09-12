"""
Unit Tests for Risk Engine, Emergency Priority Scoring (EPS) & Alert Infrastructure
"""

import pytest
import os
from backend.services.risk_service import (
    classify_risk_level,
    compute_emergency_priority,
    calculate_location_risk
)
from backend.services.cv_service import assess_landslide_image
from backend.services.alert_service import alert_service
from backend.database import get_active_alerts, get_notification_dispatches

def test_risk_level_classification():
    assert classify_risk_level(0.85) == "CRITICAL"
    assert classify_risk_level(0.65) == "HIGH"
    assert classify_risk_level(0.45) == "WARNING"
    assert classify_risk_level(0.28) == "WATCH"
    assert classify_risk_level(0.10) == "LOW"

def test_emergency_priority_score_calculation():
    nearby_infra = [{"properties": {"criticality": "CRITICAL"}}]
    nearby_highways = [{"properties": {"vulnerability": "EXTREME"}}]
    
    # 1. Critical risk (88%) -> P1
    tier_p1, eps_p1, explanation_p1 = compute_emergency_priority(
        prob=0.88,
        pop=250000,
        nearby_infra=nearby_infra,
        nearby_highways=nearby_highways,
        slope=42.0
    )
    assert tier_p1 == "P1"
    assert eps_p1 >= 75.0
    assert "P1 Critical" in explanation_p1

    # 2. High risk (65%) -> P2
    tier_p2, eps_p2, explanation_p2 = compute_emergency_priority(
        prob=0.65,
        pop=150000,
        nearby_infra=nearby_infra,
        nearby_highways=nearby_highways,
        slope=35.0
    )
    assert tier_p2 == "P2"
    assert 58.0 <= eps_p2 < 75.0

    # 3. Warning risk (45%) -> P3
    tier_p3, eps_p3, explanation_p3 = compute_emergency_priority(
        prob=0.45,
        pop=100000,
        nearby_infra=[],
        nearby_highways=[],
        slope=28.0
    )
    assert tier_p3 == "P3"
    assert 40.0 <= eps_p3 < 58.0

    # 4. Watch risk (28%) -> P4
    tier_p4, eps_p4, explanation_p4 = compute_emergency_priority(
        prob=0.28,
        pop=50000,
        nearby_infra=[],
        nearby_highways=[],
        slope=20.0
    )
    assert tier_p4 == "P4"
    assert 22.0 <= eps_p4 < 40.0

    # 5. Low risk (8%) -> P5
    tier_p5, eps_p5, explanation_p5 = compute_emergency_priority(
        prob=0.08,
        pop=20000,
        nearby_infra=[],
        nearby_highways=[],
        slope=8.0
    )
    assert tier_p5 == "P5"
    assert eps_p5 < 22.0
    assert "P5 Routine" in explanation_p5

    # 6. Monotonicity & Non-Contradiction Verification:
    # A higher probability must never result in a lower-urgency priority tier.
    tier_order = {"P1": 1, "P2": 2, "P3": 3, "P4": 4, "P5": 5}
    prev_tier_val = 5
    for p in [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]:
        t, score, _ = compute_emergency_priority(p, 100000, nearby_infra, nearby_highways, 30.0)
        curr_tier_val = tier_order[t]
        assert curr_tier_val <= prev_tier_val, f"Contradiction at prob {p}: tier {t} is less urgent than previous"
        prev_tier_val = curr_tier_val

def test_cv_triage_fallback():
    # Non-existent file path
    res = assess_landslide_image("non_existent_file.jpg")
    assert res["hazard_detected"] is False
    assert "disclaimer" in res
    assert "AI-assisted preliminary assessment" in res["disclaimer"]

@pytest.mark.asyncio
async def test_alert_service_and_dispatch_audit():
    # Trigger an alert
    alert = await alert_service.trigger_alert(
        title="Test Landslide Warning",
        severity="WARNING",
        district="East Khasi Hills",
        state="Meghalaya",
        message="Simulated heavy rainfall alert for testing.",
        channels=["DASHBOARD", "EMAIL"],
        force=True
    )
    assert alert is not None
    assert alert["district"] == "East Khasi Hills"

    # Check alert stored in database
    active_alerts = get_active_alerts(limit=10)
    assert any(a["id"] == alert["id"] for a in active_alerts)

    # Check notification dispatches logged (DASHBOARD only, zero automatic emails)
    dispatches = get_notification_dispatches(alert_id=alert["id"])
    assert len(dispatches) >= 1
    assert any(d["channel"] == "DASHBOARD" for d in dispatches)
    assert not any(d["channel"] == "EMAIL" for d in dispatches)

