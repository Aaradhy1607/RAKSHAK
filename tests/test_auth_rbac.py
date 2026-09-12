"""
Tests for RAKSHAK Authentication & Role-Based Access Control (RBAC) System
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

def test_seeded_accounts_login(client):
    # Test Citizen login
    res = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["token"]
    assert data["user"]["role"] == "CITIZEN"
    assert data["user"]["email"] == "citizen@rakshak.org"

    # Test Authority (Commander) login
    res_cmd = client.post("/api/auth/login", json={
        "email": "commander@sdrf.gov.in",
        "password": "Commander@SDRF2026"
    })
    assert res_cmd.status_code == 200
    data_cmd = res_cmd.json()
    assert data_cmd["user"]["role"] == "AUTHORITY"
    assert "SDRF" in data_cmd["user"]["department"]

    # Test Admin login
    res_adm = client.post("/api/auth/login", json={
        "email": "admin@rakshak.gov.in",
        "password": "Admin@Rakshak2026"
    })
    assert res_adm.status_code == 200
    assert res_adm.json()["user"]["role"] == "ADMIN"

def test_invalid_login_credentials(client):
    res = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

    res_missing = client.post("/api/auth/login", json={
        "email": "nonexistent@rakshak.org",
        "password": "Password123"
    })
    assert res_missing.status_code == 401

def test_citizen_registration_flow(client):
    import time
    unique_email = f"citizen_{int(time.time()*1000)}@test.org"
    res = client.post("/api/auth/register", json={
        "name": "Arjun Sharma",
        "email": unique_email,
        "password": "SecurePassword@2026",
        "phone": "+91 9876543210"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["role"] == "CITIZEN"
    assert data["user"]["email"] == unique_email
    assert data["token"]

    # Test duplicate registration
    res_dup = client.post("/api/auth/register", json={
        "name": "Arjun Sharma 2",
        "email": unique_email,
        "password": "SecurePassword@2026"
    })
    assert res_dup.status_code == 400
    assert "already registered" in res_dup.json()["detail"]

def test_auth_me_endpoint(client):
    # Login as citizen
    res = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    token = res.json()["token"]

    # Verify /api/auth/me with valid token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "citizen@rakshak.org"
    assert me_res.json()["role"] == "CITIZEN"

    # Verify with invalid token
    invalid_res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert invalid_res.status_code == 401

def test_admin_provision_authority(client):
    # Login as Admin
    res_adm = client.post("/api/auth/login", json={
        "email": "admin@rakshak.gov.in",
        "password": "Admin@Rakshak2026"
    })
    admin_token = res_adm.json()["token"]

    import time
    officer_email = f"ndrf_officer_{int(time.time()*1000)}@ndrf.gov.in"
    prov_res = client.post(
        "/api/auth/admin/provision-authority",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Capt. Vikram Batra",
            "email": officer_email,
            "password": "Officer@NDRF2026",
            "role": "AUTHORITY",
            "department": "National Disaster Response Force (NDRF)",
            "jurisdiction": "Northern Command / Uttarakhand",
            "phone": "+91 9123456780"
        }
    )
    assert prov_res.status_code == 200, prov_res.text
    assert prov_res.json()["email"] == officer_email
    assert prov_res.json()["role"] == "AUTHORITY"

    # Now verify login for the provisioned officer
    login_res = client.post("/api/auth/login", json={
        "email": officer_email,
        "password": "Officer@NDRF2026"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["department"] == "National Disaster Response Force (NDRF)"

def test_rbac_admin_route_blocked_for_citizen(client):
    # Login as citizen
    res = client.post("/api/auth/login", json={
        "email": "citizen@rakshak.org",
        "password": "Citizen@Rakshak2026"
    })
    citizen_token = res.json()["token"]

    # Try to access admin directory
    users_res = client.get(
        "/api/auth/admin/users",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert users_res.status_code == 403
    assert "Access denied" in users_res.json()["detail"]
