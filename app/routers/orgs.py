"""
app/routers/orgs.py — organisations, invites, team members, dashboard
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_user
from app.core.supabase import db_get, db_get_one, db_patch, db_post
from app.models.schemas import InviteCreate, OrgUpdate

router = APIRouter(prefix="/data", tags=["organisations"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _expiry(days=7):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


# ── GET /data/organizations ───────────────────────────────────────────────────

@router.get("/organizations")
async def list_organizations(
    limit: int = Query(50),
    _user: dict = Depends(require_user),
):
    return await db_get(f"organizations?limit={limit}&select=id,name,display_name,logo_url,city,state")


# ── GET /data/organization/{id} ───────────────────────────────────────────────

@router.get("/organization/{org_id}")
async def get_organization(
    org_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get_one(f"organizations?id=eq.{org_id}&select=*")


# ── POST /data/update-org/{id} ────────────────────────────────────────────────

@router.post("/update-org/{org_id}")
async def update_org(
    org_id: str,
    body: OrgUpdate,
    _user: dict = Depends(require_user),
):
    updated = await db_patch(f"organizations?id=eq.{org_id}", body.model_dump(exclude_none=True))
    return {"org": updated}


# ── GET /data/org-members/{id} ────────────────────────────────────────────────

@router.get("/org-members/{org_id}")
async def list_org_members(
    org_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"org_members?org_id=eq.{org_id}&select=id,role,joined_at,users(id,first_name,last_name,email)"
    )


# ── GET /data/invites ─────────────────────────────────────────────────────────

@router.get("/invites")
async def list_invites(
    org: str = Query(...),
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"invites?org_id=eq.{org}&status=eq.pending&select=*&order=created_at.desc"
    )


# ── POST /data/create-invite ──────────────────────────────────────────────────

@router.post("/create-invite")
async def create_invite(
    body: InviteCreate,
    _user: dict = Depends(require_user),
):
    now = _now()
    created = []
    for email in body.emails:
        email = email.strip()
        if not email:
            continue
        token = secrets.token_urlsafe(24)
        invite = await db_post("invites", {
            "org_id": body.orgId,
            "email": email,
            "role": body.role,
            "token": token,
            "status": "pending",
            "expires_at": _expiry(days=7),
            "created_at": now,
        })
        created.append(invite)
    return {"invites": created}


# ── POST /data/delete-invite/{id} ─────────────────────────────────────────────

@router.post("/delete-invite/{invite_id}")
async def delete_invite(
    invite_id: str,
    _user: dict = Depends(require_user),
):
    await db_patch(f"invites?id=eq.{invite_id}", {"status": "cancelled"})
    return {"success": True}


# ── GET /data/dashboard/{id} ─────────────────────────────────────────────────

@router.get("/dashboard/{org_id}")
async def get_dashboard(
    org_id: str,
    _user: dict = Depends(require_user),
):
    org = await db_get_one(f"organizations?id=eq.{org_id}&select=*")
    recent_clients = await db_get(
        f"clients?org_id=eq.{org_id}&order=created_at.desc&limit=10&select=*"
    )
    recent_referrals = await db_get(
        f"referrals?from_org_id=eq.{org_id}&order=created_at.desc&limit=10&select=*"
    )
    all_clients = await db_get(f"clients?org_id=eq.{org_id}&select=id")
    open_referrals = await db_get(
        f"referrals?from_org_id=eq.{org_id}&status=eq.pending&select=id"
    )
    completed_intakes = await db_get(
        f"intakes?org_id=eq.{org_id}&status=eq.completed&select=id"
    )
    return {
        "org": org,
        "stats": {
            "totalClients": len(all_clients),
            "openReferrals": len(open_referrals),
            "completedIntakes": len(completed_intakes),
        },
        "recentClients": recent_clients,
        "recentReferrals": recent_referrals,
    }


# ── GET /data/user ────────────────────────────────────────────────────────────

@router.get("/user")
async def get_current_user(_user: dict = Depends(require_user)):
    user_id = _user.get("sub")
    rows = await db_get(f"users?id=eq.{user_id}&select=id,first_name,last_name,email")
    user = rows[0] if rows else {}
    return {"user": user}
