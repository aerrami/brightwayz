"""
app/routers/clients.py

Endpoints
---------
GET    /data/clients                    list clients for an org (with search/filter)
POST   /data/create-client             create a new client
POST   /data/update-client/{id}        update client fields
GET    /data/client/{id}               get a single client
GET    /data/client/{id}/intakes       list all assessments for a client
GET    /data/clients/{id}/referrals    list referrals for a client
POST   /data/update-client-worker      assign a case worker to a client
GET    /data/clients-comms/{id}        get email communication history for a client
GET    /data/auditlogs                 get audit log for an org
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_user
from app.core.supabase import db_get, db_get_one, db_patch, db_post
from app.models.schemas import (
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    ClientWorkerUpdate,
)

router = APIRouter(prefix="/data", tags=["clients"])


# ── GET /data/clients ─────────────────────────────────────────────────────────

@router.get("/clients")
async def list_clients(
    org: str = Query(..., description="Organisation ID"),
    search: str = Query("", description="Name search"),
    limit: int = Query(50),
    offset: int = Query(0),
    worker: str = Query("", description="Filter by assigned worker ID"),
    _user: dict = Depends(require_user),
):
    filters = f"org_id=eq.{org}&limit={limit}&offset={offset}&order=created_at.desc"
    if worker:
        filters += f"&assigned_worker_id=eq.{worker}"
    rows = await db_get(f"clients?{filters}&select=*")
    if search:
        s = search.lower()
        rows = [
            r for r in rows
            if s in (r.get("first_name") or "").lower()
            or s in (r.get("last_name") or "").lower()
            or s in (r.get("email") or "").lower()
            or s in (r.get("phone") or "").lower()
        ]
    return rows


# ── POST /data/create-client ──────────────────────────────────────────────────

@router.post("/create-client", response_model=ClientResponse)
async def create_client(
    body: ClientCreate,
    _user: dict = Depends(require_user),
):
    now = datetime.now(timezone.utc).isoformat()
    client = await db_post("clients", {
        "first_name": body.firstName,
        "last_name": body.lastName,
        "date_of_birth": body.dob,
        "gender": body.gender,
        "phone": body.phone,
        "email": body.email,
        "language": body.language,
        "zip_code": body.zipCode,
        "org_id": body.orgId,
        "created_at": now,
    })
    await db_post("audit_logs", {
        "org_id": body.orgId,
        "user_id": _user.get("sub"),
        "action": "create_client",
        "entity_type": "client",
        "entity_id": client["id"],
        "created_at": now,
    })
    return ClientResponse(client=client)


# ── POST /data/update-client/{id} ────────────────────────────────────────────

@router.post("/update-client/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    body: ClientUpdate,
    _user: dict = Depends(require_user),
):
    client = await db_patch(f"clients?id=eq.{client_id}", {
        "first_name": body.firstName,
        "last_name": body.lastName,
        "date_of_birth": body.dob,
        "gender": body.gender,
        "phone": body.phone,
        "email": body.email,
        "language": body.language,
        "zip_code": body.zipCode,
    })
    return ClientResponse(client=client)


# ── GET /data/client/{id} ─────────────────────────────────────────────────────

@router.get("/client/{client_id}")
async def get_client(
    client_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get_one(f"clients?id=eq.{client_id}&select=*")


# ── GET /data/client/{id}/intakes ─────────────────────────────────────────────

@router.get("/client/{client_id}/intakes")
async def list_client_intakes(
    client_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"intakes?client_id=eq.{client_id}&order=created_at.desc&select=*"
    )


# ── GET /data/clients/{id}/referrals ─────────────────────────────────────────

@router.get("/clients/{client_id}/referrals")
async def list_client_referrals(
    client_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"referrals?client_id=eq.{client_id}&order=created_at.desc&select=*"
    )


# ── POST /data/update-client-worker ──────────────────────────────────────────

@router.post("/update-client-worker")
async def update_client_worker(
    body: ClientWorkerUpdate,
    _user: dict = Depends(require_user),
):
    await db_patch(f"clients?id=eq.{body.client_id}", {
        "assigned_worker_id": body.case_worker_id,
    })
    return {"success": True}


# ── GET /data/clients-comms/{id} ─────────────────────────────────────────────

@router.get("/clients-comms/{client_id}")
async def get_client_comms(
    client_id: str,
    _user: dict = Depends(require_user),
):
    """Returns email/message communication history for a client."""
    return await db_get(
        f"messages?client_id=eq.{client_id}&order=created_at.desc&select=*"
    )


# ── GET /data/auditlogs ───────────────────────────────────────────────────────

@router.get("/auditlogs")
async def get_audit_logs(
    org: str = Query(...),
    after: str = Query("", description="ISO timestamp — return logs after this date"),
    _user: dict = Depends(require_user),
):
    q = f"audit_logs?org_id=eq.{org}&order=created_at.desc&select=*"
    if after:
        q += f"&created_at=gt.{after}"
    return await db_get(q)
