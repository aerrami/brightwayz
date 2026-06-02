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

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import require_user
from app.core.supabase import db_get, db_patch, db_post
from app.models.schemas import ReferralCreate

data_router = APIRouter(prefix="/data", tags=["referrals"])
auth_router = APIRouter(prefix="/auth", tags=["referrals-public"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expiry(days: int = 7) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _sanitize_search(s: str) -> str:
    return "".join(c for c in s if c.isalnum() or c in " -'.@")[:80]


# ── GET /data/referrals ───────────────────────────────────────────────────────

@data_router.get("/referrals")
async def list_referrals(
    org: str = Query(...),
    search: str = Query("", description="Match against client name or invite email"),
    date_from: str = Query("", alias="from"),
    date_to: str = Query("", alias="to"),
    status: str = Query("", description="pending / accepted / declined / cancelled"),
    limit: int = Query(50, le=200),
    _user: dict = Depends(require_user),
):
    q = (
        "referrals?"
        "select=id,status,note,invite_email,destination_org_id,created_at,responded_at,"
        "client:clients!inner(id,first_name,last_name,org_id)"
        f"&client.org_id=eq.{org}"
        f"&order=created_at.desc&limit={limit}"
    )
    if status:
        q += f"&status=eq.{status}"
    if date_from:
        q += f"&created_at=gte.{date_from}"
    if date_to:
        q += f"&created_at=lte.{date_to}T23:59:59"

    if search:
        clean = _sanitize_search(search)
        if clean:
            clients = await db_get(
                f"clients?org_id=eq.{org}"
                f"&or=(first_name.ilike.*{clean}*,last_name.ilike.*{clean}*)"
                f"&select=id"
            )
            client_ids = [c["id"] for c in clients] if isinstance(clients, list) else []
            ids_csv = (
                ",".join(client_ids) if client_ids else "00000000-0000-0000-0000-000000000000"
            )
            q += f"&or=(client_id.in.({ids_csv}),invite_email.ilike.*{clean}*)"

    return await db_get(q)


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
