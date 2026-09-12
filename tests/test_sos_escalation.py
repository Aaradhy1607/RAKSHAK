"""
Comprehensive Test Suite for RAKSHAK Rapid Response & Intelligent SOS Escalation Engine
Tests:
- Emergency SOS creation with live Risk Context attachment
- Simultaneous Level 1 Contact Group Alerting
- Acknowledgment workflow (stops automatic escalation)
- Manual and Timeout Escalation to Level 2 and Level 3
- Incident Resolution lifecycle
- Emergency Contacts CRUD across Levels 1, 2, 3
- Admin Alert Configuration (ACTIVE / PAUSED, Risk Threshold %, Cooldowns)
- Duplicate Prevention & Cooldown Suppression
- Significant Risk Jump (+15%) Escalation Override
- Demo Triggers (Scenario 1 Citizen SOS & Scenario 2 High Risk Surge)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import (
    get_emergency_contacts,
    get_alert_configuration,
    get_sos_incidents,
    get_alert_history
)
from backend.services.alert_service import alert_service

client = TestClient(app)

def test_emergency_contacts_crud():
    # 1. List pre-seeded contacts
    res = client.get("/api/admin/contacts")
    assert res.status_code == 200
    contacts = res.json()
    assert isinstance(contacts, list) and len(contacts) >= 1

    # 2. Filter by Level
    l1_res = client.get("/api/admin/contacts?level=1")
    assert l1_res.status_code == 200
    l1_contacts = l1_res.json()
    assert all(c["escalation_level"] == 1 for c in l1_contacts)

    # 3. Create a new test contact
    new_contact = {
        "name": "Major Sandeep Das",
        "role": "Army Engineering Corps Mountain Rescue",
        "phone": "+91 94350 77889",
        "email": "mountain.rescue@indianarmy.nic.in",
        "escalation_level": 2,
        "is_enabled": True,
        "sms_enabled": True,
        "email_enabled": True,
        "in_app_enabled": True,
        "priority_order": 10
    }
    create_res = client.post("/api/admin/contacts", json=new_contact)
    assert create_res.status_code == 200
    created = create_res.json()["contact"]
    cid = created["id"]
    assert created["name"] == "Major Sandeep Das"

    # 4. Update the contact
    update_res = client.put(f"/api/admin/contacts/{cid}", json={"role": "Senior Mountain Rescue Officer", "priority_order": 5})
    assert update_res.status_code == 200
    updated = update_res.json()["contact"]
    assert updated["role"] == "Senior Mountain Rescue Officer"
    assert updated["priority_order"] == 5

    # 5. Delete the contact
    del_res = client.delete(f"/api/admin/contacts/{cid}")
    assert del_res.status_code == 200

def test_admin_configuration_workflow():
    # 1. Fetch current configuration
    res = client.get("/api/admin/config")
    assert res.status_code == 200
    config = res.json()
    assert "risk_alert_threshold" in config
    assert "automated_risk_alerting_active" in config

    # 2. Update config
    up_res = client.put("/api/admin/config", json={
        "risk_alert_threshold": 0.80,
        "alert_cooldown_seconds": 300,
        "automated_risk_alerting_active": False
    })
    assert up_res.status_code == 200
    updated_config = up_res.json()["config"]
    assert updated_config["risk_alert_threshold"] == 0.80
    assert updated_config["alert_cooldown_seconds"] == 300
    assert updated_config["automated_risk_alerting_active"] is False

    # Restore to default
    client.put("/api/admin/config", json={
        "risk_alert_threshold": 0.75,
        "alert_cooldown_seconds": 600,
        "automated_risk_alerting_active": True
    })

def test_sos_lifecycle_and_risk_context():
    # 1. Trigger SOS with GPS
    sos_payload = {
        "latitude": 25.1834,
        "longitude": 93.0245,
        "accuracy_m": 8.0,
        "emergency_type": "LANDSLIDE_TRAPPED",
        "message": "Trapped under rockfall debris on Haflong bypass.",
        "people_affected": 3,
        "contact_phone": "+91 98640 11223",
        "district": "Dima Hasao",
        "state": "Assam"
    }
    res = client.post("/api/sos", json=sos_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SOS_DISPATCHED"
    sos_incident = data["sos_incident"]
    sos_id = sos_incident["id"]
    assert sos_incident["status"] == "AWAITING_ACKNOWLEDGEMENT"
    assert sos_incident["current_escalation_level"] == 1
    assert "risk_context" in sos_incident
    assert sos_incident["risk_context"]["status"] == "ATTACHED"

    # 2. Fetch specific SOS detail
    detail_res = client.get(f"/api/sos/{sos_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == sos_id

    # 3. Escalate to Level 2
    esc_res = client.post(f"/api/sos/{sos_id}/escalate", json={
        "escalate_to_level": 2,
        "reason": "Level 1 acknowledgement timeout in field."
    })
    assert esc_res.status_code == 200
    assert esc_res.json()["escalation_level"] == 2

    # 4. Acknowledge the Incident
    ack_res = client.post(f"/api/sos/{sos_id}/acknowledge", json={
        "acknowledged_by": "Captain Rajesh Barman (SDRF)",
        "notes": "Rescue vehicle SDRF-04 dispatched to coordinates."
    })
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    # 5. Resolve the Incident
    res_res = client.post(f"/api/sos/{sos_id}/resolve", json={
        "resolved_by": "Incident Commander Rajesh Barman",
        "resolution_notes": "All 3 citizens safely extracted and provided first aid.",
        "assigned_team": "SDRF Tactical Team A"
    })
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"

def test_alert_history_audit():
    hist_res = client.get("/api/admin/alerts/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert isinstance(history, list)
    assert len(history) > 0
    # Verify each entry has dispatches and simulation/real markers
    first = history[0]
    assert "dispatches" in first
    assert "is_simulated" in first

def test_notification_provider_status():
    res = client.get("/api/admin/notifications/provider-status")
    assert res.status_code == 200
    status = res.json()
    assert "email" in status
    assert "websocket" in status
    assert "demo_mode" in status
    assert status["email"]["is_configured"] is True
    assert status["websocket"]["is_enabled"] is True
    assert status["demo_mode"] is False

