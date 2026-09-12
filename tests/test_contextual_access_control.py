"""
Tests for RAKSHAK Contextual Access Control, Data Isolation, Ownership & PII Masking
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_citizen_report_ownership_and_pii_masking(client):
    # 1. Login as citizen
    res_cit = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    assert res_cit.status_code == 200
    cit_token = res_cit.json()["token"]

    # 2. Submit report as authenticated citizen
    report_res = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {cit_token}"},
        data={
            "category": "ROCKFALL",
            "description": "Boulders sliding on NH-54 near Jatinga",
            "latitude": "25.1234",
            "longitude": "92.9876",
            "accuracy_m": "8.5",
            "district": "Dima Hasao",
            "state": "Assam",
            "reporter_name": "Citizen Observer",
            "reporter_phone": "+91 9876543210"
        }
    )
    assert report_res.status_code == 200
    rep_id = report_res.json()["report"]["id"]

    # 3. Unauthenticated public view of reports should have masked phone number
    pub_res = client.get("/api/reports")
    assert pub_res.status_code == 200
    pub_reports = pub_res.json()
    matching_pub = next((r for r in pub_reports if r["id"] == rep_id), None)
    assert matching_pub is not None
    assert "***" in matching_pub["reporter_phone"]
    assert "9876543210" not in matching_pub["reporter_phone"]

    # 4. Authenticated citizen viewing their own reports via my_reports=true
    my_res = client.get(
        "/api/reports?my_reports=true",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert my_res.status_code == 200
    my_reports = my_res.json()
    matching_my = next((r for r in my_reports if r["id"] == rep_id), None)
    assert matching_my is not None

    # 5. Commander viewing the report sees unmasked phone for tactical coordination
    res_cmd = client.post("/api/auth/login", json={
        "email": "commander@sdrf.gov.in",
        "password": "Commander@SDRF2026"
    })
    cmd_token = res_cmd.json()["token"]

    cmd_res = client.get(
        "/api/reports",
        headers={"Authorization": f"Bearer {cmd_token}"}
    )
    assert cmd_res.status_code == 200
    matching_cmd = next((r for r in cmd_res.json() if r["id"] == rep_id), None)
    assert matching_cmd is not None
    assert matching_cmd["reporter_phone"] == "+91 9876543210"

def test_citizen_sos_ownership_and_isolation(client):
    # Login as citizen
    res_cit = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    cit_token = res_cit.json()["token"]

    # Trigger SOS beacon
    sos_res = client.post(
        "/api/sos",
        headers={"Authorization": f"Bearer {cit_token}"},
        json={
            "latitude": 25.18,
            "longitude": 93.02,
            "accuracy_m": 5.0,
            "district": "Dima Hasao",
            "state": "Assam",
            "emergency_type": "MUD_SLIDE_TRAPPED",
            "message": "Trapped in vehicle near Mahur village",
            "people_affected": 3,
            "contact_phone": "+91 9435012345"
        }
    )
    assert sos_res.status_code == 200
    sos_id = sos_res.json()["sos_incident"]["id"]

    # Citizen querying /api/sos gets their own beacons
    cit_list_res = client.get(
        "/api/sos",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert cit_list_res.status_code == 200
    assert any(s["id"] == sos_id for s in cit_list_res.json())

def test_admin_route_blocked_for_citizen_user(client):
    # Login as citizen
    res_cit = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    cit_token = res_cit.json()["token"]

    # Attempt to access admin contacts
    contacts_res = client.get(
        "/api/admin/contacts",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert contacts_res.status_code == 403
    assert "Access denied" in contacts_res.json()["detail"]

    # Attempt to access alert config
    cfg_res = client.get(
        "/api/admin/config",
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert cfg_res.status_code == 403

def test_authority_status_update_attribution(client):
    # Login as Commander
    res_cmd = client.post("/api/auth/login", json={
        "email": "commander@sdrf.gov.in",
        "password": "Commander@SDRF2026"
    })
    cmd_token = res_cmd.json()["token"]

    # Create a report
    rep_res = client.post(
        "/api/reports",
        data={
            "category": "DEBRIS_FLOW",
            "latitude": "25.15",
            "longitude": "93.01",
            "district": "Dima Hasao",
            "state": "Assam"
        }
    )
    rep_id = rep_res.json()["report"]["id"]

    # Authority updates report status
    update_res = client.patch(
        f"/api/reports/{rep_id}/status",
        headers={"Authorization": f"Bearer {cmd_token}"},
        data={
            "status": "VERIFIED",
            "notes": "Field unit dispatched and verified slope movement."
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["report"]["status"] == "VERIFIED"
