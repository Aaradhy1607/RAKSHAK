"""
Database Layer for NER Landslide Early Warning System
Handles persistent normalized storage with automated schema migration.
"""

import sqlite3
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_PATH = "data/landslide_system.db"

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Citizen Reports Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citizen_reports (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        description TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy_m REAL DEFAULT 10.0,
        district TEXT,
        state TEXT,
        status TEXT DEFAULT 'NEW',
        image_url TEXT,
        ai_assessment_json TEXT,
        reporter_name TEXT,
        reporter_phone TEXT,
        is_synced_from_offline INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    # Automatic column additions for existing databases
    for col, col_def in [
        ("is_synced_from_offline", "INTEGER DEFAULT 0"),
        ("updated_at", "TEXT"),
        ("user_id", "TEXT"),
        ("reporter_email", "TEXT")
    ]:
        try:
            cursor.execute(f"ALTER TABLE citizen_reports ADD COLUMN {col} {col_def}")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_district ON citizen_reports(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_created ON citizen_reports(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_user_email ON citizen_reports(reporter_email)")

    # 2. SOS Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sos_incidents (
        id TEXT PRIMARY KEY,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy_m REAL DEFAULT 10.0,
        district TEXT,
        state TEXT,
        emergency_type TEXT DEFAULT 'LANDSLIDE_TRAPPED',
        message TEXT,
        people_affected INTEGER DEFAULT 1,
        contact_phone TEXT,
        status TEXT DEFAULT 'NEW',
        assigned_team TEXT,
        priority TEXT DEFAULT 'P1',
        is_synced_from_offline INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        timeline_json TEXT NOT NULL,
        risk_context_json TEXT,
        current_escalation_level INTEGER DEFAULT 1,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        acknowledgement_notes TEXT,
        map_link TEXT,
        hazard_category TEXT,
        user_id TEXT,
        reporter_email TEXT
    )
    """)
    for col, col_def in [
        ("is_synced_from_offline", "INTEGER DEFAULT 0"),
        ("updated_at", "TEXT"),
        ("risk_context_json", "TEXT"),
        ("current_escalation_level", "INTEGER DEFAULT 1"),
        ("acknowledged_at", "TEXT"),
        ("acknowledged_by", "TEXT"),
        ("acknowledgement_notes", "TEXT"),
        ("map_link", "TEXT"),
        ("hazard_category", "TEXT"),
        ("user_id", "TEXT"),
        ("reporter_email", "TEXT")
    ]:
        try:
            cursor.execute(f"ALTER TABLE sos_incidents ADD COLUMN {col} {col_def}")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sos_district ON sos_incidents(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_incidents(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sos_priority ON sos_incidents(priority)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sos_user_email ON sos_incidents(reporter_email)")

    # 3. System Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        message TEXT NOT NULL,
        channels TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        alert_type TEXT DEFAULT 'RISK',
        incident_id TEXT,
        is_simulated INTEGER DEFAULT 1
    )
    """)
    for col, col_def in [
        ("alert_type", "TEXT DEFAULT 'RISK'"),
        ("incident_id", "TEXT"),
        ("is_simulated", "INTEGER DEFAULT 1")
    ]:
        try:
            cursor.execute(f"ALTER TABLE alerts ADD COLUMN {col} {col_def}")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_district ON alerts(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active)")

    # 4. Notification Dispatches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notification_dispatches (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL,
        provider_response TEXT,
        attempted_at TEXT NOT NULL,
        completed_at TEXT,
        is_simulated INTEGER DEFAULT 1,
        error_message TEXT,
        contact_id TEXT,
        contact_name TEXT,
        contact_role TEXT,
        escalation_level INTEGER DEFAULT 1,
        provider TEXT DEFAULT 'Brevo',
        provider_reference TEXT,
        http_status INTEGER,
        delivery_event TEXT,
        delivery_event_at TEXT,
        normalized_recipient TEXT,
        rejection_reason TEXT,
        error_code TEXT
    )
    """)
    for col, col_def in [
        ("is_simulated", "INTEGER DEFAULT 1"),
        ("error_message", "TEXT"),
        ("contact_id", "TEXT"),
        ("contact_name", "TEXT"),
        ("contact_role", "TEXT"),
        ("escalation_level", "INTEGER DEFAULT 1"),
        ("provider", "TEXT DEFAULT 'Brevo'"),
        ("provider_reference", "TEXT"),
        ("http_status", "INTEGER"),
        ("delivery_event", "TEXT"),
        ("delivery_event_at", "TEXT"),
        ("normalized_recipient", "TEXT"),
        ("rejection_reason", "TEXT"),
        ("error_code", "TEXT")
    ]:
        try:
            cursor.execute(f"ALTER TABLE notification_dispatches ADD COLUMN {col} {col_def}")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dispatches_alert ON notification_dispatches(alert_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dispatches_ref ON notification_dispatches(provider_reference)")

    # 5. Emergency Contacts Table (Unlimited Multi-Level Contacts)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emergency_contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        escalation_level INTEGER NOT NULL DEFAULT 1,
        is_enabled INTEGER DEFAULT 1,
        sms_enabled INTEGER DEFAULT 1,
        email_enabled INTEGER DEFAULT 1,
        in_app_enabled INTEGER DEFAULT 1,
        priority_order INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contacts_level ON emergency_contacts(escalation_level)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contacts_enabled ON emergency_contacts(is_enabled)")

    # Pre-seed official emergency contacts if empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM emergency_contacts")
    if cursor.fetchone()[0] == 0:
        seed_contacts = [
            # Level 1: Primary Tactical Response Team
            ("CNT-L1-001", "Inspector Rajesh Barman", "SDRF Tactical Unit Commander", "+91 94350 12345", "sdrf.dima.hasao@assam.gov.in", 1, 1, 1, 1, 1, 1),
            ("CNT-L1-002", "Dr. Ananya Roy", "DDMA Duty Incident Officer", "+91 98640 54321", "ddma.control@dimahasao.gov.in", 1, 1, 1, 1, 1, 2),
            ("CNT-L1-003", "Er. Prabal Das", "PWD Highway Rapid Clearance Unit", "+91 94351 98765", "pwd.roads.ner@nic.in", 1, 1, 1, 1, 1, 3),
            # Level 2: Secondary Response & Medical/Logistics
            ("CNT-L2-001", "Commandant Manoj Sharma", "NDRF 1st Bn Emergency Ops Liaison", "+91 94190 22334", "ops.1bn-ndrf@gov.in", 2, 1, 1, 1, 1, 1),
            ("CNT-L2-002", "Dr. Subir Sen", "District Civil Hospital Emergency Superintendent", "+91 98540 66778", "emergency.haflongch@assam.gov.in", 2, 1, 1, 1, 1, 2),
            ("CNT-L2-003", "Superintendent of Police", "District Police Control Room", "+91 94350 99887", "sp-dimahasao@assampolice.gov.in", 2, 1, 1, 1, 1, 3),
            # Level 3: Higher Authority & State Command
            ("CNT-L3-001", "Deputy Commissioner / DM", "District Disaster Management Authority Chairman", "+91 94350 00112", "dc-dimahasao@nic.in", 3, 1, 1, 1, 1, 1),
            ("CNT-L3-002", "Chief Executive Officer", "Assam State Disaster Management Authority (ASDMA)", "+91 94351 11223", "ceo-asdma@assam.gov.in", 3, 1, 1, 1, 1, 2),
            ("CNT-L3-003", "Director General", "North Eastern Space Applications Centre / MDoNER", "+91 94361 33445", "director@nesac.gov.in", 3, 1, 1, 1, 1, 3)
        ]
        now_ts = datetime.now(timezone.utc).isoformat()
        for cid, name, role, phone, email, lvl, en, sms_en, em_en, app_en, prio in seed_contacts:
            cursor.execute("""
            INSERT INTO emergency_contacts (id, name, role, phone, email, escalation_level, is_enabled, sms_enabled, email_enabled, in_app_enabled, priority_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cid, name, role, phone, email, lvl, en, sms_en, em_en, app_en, prio, now_ts, now_ts))

    # 6. Admin Alert Configuration Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alert_configurations (
        id TEXT PRIMARY KEY,
        automated_risk_alerting_active INTEGER DEFAULT 1,
        risk_alert_threshold REAL DEFAULT 0.75,
        alert_cooldown_seconds INTEGER DEFAULT 600,
        escalation_timeout_seconds INTEGER DEFAULT 120,
        max_escalation_level INTEGER DEFAULT 3,
        significant_risk_escalation_delta REAL DEFAULT 0.15,
        demo_mode_enabled INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("SELECT COUNT(*) AS cnt FROM alert_configurations WHERE id = 'GLOBAL_CONFIG'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO alert_configurations (id, automated_risk_alerting_active, risk_alert_threshold, alert_cooldown_seconds, escalation_timeout_seconds, max_escalation_level, significant_risk_escalation_delta, demo_mode_enabled, updated_at)
        VALUES ('GLOBAL_CONFIG', 1, 0.75, 600, 120, 3, 0.15, 1, ?)
        """, (datetime.now(timezone.utc).isoformat(),))

    # 7. Escalation Events Audit Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS escalation_events (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        from_level INTEGER NOT NULL,
        to_level INTEGER NOT NULL,
        triggered_at TEXT NOT NULL,
        reason TEXT NOT NULL,
        actor TEXT NOT NULL,
        notification_summary TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_escalation_incident ON escalation_events(incident_id)")

    # 8. Road Disruptions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_disruptions (
        id TEXT PRIMARY KEY,
        highway_id TEXT NOT NULL,
        highway_name TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        status TEXT NOT NULL,
        cause TEXT,
        reported_at TEXT NOT NULL,
        resolved_at TEXT
    )
    """)

    # 9. Audit Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        details_json TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)")

    # 10. Users & Role-Based Access Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CITIZEN',
        department TEXT,
        jurisdiction TEXT,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_login_at TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")

    # Auto-seed Default Administrative & Authority Accounts if not present
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    user_count = cursor.fetchone()["cnt"]
    if user_count == 0:
        from backend.services.auth_service import hash_password, generate_salt
        now_ts = datetime.now(timezone.utc).isoformat()
        
        default_seed_users = [
            (
                "USR-ADMIN-001",
                "National Emergency Administrator",
                "admin@rakshak.gov.in",
                "Admin@Rakshak2026",
                "ADMIN",
                "NDMA Apex Command Directorate",
                "North-Eastern Region (NER)",
                "+91 94350 00001"
            ),
            (
                "USR-AUTH-001",
                "Insp. R. Bora (SDRF Lead)",
                "commander@sdrf.gov.in",
                "Commander@SDRF2026",
                "AUTHORITY",
                "State Disaster Response Force (SDRF Unit 04)",
                "Assam & Dima Hasao Sector",
                "+91 94350 99881"
            ),
            (
                "USR-AUTH-002",
                "Field Disaster Officer (DDMA)",
                "officer@ddma.gov.in",
                "Officer@DDMA2026",
                "AUTHORITY",
                "District Disaster Management Authority",
                "Haflong & Jatinga Corridor",
                "+91 94350 11223"
            ),
            (
                "USR-CIT-001",
                "Citizen Demo User",
                "citizen@rakshak.org",
                "Citizen@Rakshak2026",
                "CITIZEN",
                "General Public",
                "Dima Hasao Resident",
                "+91 94350 55667"
            )
        ]

        for uid, uname, uemail, upass, urole, udept, ujuris, uphone in default_seed_users:
            salt = generate_salt(16)
            pwd_hash = hash_password(upass, salt)
            cursor.execute("""
            INSERT OR IGNORE INTO users (
                id, name, email, password_hash, salt, role, department, jurisdiction, phone, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (uid, uname, uemail.lower().strip(), pwd_hash, salt, urole, udept, ujuris, uphone, now_ts))

    conn.commit()
    conn.close()

init_db()

def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()

# --- Citizen Reports Operations ---

def insert_citizen_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = utcnow_str()
    created_at = report_data.get("created_at", now_str)
    
    cursor.execute("""
    INSERT OR REPLACE INTO citizen_reports (
        id, category, description, latitude, longitude, accuracy_m,
        district, state, status, image_url, ai_assessment_json,
        reporter_name, reporter_phone, is_synced_from_offline, created_at, updated_at,
        user_id, reporter_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_data["id"],
        report_data["category"],
        report_data.get("description", ""),
        report_data["latitude"],
        report_data["longitude"],
        report_data.get("accuracy_m", 10.0),
        report_data.get("district", ""),
        report_data.get("state", ""),
        report_data.get("status", "NEW"),
        report_data.get("image_url"),
        json.dumps(report_data.get("ai_assessment", {})),
        report_data.get("reporter_name", "Anonymous Citizen"),
        report_data.get("reporter_phone", ""),
        1 if report_data.get("is_synced_from_offline") else 0,
        created_at,
        now_str,
        report_data.get("user_id"),
        report_data.get("reporter_email")
    ))
    
    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        now_str,
        "CREATE_CITIZEN_REPORT",
        "CITIZEN_REPORT",
        report_data["id"],
        report_data.get("reporter_name", "Citizen"),
        json.dumps({"district": report_data.get("district"), "category": report_data["category"]})
    ))

    conn.commit()
    conn.close()
    return report_data

def get_citizen_reports(
    limit: int = 100,
    district: Optional[str] = None,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM citizen_reports"
    params = []
    conditions = []
    
    if user_email:
        conditions.append("(reporter_email = ? OR reporter_phone = ?)")
        params.extend([user_email.lower().strip(), user_email])
    elif user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
        
    if district:
        conditions.append("district = ?")
        params.append(district)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["ai_assessment"] = json.loads(d["ai_assessment_json"]) if d["ai_assessment_json"] else None
        del d["ai_assessment_json"]
        results.append(d)
    conn.close()
    return results

def update_citizen_report_status(report_id: str, new_status: str, verified_by: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM citizen_reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    now_str = utcnow_str()
    cursor.execute("""
    UPDATE citizen_reports
    SET status = ?, updated_at = ?
    WHERE id = ?
    """, (new_status, now_str, report_id))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, f"UPDATE_REPORT_STATUS_{new_status}", "CITIZEN_REPORT", report_id, verified_by, json.dumps({"notes": notes})))

    conn.commit()
    conn.close()
    
    d = dict(row)
    d["status"] = new_status
    d["ai_assessment"] = json.loads(d["ai_assessment_json"]) if d["ai_assessment_json"] else None
    del d["ai_assessment_json"]
    return d

# --- SOS Incidents Operations ---

def insert_sos_incident(sos_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = utcnow_str()
    created_at = sos_data.get("created_at", now_str)
    timeline = sos_data.get("timeline", [])
    if not timeline:
        timeline = [{
            "timestamp": created_at,
            "status": sos_data.get("status", "NEW"),
            "assigned_team": sos_data.get("assigned_team"),
            "note": "Emergency SOS beacon triggered by citizen.",
            "updated_by": "Citizen Mobile Device"
        }]

    risk_ctx = sos_data.get("risk_context")
    risk_ctx_json = json.dumps(risk_ctx) if risk_ctx else None

    cursor.execute("""
    INSERT OR REPLACE INTO sos_incidents (
        id, latitude, longitude, accuracy_m, district, state,
        emergency_type, message, people_affected, contact_phone,
        status, assigned_team, priority, is_synced_from_offline, created_at, updated_at,
        timeline_json, risk_context_json, current_escalation_level,
        acknowledged_at, acknowledged_by, acknowledgement_notes, map_link, hazard_category,
        user_id, reporter_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sos_data["id"],
        sos_data["latitude"],
        sos_data["longitude"],
        sos_data.get("accuracy_m", 10.0),
        sos_data.get("district", ""),
        sos_data.get("state", ""),
        sos_data.get("emergency_type", "LANDSLIDE_TRAPPED"),
        sos_data.get("message", ""),
        sos_data.get("people_affected", 1),
        sos_data.get("contact_phone", ""),
        sos_data.get("status", "NEW"),
        sos_data.get("assigned_team", None),
        sos_data.get("priority", "P1"),
        1 if sos_data.get("is_synced_from_offline") else 0,
        created_at,
        now_str,
        json.dumps(timeline),
        risk_ctx_json,
        sos_data.get("current_escalation_level", 1),
        sos_data.get("acknowledged_at"),
        sos_data.get("acknowledged_by"),
        sos_data.get("acknowledgement_notes"),
        sos_data.get("map_link"),
        sos_data.get("hazard_category", "LANDSLIDE"),
        sos_data.get("user_id"),
        sos_data.get("reporter_email")
    ))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        now_str,
        "TRIGGER_SOS_INCIDENT",
        "SOS_INCIDENT",
        sos_data["id"],
        sos_data.get("contact_phone", "Citizen"),
        json.dumps({
            "district": sos_data.get("district"),
            "people": sos_data.get("people_affected"),
            "escalation_level": sos_data.get("current_escalation_level", 1)
        })
    ))

    conn.commit()
    conn.close()
    sos_data["timeline"] = timeline
    sos_data["risk_context"] = risk_ctx
    return sos_data

def get_sos_incidents(
    limit: int = 100,
    district: Optional[str] = None,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM sos_incidents"
    params = []
    conditions = []
    
    if user_email:
        conditions.append("(reporter_email = ? OR contact_phone = ?)")
        params.extend([user_email.lower().strip(), user_email])
    elif user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
        
    if district:
        conditions.append("district = ?")
        params.append(district)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["timeline"] = json.loads(d["timeline_json"]) if d.get("timeline_json") else []
        d["risk_context"] = json.loads(d["risk_context_json"]) if d.get("risk_context_json") else None
        d.pop("timeline_json", None)
        d.pop("risk_context_json", None)
        results.append(d)
    conn.close()
    return results

def get_sos_incident_by_id(sos_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_incidents WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    d["timeline"] = json.loads(d["timeline_json"]) if d.get("timeline_json") else []
    d["risk_context"] = json.loads(d["risk_context_json"]) if d.get("risk_context_json") else None
    d.pop("timeline_json", None)
    d.pop("risk_context_json", None)
    conn.close()
    return d

def update_sos_status(sos_id: str, new_status: str, assigned_team: Optional[str], note: Optional[str], updated_by: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_incidents WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    timeline = json.loads(current["timeline_json"]) if current.get("timeline_json") else []
    now_str = utcnow_str()

    timeline.append({
        "timestamp": now_str,
        "status": new_status,
        "assigned_team": assigned_team or current.get("assigned_team"),
        "note": note or f"Status transitioned to {new_status}",
        "updated_by": updated_by
    })

    cursor.execute("""
    UPDATE sos_incidents
    SET status = ?, assigned_team = COALESCE(?, assigned_team), updated_at = ?, timeline_json = ?
    WHERE id = ?
    """, (new_status, assigned_team, now_str, json.dumps(timeline), sos_id))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, f"SOS_STATUS_UPDATE_{new_status}", "SOS_INCIDENT", sos_id, updated_by, json.dumps({"note": note, "team": assigned_team})))

    conn.commit()
    conn.close()

    current["status"] = new_status
    if assigned_team:
        current["assigned_team"] = assigned_team
    current["timeline"] = timeline
    current["risk_context"] = json.loads(current["risk_context_json"]) if current.get("risk_context_json") else None
    current.pop("timeline_json", None)
    current.pop("risk_context_json", None)
    return current

def acknowledge_sos_incident(sos_id: str, acknowledged_by: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_incidents WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    timeline = json.loads(current["timeline_json"]) if current.get("timeline_json") else []
    now_str = utcnow_str()
    new_status = "ACKNOWLEDGED"

    timeline.append({
        "timestamp": now_str,
        "status": new_status,
        "assigned_team": current.get("assigned_team") or "Disaster Response Unit",
        "note": notes or f"Incident acknowledged by {acknowledged_by}. Response in progress.",
        "updated_by": acknowledged_by
    })

    cursor.execute("""
    UPDATE sos_incidents
    SET status = ?, acknowledged_at = ?, acknowledged_by = ?, acknowledgement_notes = ?, updated_at = ?, timeline_json = ?
    WHERE id = ?
    """, (new_status, now_str, acknowledged_by, notes or "Acknowledged", now_str, json.dumps(timeline), sos_id))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "ACKNOWLEDGE_SOS_INCIDENT", "SOS_INCIDENT", sos_id, acknowledged_by, json.dumps({"notes": notes})))

    conn.commit()
    conn.close()

    current["status"] = new_status
    current["acknowledged_at"] = now_str
    current["acknowledged_by"] = acknowledged_by
    current["acknowledgement_notes"] = notes or "Acknowledged"
    current["timeline"] = timeline
    current["risk_context"] = json.loads(current["risk_context_json"]) if current.get("risk_context_json") else None
    current.pop("timeline_json", None)
    current.pop("risk_context_json", None)
    return current

def escalate_sos_incident(sos_id: str, to_level: int, reason: str, actor: str = "Escalation Engine", notification_summary: str = "") -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_incidents WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    from_level = current.get("current_escalation_level") or 1
    timeline = json.loads(current["timeline_json"]) if current.get("timeline_json") else []
    now_str = utcnow_str()
    new_status = "ESCALATED"

    timeline.append({
        "timestamp": now_str,
        "status": new_status,
        "assigned_team": current.get("assigned_team"),
        "note": f"Escalated from Level {from_level} to Level {to_level}. Reason: {reason}",
        "updated_by": actor
    })

    cursor.execute("""
    UPDATE sos_incidents
    SET status = ?, current_escalation_level = ?, updated_at = ?, timeline_json = ?
    WHERE id = ?
    """, (new_status, to_level, now_str, json.dumps(timeline), sos_id))

    # Record escalation event
    ev_id = f"ESC-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    cursor.execute("""
    INSERT INTO escalation_events (id, incident_id, from_level, to_level, triggered_at, reason, actor, notification_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (ev_id, sos_id, from_level, to_level, now_str, reason, actor, notification_summary))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, f"ESCALATE_SOS_TO_L{to_level}", "SOS_INCIDENT", sos_id, actor, json.dumps({"reason": reason, "from_level": from_level, "to_level": to_level})))

    conn.commit()
    conn.close()

    current["status"] = new_status
    current["current_escalation_level"] = to_level
    current["timeline"] = timeline
    current["risk_context"] = json.loads(current["risk_context_json"]) if current.get("risk_context_json") else None
    current.pop("timeline_json", None)
    current.pop("risk_context_json", None)
    return current

def resolve_sos_incident(sos_id: str, resolved_by: str, resolution_notes: str, assigned_team: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_incidents WHERE id = ?", (sos_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    timeline = json.loads(current["timeline_json"]) if current.get("timeline_json") else []
    now_str = utcnow_str()
    new_status = "RESOLVED"

    timeline.append({
        "timestamp": now_str,
        "status": new_status,
        "assigned_team": assigned_team or current.get("assigned_team") or "Disaster Response Unit",
        "note": f"Incident successfully resolved by {resolved_by}. Resolution: {resolution_notes}",
        "updated_by": resolved_by
    })

    cursor.execute("""
    UPDATE sos_incidents
    SET status = ?, assigned_team = COALESCE(?, assigned_team), updated_at = ?, timeline_json = ?
    WHERE id = ?
    """, (new_status, assigned_team, now_str, json.dumps(timeline), sos_id))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "RESOLVE_SOS_INCIDENT", "SOS_INCIDENT", sos_id, resolved_by, json.dumps({"notes": resolution_notes, "team": assigned_team})))

    conn.commit()
    conn.close()

    current["status"] = new_status
    if assigned_team:
        current["assigned_team"] = assigned_team
    current["timeline"] = timeline
    current["risk_context"] = json.loads(current["risk_context_json"]) if current.get("risk_context_json") else None
    current.pop("timeline_json", None)
    current.pop("risk_context_json", None)
    return current

# --- Emergency Contacts CRUD ---

def get_emergency_contacts(level: Optional[int] = None, is_enabled_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM emergency_contacts WHERE 1=1"
    params = []
    if level is not None:
        query += " AND escalation_level = ?"
        params.append(level)
    if is_enabled_only:
        query += " AND is_enabled = 1"
    query += " ORDER BY escalation_level ASC, priority_order ASC, name ASC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["is_enabled"] = bool(d["is_enabled"])
        d["sms_enabled"] = bool(d["sms_enabled"])
        d["email_enabled"] = bool(d["email_enabled"])
        d["in_app_enabled"] = bool(d["in_app_enabled"])
        results.append(d)
    conn.close()
    return results

def get_emergency_contact_by_id(contact_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    d["is_enabled"] = bool(d["is_enabled"])
    d["sms_enabled"] = bool(d["sms_enabled"])
    d["email_enabled"] = bool(d["email_enabled"])
    d["in_app_enabled"] = bool(d["in_app_enabled"])
    conn.close()
    return d

def insert_emergency_contact(contact_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cid = contact_data.get("id") or f"CNT-L{contact_data.get('escalation_level', 1)}-{uuid.uuid4().hex[:6].upper()}"
    now_str = utcnow_str()

    cursor.execute("""
    INSERT INTO emergency_contacts (id, name, role, phone, email, escalation_level, is_enabled, sms_enabled, email_enabled, in_app_enabled, priority_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        cid,
        contact_data["name"],
        contact_data["role"],
        contact_data["phone"],
        contact_data["email"],
        contact_data.get("escalation_level", 1),
        1 if contact_data.get("is_enabled", True) else 0,
        1 if contact_data.get("sms_enabled", True) else 0,
        1 if contact_data.get("email_enabled", True) else 0,
        1 if contact_data.get("in_app_enabled", True) else 0,
        contact_data.get("priority_order", 1),
        now_str,
        now_str
    ))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "CREATE_EMERGENCY_CONTACT", "EMERGENCY_CONTACT", cid, "Admin", json.dumps({"name": contact_data["name"], "role": contact_data["role"]})))

    conn.commit()
    conn.close()
    contact_data["id"] = cid
    contact_data["created_at"] = now_str
    contact_data["updated_at"] = now_str
    return contact_data

def update_emergency_contact(contact_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    now_str = utcnow_str()

    name = updates.get("name", current["name"])
    role = updates.get("role", current["role"])
    phone = updates.get("phone", current["phone"])
    email = updates.get("email", current["email"])
    lvl = updates.get("escalation_level", current["escalation_level"])
    is_en = 1 if updates.get("is_enabled", current["is_enabled"]) else 0
    sms_en = 1 if updates.get("sms_enabled", current["sms_enabled"]) else 0
    em_en = 1 if updates.get("email_enabled", current["email_enabled"]) else 0
    app_en = 1 if updates.get("in_app_enabled", current["in_app_enabled"]) else 0
    prio = updates.get("priority_order", current["priority_order"])

    cursor.execute("""
    UPDATE emergency_contacts
    SET name = ?, role = ?, phone = ?, email = ?, escalation_level = ?,
        is_enabled = ?, sms_enabled = ?, email_enabled = ?, in_app_enabled = ?,
        priority_order = ?, updated_at = ?
    WHERE id = ?
    """, (name, role, phone, email, lvl, is_en, sms_en, em_en, app_en, prio, now_str, contact_id))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "UPDATE_EMERGENCY_CONTACT", "EMERGENCY_CONTACT", contact_id, "Admin", json.dumps(updates)))

    conn.commit()
    conn.close()

    return get_emergency_contact_by_id(contact_id)

def delete_emergency_contact(contact_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM emergency_contacts WHERE id = ?", (contact_id,))
    if not cursor.fetchone():
        conn.close()
        return False

    now_str = utcnow_str()
    cursor.execute("DELETE FROM emergency_contacts WHERE id = ?", (contact_id,))
    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "DELETE_EMERGENCY_CONTACT", "EMERGENCY_CONTACT", contact_id, "Admin", "{}"))

    conn.commit()
    conn.close()
    return True

# --- Alert Configurations Operations ---

def get_alert_configuration() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alert_configurations WHERE id = 'GLOBAL_CONFIG'")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {
            "id": "GLOBAL_CONFIG",
            "automated_risk_alerting_active": True,
            "automatic_email_dispatch": "DISABLED",
            "automatic_email_dispatch_active": False,
            "email_dispatch_mode": "MANUAL_ADMIN_ONLY",
            "risk_alert_threshold": 0.75,
            "alert_cooldown_seconds": 600,
            "escalation_timeout_seconds": 120,
            "max_escalation_level": 3,
            "significant_risk_escalation_delta": 0.15,
            "demo_mode_enabled": True,
            "updated_at": utcnow_str()
        }
    d = dict(row)
    d["automated_risk_alerting_active"] = bool(d["automated_risk_alerting_active"])
    d["demo_mode_enabled"] = bool(d["demo_mode_enabled"])
    d["automatic_email_dispatch"] = "DISABLED"
    d["automatic_email_dispatch_active"] = False
    d["email_dispatch_mode"] = "MANUAL_ADMIN_ONLY"
    return d


def update_alert_configuration(updates: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    current = get_alert_configuration()
    now_str = utcnow_str()

    auto_active = updates.get("automated_risk_alerting_active")
    if auto_active is None:
        auto_active = current["automated_risk_alerting_active"]

    thresh = updates.get("risk_alert_threshold", current["risk_alert_threshold"])
    cooldown = updates.get("alert_cooldown_seconds", current["alert_cooldown_seconds"])
    timeout = updates.get("escalation_timeout_seconds", current["escalation_timeout_seconds"])
    max_lvl = updates.get("max_escalation_level", current["max_escalation_level"])
    delta = updates.get("significant_risk_escalation_delta", current["significant_risk_escalation_delta"])
    demo_en = updates.get("demo_mode_enabled", current["demo_mode_enabled"])

    cursor.execute("""
    UPDATE alert_configurations
    SET automated_risk_alerting_active = ?, risk_alert_threshold = ?, alert_cooldown_seconds = ?,
        escalation_timeout_seconds = ?, max_escalation_level = ?, significant_risk_escalation_delta = ?,
        demo_mode_enabled = ?, updated_at = ?
    WHERE id = 'GLOBAL_CONFIG'
    """, (
        1 if auto_active else 0,
        thresh,
        cooldown,
        timeout,
        max_lvl,
        delta,
        1 if demo_en else 0,
        now_str
    ))

    cursor.execute("""
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, performed_by, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (now_str, "UPDATE_ALERT_CONFIGURATION", "CONFIG", "GLOBAL_CONFIG", "Admin", json.dumps(updates)))

    conn.commit()
    conn.close()
    return get_alert_configuration()

# --- Escalation Events Operations ---

def log_escalation_event(event_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO escalation_events (id, incident_id, from_level, to_level, triggered_at, reason, actor, notification_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_data.get("id") or f"ESC-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}",
        event_data["incident_id"],
        event_data["from_level"],
        event_data["to_level"],
        event_data.get("triggered_at", utcnow_str()),
        event_data["reason"],
        event_data.get("actor", "System"),
        event_data.get("notification_summary", "")
    ))
    conn.commit()
    conn.close()

def get_escalation_events(incident_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if incident_id:
        cursor.execute("SELECT * FROM escalation_events WHERE incident_id = ? ORDER BY triggered_at DESC LIMIT ?", (incident_id, limit))
    else:
        cursor.execute("SELECT * FROM escalation_events ORDER BY triggered_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Alerts & Notification Dispatches ---

def insert_alert(alert_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO alerts (id, title, severity, district, state, message, channels, created_at, is_active, alert_type, incident_id, is_simulated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert_data["id"],
        alert_data["title"],
        alert_data["severity"],
        alert_data["district"],
        alert_data["state"],
        alert_data["message"],
        json.dumps(alert_data.get("channels", ["DASHBOARD"])),
        alert_data.get("created_at", utcnow_str()),
        1,
        alert_data.get("alert_type", "RISK"),
        alert_data.get("incident_id"),
        1 if alert_data.get("is_simulated", True) else 0
    ))
    conn.commit()
    conn.close()

def log_notification_dispatch(dispatch_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO notification_dispatches (
        id, alert_id, channel, recipient, status, provider_response,
        attempted_at, completed_at, is_simulated, error_message,
        contact_id, contact_name, contact_role, escalation_level,
        provider, provider_reference, http_status, delivery_event, delivery_event_at,
        normalized_recipient, rejection_reason, error_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dispatch_data["id"],
        dispatch_data["alert_id"],
        dispatch_data["channel"],
        dispatch_data["recipient"],
        dispatch_data["status"],
        dispatch_data.get("provider_response", ""),
        dispatch_data.get("attempted_at", utcnow_str()),
        dispatch_data.get("completed_at", utcnow_str()),
        1 if dispatch_data.get("is_simulated", True) else 0,
        dispatch_data.get("error_message"),
        dispatch_data.get("contact_id"),
        dispatch_data.get("contact_name"),
        dispatch_data.get("contact_role"),
        dispatch_data.get("escalation_level", 1),
        dispatch_data.get("provider", "Brevo"),
        dispatch_data.get("provider_reference"),
        dispatch_data.get("http_status"),
        dispatch_data.get("delivery_event"),
        dispatch_data.get("delivery_event_at"),
        dispatch_data.get("normalized_recipient"),
        dispatch_data.get("rejection_reason"),
        dispatch_data.get("error_code")
    ))
    conn.commit()
    conn.close()

def update_notification_dispatch_status_by_ref(
    ref_id: str,
    new_status: str,
    details: Optional[str] = None,
    delivery_event: Optional[str] = None,
    http_status: Optional[int] = None,
    rejection_reason: Optional[str] = None,
    error_code: Optional[str] = None,
    phone_number: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Match by provider_reference, ID, or normalized recipient
    clean_phone = phone_number.replace("+", "").strip() if phone_number else ""
    cursor.execute("""
    SELECT * FROM notification_dispatches 
    WHERE provider_reference = ? 
       OR provider_response LIKE ? 
       OR id = ?
       OR (? != '' AND (recipient = ? OR recipient = ? OR normalized_recipient = ? OR normalized_recipient = ?))
    ORDER BY attempted_at DESC LIMIT 1
    """, (
        ref_id,
        f"%{ref_id}%",
        ref_id,
        clean_phone,
        f"+{clean_phone}",
        clean_phone,
        f"+{clean_phone}",
        clean_phone
    ))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    now_str = utcnow_str()
    cursor.execute("""
    UPDATE notification_dispatches
    SET status = ?,
        completed_at = ?,
        provider_response = COALESCE(?, provider_response),
        delivery_event = COALESCE(?, delivery_event),
        delivery_event_at = ?,
        http_status = COALESCE(?, http_status),
        rejection_reason = COALESCE(?, rejection_reason),
        error_code = COALESCE(?, error_code)
    WHERE id = ?
    """, (
        new_status,
        now_str,
        details or d.get("provider_response"),
        delivery_event,
        now_str,
        http_status,
        rejection_reason,
        error_code,
        d["id"]
    ))
    conn.commit()
    conn.close()
    d["status"] = new_status
    d["completed_at"] = now_str
    if delivery_event:
        d["delivery_event"] = delivery_event
    if details:
        d["provider_response"] = details
    if rejection_reason:
        d["rejection_reason"] = rejection_reason
    if error_code:
        d["error_code"] = error_code
    return d

def get_notification_diagnostics(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns latest notification dispatch diagnostics for administrative review.
    Shows exact provider request attempts, HTTP statuses, provider message IDs,
    acceptance states, webhook carrier events, and failure reasons.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        id, alert_id, channel, recipient, normalized_recipient, status, provider,
        provider_reference, http_status, delivery_event, delivery_event_at,
        provider_response, rejection_reason, error_code, error_message, attempted_at, completed_at,
        is_simulated, contact_name, contact_role, escalation_level
    FROM notification_dispatches
    ORDER BY attempted_at DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results

def get_active_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["channels"] = json.loads(d["channels"]) if d["channels"] else []
        d["is_simulated"] = bool(d.get("is_simulated", 1))
        results.append(d)
    conn.close()
    return results

def get_alert_history(alert_type: Optional[str] = None, severity: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    if alert_type:
        query += " AND alert_type = ?"
        params.append(alert_type)
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["channels"] = json.loads(d["channels"]) if d["channels"] else []
        d["is_simulated"] = bool(d.get("is_simulated", 1))
        # Fetch associated dispatches
        cursor.execute("SELECT * FROM notification_dispatches WHERE alert_id = ? ORDER BY attempted_at ASC", (d["id"],))
        dispatches = [dict(dp) for dp in cursor.fetchall()]
        for dp in dispatches:
            dp["is_simulated"] = bool(dp.get("is_simulated", 1))
        d["dispatches"] = dispatches
        results.append(d)
    conn.close()
    return results

def get_notification_dispatches(alert_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if alert_id:
        cursor.execute("SELECT * FROM notification_dispatches WHERE alert_id = ? ORDER BY attempted_at DESC LIMIT ?", (alert_id, limit))
    else:
        cursor.execute("SELECT * FROM notification_dispatches ORDER BY attempted_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["is_simulated"] = bool(d.get("is_simulated", 1))
        results.append(d)
    conn.close()
    return results

# --- Audit Logs ---

def get_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["details"] = json.loads(d["details_json"]) if d["details_json"] else {}
        del d["details_json"]
        results.append(d)
    conn.close()
    return results


# --- User & RBAC Operations ---

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d["is_active"] = bool(d.get("is_active", 1))
        return d
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if not user_id:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d["is_active"] = bool(d.get("is_active", 1))
        return d
    return None


def insert_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = utcnow_str()
    uid = user_data.get("id") or f"USR-{uuid.uuid4().hex[:8].upper()}"
    
    cursor.execute("""
    INSERT INTO users (
        id, name, email, password_hash, salt, role, department, jurisdiction, phone, is_active, created_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        uid,
        user_data["name"].strip(),
        user_data["email"].strip().lower(),
        user_data["password_hash"],
        user_data["salt"],
        user_data.get("role", "CITIZEN").upper(),
        user_data.get("department", ""),
        user_data.get("jurisdiction", ""),
        user_data.get("phone", ""),
        1 if user_data.get("is_active", True) else 0,
        user_data.get("created_at", now_str),
        user_data.get("last_login_at")
    ))
    conn.commit()
    conn.close()
    return get_user_by_id(uid)


def update_user_last_login(user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = utcnow_str()
    cursor.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_str, user_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


def list_users(role: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if role:
        cursor.execute("SELECT id, name, email, role, department, jurisdiction, phone, is_active, created_at, last_login_at FROM users WHERE UPPER(role) = UPPER(?) ORDER BY created_at DESC LIMIT ?", (role, limit))
    else:
        cursor.execute("SELECT id, name, email, role, department, jurisdiction, phone, is_active, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["is_active"] = bool(d.get("is_active", 1))
        results.append(d)
    conn.close()
    return results

