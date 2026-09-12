import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import create_session_token
from backend.services.alert_service import alert_service
from backend.services.risk_service import get_all_locations_risk

client = TestClient(app)

@pytest.fixture
def admin_headers():
    token = create_session_token({
        "id": "USR-ADMIN-001",
        "email": "admin@rakshak.gov.in",
        "name": "System Administrator",
        "role": "ADMIN",
        "department": "National Disaster Authority"
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def citizen_headers():
    token = create_session_token({
        "id": "USR-CITIZEN-001",
        "email": "citizen@test.org",
        "name": "Citizen User",
        "role": "CITIZEN",
        "department": "Public"
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def authority_headers():
    token = create_session_token({
        "id": "USR-AUTH-001",
        "email": "officer@sdrf.gov.in",
        "name": "Duty Officer",
        "role": "AUTHORITY",
        "department": "SDRF First Battalion"
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def mock_brevo_send():
    with patch("backend.routers.admin.alert_service.brevo_email.send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = {
            "status": "SENT",
            "provider_reference": "<test-msg-123@brevo>",
            "message_id": "<test-msg-123@brevo>",
            "provider": "Brevo",
            "http_status": 201,
            "response": "Email accepted by Brevo REST API"
        }
        yield mock_send

@pytest.fixture
def mock_emergency_contacts():
    contacts = [
        {
            "id": "EC-001",
            "name": "Officer A",
            "role": "Disaster Management Officer",
            "agency": "DDMA",
            "email": "officer.a@example.com",
            "phone": "+919000000001",
            "level": "LEVEL_1",
            "is_enabled": True,
            "priority": 1
        },
        {
            "id": "EC-002",
            "name": "Officer B",
            "role": "Field Engineer",
            "agency": "PWD",
            "email": "officer.b@example.com",
            "phone": "+919000000002",
            "level": "LEVEL_1",
            "is_enabled": True,
            "priority": 2
        },
        {
            "id": "EC-003",
            "name": "Officer C",
            "role": "Medical Officer",
            "agency": "Health Dept",
            "email": "officer.c@example.com",
            "phone": "+919000000003",
            "level": "LEVEL_2",
            "is_enabled": True,
            "priority": 3
        },
        {
            "id": "EC-004",
            "name": "Officer D",
            "role": "SDMA Coordinator",
            "agency": "SDMA",
            "email": "officer.d@example.com",
            "phone": "+919000000004",
            "level": "LEVEL_3",
            "is_enabled": True,
            "priority": 4
        }
    ]
    with patch("backend.routers.admin.get_emergency_contact_by_id", side_effect=lambda cid: next((c for c in contacts if c["id"] == cid), None)):
        yield contacts

def test_send_test_email_single_selected_recipient(mock_brevo_send, mock_emergency_contacts, admin_headers):
    """
    Verify that selecting exactly 1 recipient with Admin credentials results in exactly 1 email sent,
    with zero automatic expansion to other contacts.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [
            {
                "email": "officer.a@example.com",
                "name": "Officer A",
                "contact_id": "EC-001",
                "role": "Disaster Management Officer"
            }
        ],
        "subject": "RAKSHAK Gateway Test"
    }

    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["recipient_count"] == 1
    assert data["dispatched_count"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["recipient_email"] == "officer.a@example.com"
    assert data["results"][0]["recipient_name"] == "Officer A"
    assert data["results"][0]["status"] == "SENT"

    # Verify Brevo provider was called EXACTLY once with this specific recipient
    assert mock_brevo_send.call_count == 1
    call_args, _ = mock_brevo_send.call_args
    assert call_args[0] == "officer.a@example.com"


def test_send_test_email_three_selected_recipients(mock_brevo_send, mock_emergency_contacts, admin_headers):
    """
    Verify that selecting exactly 3 recipients results in exactly 3 emails sent,
    matching each selected recipient one-to-one.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [
            {"email": "officer.a@example.com", "name": "Officer A", "contact_id": "EC-001"},
            {"email": "officer.b@example.com", "name": "Officer B", "contact_id": "EC-002"},
            {"email": "custom.specialist@example.com", "name": "External Specialist"}
        ],
        "subject": "RAKSHAK Multi-Recipient Test"
    }

    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["recipient_count"] == 3
    assert data["dispatched_count"] == 3
    assert len(data["results"]) == 3

    emails_dispatched = [r["recipient_email"] for r in data["results"]]
    assert emails_dispatched == [
        "officer.a@example.com",
        "officer.b@example.com",
        "custom.specialist@example.com"
    ]

    # Verify Brevo provider was called EXACTLY 3 times
    assert mock_brevo_send.call_count == 3


def test_send_test_email_unauthenticated_rejected(mock_brevo_send):
    """
    Verify unauthenticated call is rejected with 401 Unauthorized and sends 0 emails.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [{"email": "test@example.com"}]
    }
    response = client.post("/api/admin/notifications/test-email", json=payload)
    assert response.status_code == 401
    assert mock_brevo_send.call_count == 0


def test_send_test_email_citizen_denied(mock_brevo_send, citizen_headers):
    """
    Verify citizen attempt is rejected with 403 Forbidden and sends 0 emails.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [{"email": "test@example.com"}]
    }
    response = client.post("/api/admin/notifications/test-email", json=payload, headers=citizen_headers)
    assert response.status_code == 403
    assert mock_brevo_send.call_count == 0


def test_send_test_email_authority_denied(mock_brevo_send, authority_headers):
    """
    Verify authority attempt is rejected with 403 Forbidden and sends 0 emails.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [{"email": "test@example.com"}]
    }
    response = client.post("/api/admin/notifications/test-email", json=payload, headers=authority_headers)
    assert response.status_code == 403
    assert mock_brevo_send.call_count == 0


def test_send_test_email_missing_explicit_admin_action(mock_brevo_send, admin_headers):
    """
    Verify missing explicit_admin_action is rejected with 400 Bad Request.
    """
    payload = {
        "recipients": [{"email": "officer.a@example.com"}]
    }
    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 400
    assert "Explicit admin confirmation required" in response.json()["detail"]
    assert mock_brevo_send.call_count == 0


def test_send_test_email_empty_recipients_fails(mock_brevo_send, mock_emergency_contacts, admin_headers):
    """
    Verify that an empty recipient list is rejected with 400 Bad Request
    and sends ZERO emails.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": []
    }

    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 400
    data = response.json()
    assert "No recipients selected" in data["detail"]
    assert mock_brevo_send.call_count == 0


def test_send_test_email_invalid_email_format(mock_brevo_send, mock_emergency_contacts, admin_headers):
    """
    Verify invalid email format is caught and returns 400.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [
            {"email": "not-an-email", "name": "Invalid User"}
        ]
    }

    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 400
    data = response.json()
    assert "Invalid recipient email format" in data["detail"]
    assert mock_brevo_send.call_count == 0


@pytest.mark.asyncio
async def test_zero_automatic_email_on_sos_creation(mock_brevo_send):
    """
    Verify creating an SOS incident creates records & in-app alerts with ZERO emails.
    """
    from backend.routers.sos import trigger_sos
    from backend.models import SOSTriggerCreate

    payload = SOSTriggerCreate(
        latitude=25.5788,
        longitude=91.8933,
        accuracy_m=10.0,
        emergency_type="LANDSLIDE_DEBRIS",
        message="Test distress beacon",
        people_affected=2,
        district="East Khasi Hills",
        state="Meghalaya"
    )

    res = await trigger_sos(payload)
    assert res["status"] == "SOS_DISPATCHED"
    # Verify ZERO emails were dispatched
    assert mock_brevo_send.call_count == 0


@pytest.mark.asyncio
async def test_zero_automatic_email_on_risk_calculations(mock_brevo_send):
    """
    Verify calculating risks across all districts sends ZERO emails.
    """
    results = await get_all_locations_risk()
    assert len(results) > 0
    # Verify ZERO emails were dispatched
    assert mock_brevo_send.call_count == 0


def test_send_test_email_dynamic_top3_content(mock_brevo_send, mock_emergency_contacts, admin_headers):
    """
    Verify that manually triggered test email contains the dynamic Top 3 Most Risk-Prone Locations,
    relevant trigger factors, priority levels, and the Top 3 automated report.
    """
    payload = {
        "explicit_admin_action": True,
        "recipients": [
            {
                "email": "officer.a@example.com",
                "name": "Officer A",
                "contact_id": "EC-001"
            }
        ]
    }

    response = client.post("/api/admin/notifications/test-email", json=payload, headers=admin_headers)
    assert response.status_code == 200
    assert mock_brevo_send.call_count == 1

    call_email, call_payload = mock_brevo_send.call_args[0]
    assert call_email == "officer.a@example.com"
    message_text = call_payload["message"]

    # Verify Header and Structure
    assert "RAKSHAK — CURRENT RISK INTELLIGENCE SUMMARY" in message_text
    assert "The following locations currently show the highest predicted risk" in message_text
    assert "1. " in message_text
    assert "2. " in message_text
    assert "3. " in message_text
    assert "4. " not in message_text  # Exactly 3 locations

    # Verify metrics and trigger factors are present
    assert "Current Risk Probability:" in message_text
    assert "Risk/Priority Level:" in message_text
    assert "Relevant current trigger factors:" in message_text

    # Verify Top 3 Automated Report section
    assert "TOP 3 AUTOMATED REPORT" in message_text
    assert "- Current highest-risk location:" in message_text
    assert "- Highest current risk probability:" in message_text
    assert "- Difference between Top 1 and Top 2:" in message_text
    assert "- Current prediction telemetry:" in message_text
    assert "- Key model-derived risk driver:" in message_text


@pytest.mark.asyncio
async def test_dynamic_top3_ranking_changes():
    """
    Verify that changing prediction data dynamically changes the Top 3 locations in the generated message.
    """
    from backend.routers.admin import build_top_3_risk_snapshot_message

    # Test 1: Real-time risk snapshot
    msg1, top1_a, dist_a, state_a = await build_top_3_risk_snapshot_message()
    assert "RAKSHAK — CURRENT RISK INTELLIGENCE SUMMARY" in msg1
    assert "1. " in msg1
    assert "2. " in msg1
    assert "3. " in msg1

    # Test 2: Mock custom simulated data with distinct districts and verify rankings update dynamically
    mock_data = [
        {"district": "Custom Alpha", "state": "Assam", "failure_probability": 0.95, "failure_probability_pct": 95.0, "current_risk": "CRITICAL", "emergency_priority": "P1", "explanation_summary": "Intense cloudburst and steep scarp."},
        {"district": "Custom Beta", "state": "Manipur", "failure_probability": 0.91, "failure_probability_pct": 91.0, "current_risk": "CRITICAL", "emergency_priority": "P1", "explanation_summary": "High soil moisture and road excavation."},
        {"district": "Custom Gamma", "state": "Sikkim", "failure_probability": 0.88, "failure_probability_pct": 88.0, "current_risk": "HIGH", "emergency_priority": "P2", "explanation_summary": "Tectonic lineament and heavy rainfall."},
        {"district": "Custom Delta", "state": "Tripura", "failure_probability": 0.20, "failure_probability_pct": 20.0, "current_risk": "LOW", "emergency_priority": "P5", "explanation_summary": "Gentle plain."}
    ]

    with patch("backend.services.risk_service.get_all_locations_risk", new_callable=AsyncMock) as mock_get_risks:
        mock_get_risks.return_value = mock_data
        msg2, top1_b, dist_b, state_b = await build_top_3_risk_snapshot_message()

        assert "1. Custom Alpha, Assam" in msg2
        assert "95.0%" in msg2
        assert "2. Custom Beta, Manipur" in msg2
        assert "91.0%" in msg2
        assert "3. Custom Gamma, Sikkim" in msg2
        assert "88.0%" in msg2
        assert "Custom Delta" not in msg2
        assert "- Current highest-risk location: Custom Alpha, Assam (95.0%)" in msg2
        assert "- Difference between Top 1 and Top 2: +4.0%" in msg2


