"""
app/routers/cases.py — CRM lifecycle for client cases.

Cases use the existing `status` column with an expanded vocabulary:
    open | assigned | in_progress | resolved | closed

The legacy default 'open' is preserved so existing rows are valid.

A status update on a case triggers a templated notification to the
client (email + SMS where contact info exists). See
app/core/notifications.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import require_user
from app.core.notifications import notify_case_status_change, STATUS_TEMPLATES
from app.core.supabase import db_get, db_get_one, db_patch
from app.models.schemas import CaseStatusUpdate

router = APIRouter(prefix="/data", tags=["cases"])

VALID_STATUSES = set(STATUS_TEMPLATES.keys())


@router.get("/cases")
async def list_client_cases(
    client_id: str = Query(..., alias="clientId"),
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"cases?client_id=eq.{client_id}"
        f"&select=id,status,project_id,created_at"
        f"&order=created_at.desc"
    )


@router.post("/cases/{case_id}/status")
async def update_case_status(
    case_id: str,
    body: CaseStatusUpdate,
    _user: dict = Depends(require_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(VALID_STATUSES)}",
        )

    case = await db_get_one(
        f"cases?id=eq.{case_id}"
        f"&select=id,status,client:clients(first_name,email,phone)"
    )
    if case.get("status") == body.status:
        return {"success": True, "status": body.status, "notification": None}

    await db_patch(f"cases?id=eq.{case_id}", {"status": body.status})

    client = case.get("client") or {}
    notification = notify_case_status_change(
        status=body.status,
        client_first_name=client.get("first_name", ""),
        client_email=client.get("email"),
        client_phone=client.get("phone"),
    )
    return {"success": True, "status": body.status, "notification": notification}
