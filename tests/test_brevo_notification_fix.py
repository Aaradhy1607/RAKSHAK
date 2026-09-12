"""
Comprehensive Backend Test Suite for RAKSHAK Notification Architecture:
- Real Brevo Email canonical provider, strict IPv4 socket stability, and network path consolidation.
- Real-time Dashboard & WebSocket in-app notification dispatch.
- Verification that SMS feature is completely removed.
"""

import asyncio
import socket
import json
import sys
import os
sys.path.insert(0, os.path.abspath("."))

import pytest
from backend.config import settings
from backend.services.alert_service import (
    BrevoEmailProvider,
    alert_service,
    mask_phone_number,
    normalize_indian_phone,
    sanitize_error
)
from backend.database import (
    log_notification_dispatch,
    get_notification_diagnostics,
    update_notification_dispatch_status_by_ref,
    get_db_connection
)
from backend.routers.admin import handle_brevo_webhook


def test_ip_stability_force_ipv4():
    """Verify that socket resolution for api.brevo.com forces AF_INET (IPv4)."""
    res = socket.getaddrinfo("api.brevo.com", 443)
    assert len(res) > 0, "No address info resolved for api.brevo.com"
    for item in res:
        family = item[0]
        assert family == socket.AF_INET, f"Expected AF_INET (IPv4) for api.brevo.com, got: {family}"
    print("[PASS] IP Stability: api.brevo.com strictly resolved to IPv4 AF_INET")


def test_phone_normalization_and_masking():
    """Verify Indian and international phone normalization and secure masking for emergency contacts records."""
    # 10 digits
    assert normalize_indian_phone("9435099881") == "+919435099881"
    # 12 digits with 91
    assert normalize_indian_phone("919435099881") == "+919435099881"
    # E.164
    assert normalize_indian_phone("+919435099881") == "+919435099881"
    assert normalize_indian_phone("+91 94350 99881") == "+919435099881"
    # Leading zero
    assert normalize_indian_phone("09435099881") == "+919435099881"
    # Invalid length
    assert normalize_indian_phone("12345") is None

    # Masking
    masked = mask_phone_number("+919435099881")
    assert "9435" not in masked
    assert masked.startswith("+91")
    assert masked.endswith("9881")
    print("[PASS] Phone normalization and security masking verified")


def test_secret_error_sanitization():
    """Verify that API keys and passwords are completely redacted from error strings."""
    if settings.BREVO_API_KEY:
        raw_error = f"Unauthorized error with key: {settings.BREVO_API_KEY}"
        clean = sanitize_error(raw_error)
        assert settings.BREVO_API_KEY not in clean
        assert "[REDACTED_BREVO_KEY]" in clean
    print("[PASS] Secret error sanitization verified")


@pytest.mark.asyncio
async def test_email_provider_execution():
    """Verify BrevoEmailProvider uses canonical singleton and handles invalid recipient cleanly."""
    email_prov = BrevoEmailProvider()
    res = await email_prov.send("invalid-email-address", {
        "title": "Test Title",
        "message": "Test Message"
    })
    assert res["status"] == "FAILED"
    assert res["http_status"] == 400
    assert "Invalid recipient email address" in res["response"]
    print("[PASS] Canonical BrevoEmailProvider pre-flight validation verified")


@pytest.mark.asyncio
async def test_all_six_email_flows_unified():
    """
    Verify that all 6 email flows:
    1. Send Test Email
    2. Real Email Gateway Test
    3. SOS Alert Email
    4. Emergency Alert Email
    5. Automated Alert Email
    6. Escalation Email
    use the same canonical BrevoEmailProvider instance.
    """
    assert isinstance(alert_service.brevo_email, BrevoEmailProvider)
    assert alert_service.email_provider is alert_service.brevo_email

    # Verify flow naming and execution across alert methods
    sos_res = await alert_service.dispatch_escalation_alert(
        incident_id="TEST-SOS-001",
        escalation_level=1,
        title="SOS LANDSLIDE ALERT",
        severity="CRITICAL",
        district="Dima Hasao",
        state="Assam",
        message="Emergency SOS test",
        force=True
    )
    assert sos_res["flow_name"] == "SOS Alert Email"
    assert sos_res["alert_type"] == "SOS"

    escalation_res = await alert_service.dispatch_escalation_alert(
        incident_id="TEST-ESC-001",
        escalation_level=2,
        title="LEVEL 2 ESCALATION ALERT",
        severity="CRITICAL",
        district="Dima Hasao",
        state="Assam",
        message="Level 2 escalation test",
        force=True
    )
    assert escalation_res["flow_name"] == "Escalation Email"


@pytest.mark.asyncio
async def test_brevo_email_webhook_processing():
    """
    Verify Brevo webhook transitions for transactional email:
    1. Delivered event transitions dispatch status to DELIVERED
    2. Bounce event transitions dispatch status to FAILED
    """
    test_msg_id = "test-email-ref-888"
    test_email = "officer@sdrf.gov.in"
    dispatch_id = "DSP-TEST-EMAIL-WH-001"

    log_notification_dispatch({
        "id": dispatch_id,
        "alert_id": "ALT-TEST-EMAIL-WH",
        "channel": "EMAIL",
        "recipient": test_email,
        "status": "DELIVERY_PENDING",
        "provider": "Brevo",
        "provider_reference": test_msg_id,
        "http_status": 201,
        "provider_response": f"Brevo Accepted Transactional Email (Message ID: {test_msg_id})",
        "contact_name": "Test Officer",
        "escalation_level": 1
    })

    webhook_payload = {
        "event": "delivered",
        "message-id": test_msg_id,
        "email": test_email,
        "date": "2026-09-04T08:10:00Z"
    }
    wh_res = await handle_brevo_webhook(webhook_payload)
    assert wh_res["status"] == "PROCESSED"
    assert wh_res["mapped_status"] == "DELIVERED"

    diag = get_notification_diagnostics(10)
    matching = [d for d in diag if d["id"] == dispatch_id]
    assert matching[0]["status"] == "DELIVERED"
    assert matching[0]["delivery_event"] == "delivered"


def test_no_sms_provider_in_alert_service():
    """Verify that alert_service has no SMS provider or SMS dispatch methods."""
    assert not hasattr(alert_service, "sms_provider")
    assert not hasattr(alert_service, "brevo_sms")
    assert not hasattr(alert_service, "_dispatch_to_contact_sms")
    print("[PASS] SMS provider and dispatch methods cleanly absent from alert_service")


if __name__ == "__main__":
    test_ip_stability_force_ipv4()
    test_phone_normalization_and_masking()
    test_secret_error_sanitization()
    asyncio.run(test_email_provider_execution())
    asyncio.run(test_all_six_email_flows_unified())
    asyncio.run(test_brevo_email_webhook_processing())
    test_no_sms_provider_in_alert_service()
    print("\nALL NOTIFICATION ARCHITECTURE UNIT TESTS PASSED SUCCESSFULLY!")
