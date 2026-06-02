"""
app/routers/intake.py

Endpoints
---------
POST   /data/intake                       create client + case + blank assessment
POST   /data/update-intake/{id}           auto-save draft assessment
POST   /data/complete-intake/{id}         finalise assessment
GET    /data/intake/{id}                  fetch single assessment
POST   /auth/chatbot-intake               public — submit from the client chatbot
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_user
from app.core.config import get_settings
from app.core.supabase import db_delete, db_get, db_get_one, db_patch, db_post
from fastapi import Query
from app.models.schemas import (
    AssessmentUpdate,
    ChatbotIntake,
    ChatbotIntakeResponse,
    IntakeCreate,
    IntakeCreateResponse,
)

data_router = APIRouter(prefix="/data", tags=["intake"])
auth_router = APIRouter(prefix="/auth", tags=["intake-public"])


def _assessment_row(body: AssessmentUpdate, status: str, now: str) -> dict:
    return {
        "name": body.name,
        "age": body.age,
        "zip_code": body.zipCode,
        "employment_status": body.employmentStatus,
        "housing_status": body.housingStatus,
        "housing_stable": body.housingStableStatus,
        "health_medication": body.healthMedicationStatus,
        "health_mental_history": body.healthMentalHistory,
        "justice_impact_time": body.justiceImpactTime,
        "justice_impact_status": body.justiceImpactStatus,
        "justice_conviction_type": body.justiceImpactConvictionType,
        "support_types": body.supportTypes,
        "support_urgent": body.supportUrgent,
        "support_more": body.supportMore,
        "phone": body.phone,
        "email": body.email,
        "language": body.language,
        "source": body.source or "staff",
        "status": status,
        "internal_notes": body.internalNotes,
    }


# ── GET /data/intakes ─────────────────────────────────────────────────────────

def _sanitize_search(s: str) -> str:
    """Strip PostgREST operator chars so user input can't break the query."""
    return "".join(c for c in s if c.isalnum() or c in " -'.")[:80]


@data_router.get("/intakes")
async def list_intakes(
    org: str = Query(...),
    search: str = Query("", description="Match against client name or intake ZIP"),
    date_from: str = Query("", alias="from", description="ISO date, inclusive lower bound"),
    date_to: str = Query("", alias="to", description="ISO date, inclusive upper bound"),
    status: str = Query("", description="'completed' or 'in_progress'"),
    limit: int = Query(50, le=200),
    _user: dict = Depends(require_user),
):
    q = (
        f"intakes?org_id=eq.{org}"
        f"&select=id,status,source,zip_code,support_types,support_urgent,created_at,completed_at,"
        f"client:clients(id,first_name,last_name)"
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
            ids_csv = ",".join(client_ids) if client_ids else "00000000-0000-0000-0000-000000000000"
            q += f"&or=(client_id.in.({ids_csv}),zip_code.ilike.*{clean}*)"

    return await db_get(q)


# ── POST /data/intake ─────────────────────────────────────────────────────────

@data_router.post("/intake", response_model=IntakeCreateResponse)
async def create_intake(
    body: IntakeCreate,
    user: dict = Depends(require_user),
):
    now = datetime.now(timezone.utc).isoformat()

    client = await db_post("clients", {
        "first_name": body.firstName,
        "last_name": body.lastName,
        "date_of_birth": body.clientDob,
        "org_id": body.orgId,
        "created_at": now,
    })
    client_id = client["id"]

    if body.caseId:
        case_id = body.caseId
    else:
        case = await db_post("cases", {
            "client_id": client_id,
            "org_id": body.orgId,
            "project_id": body.projectId,
            "status": "open",
            "created_at": now,
        })
        case_id = case["id"]

    assessment = await db_post("intakes", {
        "client_id": client_id,
        "org_id": body.orgId,
        "status": "in_progress",
        "source": "staff",
        "created_at": now,
    })

    await db_post("audit_logs", {
        "org_id": body.orgId,
        "user_id": user.get("sub"),
        "action": "create_intake",
        "entity_type": "intake",
        "entity_id": assessment["id"],
        "created_at": now,
    })

    return IntakeCreateResponse(
        clientId=client_id,
        caseId=case_id,
        assessmentId=assessment["id"],
    )


# ── POST /data/update-intake/{id} ────────────────────────────────────────────

@data_router.post("/update-intake/{assessment_id}")
async def update_intake(
    assessment_id: str,
    body: AssessmentUpdate,
    _user: dict = Depends(require_user),
):
    now = datetime.now(timezone.utc).isoformat()
    row = _assessment_row(body, "in_progress", now)
    await db_patch(f"intakes?id=eq.{assessment_id}", row)
    return {"assessmentId": assessment_id, "status": "updated"}


# ── POST /data/complete-intake/{id} ──────────────────────────────────────────

@data_router.post("/complete-intake/{assessment_id}")
async def complete_intake(
    assessment_id: str,
    body: AssessmentUpdate,
    user: dict = Depends(require_user),
):
    now = datetime.now(timezone.utc).isoformat()
    row = _assessment_row(body, "completed", now)
    row["completed_at"] = now
    await db_patch(f"intakes?id=eq.{assessment_id}", row)
    await db_post("audit_logs", {
        "org_id": None,
        "user_id": user.get("sub"),
        "action": "complete_intake",
        "entity_type": "intake",
        "entity_id": assessment_id,
        "created_at": now,
    })
    return {"assessmentId": assessment_id, "status": "completed", "completedAt": now}


# ── GET /data/intake/{id} ─────────────────────────────────────────────────────

@data_router.get("/intake/{assessment_id}")
async def get_intake(
    assessment_id: str,
    _user: dict = Depends(require_user),
):
    return await db_get_one(
        f"intakes?id=eq.{assessment_id}"
        f"&select=*,client:clients(id,first_name,last_name,phone,email)"
    )


# ── DELETE /data/intake/{id} ──────────────────────────────────────────────────

@data_router.delete("/intake/{assessment_id}")
async def delete_intake(
    assessment_id: str,
    _user: dict = Depends(require_user),
):
    await db_delete(f"intakes?id=eq.{assessment_id}")
    return {"success": True, "assessmentId": assessment_id}


# ── POST /auth/chatbot-intake (PUBLIC) ────────────────────────────────────────

@auth_router.post("/chatbot-intake", response_model=ChatbotIntakeResponse)
async def chatbot_intake(body: ChatbotIntake):
    cfg = get_settings()
    org_id = body.orgId or cfg.default_org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="orgId is required")

    now = datetime.now(timezone.utc).isoformat()

    client = await db_post("clients", {
        "first_name": body.firstName,
        "last_name": body.lastName,
        "phone": body.phone,
        "email": body.email,
        "zip_code": body.zipCode,
        "language": body.language,
        "org_id": org_id,
        "created_at": now,
    })
    client_id = client["id"]

    await db_post("cases", {
        "client_id": client_id,
        "org_id": org_id,
        "status": "open",
        "created_at": now,
    })

    assessment = await db_post("intakes", {
        "client_id": client_id,
        "org_id": org_id,
        "housing_status": body.housingStatus,
        "employment_status": body.employmentStatus,
        "zip_code": body.zipCode,
        "support_types": body.supportTypes,
        "support_urgent": body.supportUrgent,
        "language": body.language,
        "source": "chatbot",
        "status": "completed",
        "completed_at": now,
        "created_at": now,
    })

    return ChatbotIntakeResponse(
        success=True,
        assessmentId=assessment["id"],
        message=(
            f"Thank you {body.firstName}. Your request has been received. "
            "A case manager will be in touch within 24 hours."
        ),
    )
