"""
app/routers/referrals.py

Endpoints
---------
POST   /data/create-referral           create a referral (authenticated staff)
POST   /data/delete-referral/{id}      cancel a referral
POST   /data/referrals/{id}/accept     accept a referral (staff, by ID)
POST   /data/referrals/{id}/decline    decline a referral (staff, by ID)
GET    /auth/referral/{token}          get referral info from a token link (public)
POST   /auth/accept-referral/{token}   accept via token link (public)
POST   /auth/decline-referral/{token}  decline via token link (public)
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import require_user
from app.core.supabase import db_get, db_patch, db_post
from app.models.schemas import ReferralCreate

data_router = APIRouter(prefix="/data", tags=["referrals"])
auth_router = APIRouter(prefix="/auth", tags=["referrals-public"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expiry(days: int = 7) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


# ── POST /data/create-referral ────────────────────────────────────────────────

@data_router.post("/create-referral")
async def create_referral(
    body: ReferralCreate,
    user: dict = Depends(require_user),
):
    now = _now()
    token = secrets.token_urlsafe(24)

    referral = await db_post("referrals", {
        "client_id": body.clientId,
        "from_org_id": None,
        "destination_org_id": body.destinationOrgId,
        "invite_email": body.inviteEmail,
        "note": body.note,
        "status": "pending",
        "token": token,
        "expires_at": _expiry(),
        "created_at": now,
    })
    return referral


# ── POST /data/delete-referral/{id} ──────────────────────────────────────────

@data_router.post("/delete-referral/{referral_id}")
async def delete_referral(
    referral_id: str,
    _user: dict = Depends(require_user),
):
    await db_patch(f"referrals?id=eq.{referral_id}", {"status": "cancelled"})
    return {"success": True}


# ── POST /data/referrals/{id}/accept ─────────────────────────────────────────

@data_router.post("/referrals/{referral_id}/accept")
async def accept_referral(
    referral_id: str,
    _user: dict = Depends(require_user),
):
    await db_patch(f"referrals?id=eq.{referral_id}", {
        "status": "accepted",
        "responded_at": _now(),
    })
    return {"success": True, "status": "accepted"}


# ── POST /data/referrals/{id}/decline ────────────────────────────────────────

@data_router.post("/referrals/{referral_id}/decline")
async def decline_referral(
    referral_id: str,
    _user: dict = Depends(require_user),
):
    await db_patch(f"referrals?id=eq.{referral_id}", {
        "status": "declined",
        "responded_at": _now(),
    })
    return {"success": True, "status": "declined"}


# ── GET /auth/referral/{token} (PUBLIC) ───────────────────────────────────────

@auth_router.get("/referral/{token}")
async def get_referral_by_token(token: str):
    rows = await db_get(f"referrals?token=eq.{token}&select=*")
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found")
    referral = rows[0]
    if referral.get("status") not in ("pending",):
        raise HTTPException(status_code=410, detail=f"Referral is already {referral['status']}")
    if referral.get("expires_at") and referral["expires_at"] < _now():
        raise HTTPException(status_code=410, detail="Referral link has expired")
    return referral


# ── POST /auth/accept-referral/{token} (PUBLIC) ────────────────────────────────

@auth_router.post("/accept-referral/{token}")
async def accept_referral_by_token(token: str):
    rows = await db_get(f"referrals?token=eq.{token}&select=id,status,expires_at")
    if not rows:
        raise HTTPException(status_code=404, detail="Referral not found")
    referral = rows[0]
    if referral["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Referral already {referral['status']}")
    await db_patch(f"referrals?id=eq.{referral['id']}", {
        "status": "accepted",
        "responded_at": _now(),
    })
    return {"success": True, "status": "accepted"}


# ── POST /auth/decline-referral/{token} (PUBLIC) ───────────────────────────────

@auth_router.post("/decline-referral/{token}")
async def decline_referral_by_token(token: str):
    rows = await db_get(f"referrals?token=eq.{token}&select=id,status")
    if not rows:
        raise HTTPException(status_code=404, detail="Referral not found")
    referral = rows[0]
    if referral["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Referral already {referral['status']}")
    await db_patch(f"referrals?id=eq.{referral['id']}", {
        "status": "declined",
        "responded_at": _now(),
    })
    return {"success": True, "status": "declined"}


# ── GET /auth/invite-info/{token} (PUBLIC) ────────────────────────────────────

@auth_router.get("/invite-info/{token}")
async def get_invite_info(token: str):
    rows = await db_get(f"invites?token=eq.{token}&select=*")
    if not rows:
        raise HTTPException(status_code=404, detail="Invite not found")
    return rows[0]
