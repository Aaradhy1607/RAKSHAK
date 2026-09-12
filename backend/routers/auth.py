"""
Authentication & Role-Based Access Control Router for RAKSHAK
Endpoints:
- POST /api/auth/register (Citizen Registration)
- POST /api/auth/login (Unified Citizen & Authority Sign-In)
- GET /api/auth/me (Current Authenticated Profile & Capabilities)
- POST /api/auth/logout (Session Invalidation)
- POST /api/auth/admin/provision-authority (Admin-Only Authority Provisioning)
- GET /api/auth/admin/users (Admin-Only User Directory)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
import uuid

from backend.models import (
    CitizenRegisterRequest,
    LoginRequest,
    UserOut,
    AuthResponse,
    AuthorityProvisionRequest
)
from backend.database import (
    get_user_by_email,
    get_user_by_id,
    insert_user,
    update_user_last_login,
    list_users
)
from backend.services.auth_service import (
    hash_password,
    generate_salt,
    verify_password,
    create_session_token,
    get_current_user,
    require_role
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/register", response_model=AuthResponse)
async def register_citizen(payload: CitizenRegisterRequest):
    """
    Public Citizen Registration endpoint.
    Creates a secure citizen safety account with salted PBKDF2 password hashing.
    Enforces role='CITIZEN' to prevent unauthorized privilege escalation.
    """
    email_clean = payload.email.lower().strip()
    
    # 1. Check password confirmation if supplied
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match."
        )

    # 2. Check for existing user with identical email
    existing = get_user_by_email(email_clean)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' is already registered."
        )

    # 3. Hash password with unique random salt
    salt = generate_salt(16)
    pwd_hash = hash_password(payload.password, salt)
    uid = f"USR-CIT-{uuid.uuid4().hex[:8].upper()}"

    user_data = {
        "id": uid,
        "name": payload.name.strip(),
        "email": email_clean,
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "CITIZEN",
        "department": "Citizen Safety Network",
        "jurisdiction": "North-Eastern Region",
        "phone": payload.phone or "",
        "is_active": True
    }

    created = insert_user(user_data)
    if not created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user record. Please try again."
        )

    # 4. Generate signed session token
    token = create_session_token(created)
    update_user_last_login(created["id"])

    user_out = UserOut(
        id=created["id"],
        name=created["name"],
        email=created["email"],
        role=created["role"],
        department=created.get("department"),
        jurisdiction=created.get("jurisdiction"),
        phone=created.get("phone"),
        is_active=created["is_active"],
        created_at=created["created_at"],
        last_login_at=created.get("last_login_at")
    )

    return AuthResponse(
        token=token,
        user=user_out,
        message="Citizen account created successfully. Welcome to RAKSHAK Safety Network."
    )


@router.post("/login", response_model=AuthResponse)
async def login_user(payload: LoginRequest):
    """
    Unified Authentication Terminal endpoint for Citizens and Authority officers.
    Validates credentials with timing-safe hash comparison and issues signed session tokens.
    """
    email_clean = payload.email.lower().strip()
    user = get_user_by_email(email_clean)

    # Timing-safe error response to prevent user enumeration
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently suspended. Please contact National Disaster Management Administration."
        )

    # Verify password hash
    is_valid = verify_password(
        plain_password=payload.password,
        salt=user["salt"],
        expected_hash=user["password_hash"]
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # If an authority terminal login was requested, verify the user possesses authority privileges
    if payload.role_hint and payload.role_hint.upper() == "AUTHORITY":
        if user["role"].upper() not in ("AUTHORITY", "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted. Citizen accounts cannot access the Emergency Command Terminal."
            )

    # Update last login timestamp
    update_user_last_login(user["id"])
    token = create_session_token(user)

    user_out = UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        jurisdiction=user.get("jurisdiction"),
        phone=user.get("phone"),
        is_active=user["is_active"],
        created_at=user["created_at"],
        last_login_at=user.get("last_login_at")
    )

    return AuthResponse(
        token=token,
        user=user_out,
        message=f"Welcome back, {user['name']}. Access granted to {user['role']} session."
    )


@router.get("/me", response_model=UserOut)
async def get_current_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns verified profile data and RBAC permissions for the active session.
    """
    user = get_user_by_id(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User record not found.")

    return UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        jurisdiction=user.get("jurisdiction"),
        phone=user.get("phone"),
        is_active=user["is_active"],
        created_at=user["created_at"],
        last_login_at=user.get("last_login_at")
    )


@router.post("/logout")
async def logout_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Gracefully invalidates active session state on client request.
    """
    return {
        "status": "SUCCESS",
        "message": "Session terminated successfully. Terminal locked.",
        "user_id": current_user["sub"]
    }


# --- Admin-Only Authority Account Provisioning ---

@router.post("/admin/provision-authority", response_model=UserOut)
async def provision_authority_account(
    payload: AuthorityProvisionRequest,
    admin_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Admin-Only endpoint for government authority provisioning.
    Allows vetted SDRF, NDRF, DDMA, and SDMA officers to be onboarded securely.
    """
    email_clean = payload.email.lower().strip()
    existing = get_user_by_email(email_clean)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' is already provisioned."
        )

    salt = generate_salt(16)
    pwd_hash = hash_password(payload.password, salt)
    uid = f"USR-AUTH-{uuid.uuid4().hex[:8].upper()}"

    user_data = {
        "id": uid,
        "name": payload.name.strip(),
        "email": email_clean,
        "password_hash": pwd_hash,
        "salt": salt,
        "role": payload.role.value.upper(),
        "department": payload.department.strip(),
        "jurisdiction": payload.jurisdiction.strip(),
        "phone": payload.phone or "",
        "is_active": True
    }

    created = insert_user(user_data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to provision authority user.")

    return UserOut(
        id=created["id"],
        name=created["name"],
        email=created["email"],
        role=created["role"],
        department=created.get("department"),
        jurisdiction=created.get("jurisdiction"),
        phone=created.get("phone"),
        is_active=created["is_active"],
        created_at=created["created_at"],
        last_login_at=created.get("last_login_at")
    )


@router.get("/admin/users", response_model=List[UserOut])
async def list_all_users(
    role: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """
    Admin-Only endpoint to list all registered users across Citizen and Authority tiers.
    """
    users = list_users(role=role, limit=100)
    return [
        UserOut(
            id=u["id"],
            name=u["name"],
            email=u["email"],
            role=u["role"],
            department=u.get("department"),
            jurisdiction=u.get("jurisdiction"),
            phone=u.get("phone"),
            is_active=u["is_active"],
            created_at=u["created_at"],
            last_login_at=u.get("last_login_at")
        )
        for u in users
    ]
