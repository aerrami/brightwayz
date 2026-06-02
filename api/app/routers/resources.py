"""
app/routers/resources.py

Endpoints
---------
GET    /auth/resources              public resource search (chatbot + public map)
GET    /auth/resources/{id}         get single resource (public)
GET    /data/resources/{orgId}      list resources for an org (staff)
POST   /data/resources              create a resource
POST   /data/resources/{id}         update a resource
DELETE /data/resources/{id}         delete a resource
"""
from fastapi import APIRouter, Depends, Query

from app.core.auth import require_user
from app.core.supabase import db_delete, db_get, db_get_one, db_patch, db_post
from app.models.schemas import ResourcePayload

data_router = APIRouter(prefix="/data", tags=["resources"])
auth_router = APIRouter(prefix="/auth", tags=["resources-public"])


# ── GET /auth/resources (PUBLIC) ─────────────────────────────────────────────

@auth_router.get("/resources")
async def search_resources(
    category: str = Query(""),
    type: str = Query(""),
    zip: str = Query(""),
    status: str = Query("open"),
    limit: int = Query(50),
):
    q = f"resources?status=eq.{status}&limit={limit}&select=*"
    if category:
        q += f"&category=eq.{category}"
    if type:
        q += f"&type=eq.{type}"
    if zip:
        q += f"&postal_code=eq.{zip}"
    return await db_get(q)


# ── GET /auth/resources/{id} (PUBLIC) ────────────────────────────────────────

@auth_router.get("/resources/{resource_id}")
async def get_resource_public(resource_id: str):
    return await db_get_one(f"resources?id=eq.{resource_id}&select=*")


# ── GET /data/resources/{orgId} (STAFF) ──────────────────────────────────────

@data_router.get("/resources/{org_id}")
async def list_org_resources(
    org_id: str,
    status: str = Query(""),
    category: str = Query(""),
    _user: dict = Depends(require_user),
):
    q = f"resources?org_id=eq.{org_id}&select=*&order=name.asc"
    if status:
        q += f"&status=eq.{status}"
    if category:
        q += f"&category=eq.{category}"
    return await db_get(q)


# ── POST /data/resources (CREATE) ────────────────────────────────────────────

@data_router.post("/resources")
async def create_resource(
    body: ResourcePayload,
    _user: dict = Depends(require_user),
):
    resource = await db_post("resources", {
        "name": body.name,
        "type": body.type,
        "status": body.status,
        "category": body.category,
        "phone": body.phone,
        "email": body.email,
        "address": body.address,
        "address_line2": body.address_line2,
        "city": body.city,
        "state": body.state,
        "postal_code": body.postal_code,
        "hours": body.hours,
        "apply_text": body.apply_text,
        "hero": body.hero,
        "animals": body.animals,
        "serves": body.serves,
        "requirements": body.requirements,
        "tags": body.tags,
        "lat": body.lat,
        "lng": body.lng,
        "org_id": body.orgId,
    })
    return {"resource": resource}


# ── POST /data/resources/{id} (UPDATE) ───────────────────────────────────────

@data_router.post("/resources/{resource_id}")
async def update_resource(
    resource_id: str,
    body: ResourcePayload,
    _user: dict = Depends(require_user),
):
    resource = await db_patch(f"resources?id=eq.{resource_id}", {
        "name": body.name,
        "type": body.type,
        "status": body.status,
        "category": body.category,
        "phone": body.phone,
        "email": body.email,
        "address": body.address,
        "address_line2": body.address_line2,
        "city": body.city,
        "state": body.state,
        "postal_code": body.postal_code,
        "hours": body.hours,
        "apply_text": body.apply_text,
        "hero": body.hero,
        "animals": body.animals,
        "serves": body.serves,
        "requirements": body.requirements,
        "tags": body.tags,
        "lat": body.lat,
        "lng": body.lng,
    })
    return {"resource": resource}


# ── DELETE /data/resources/{id} ──────────────────────────────────────────────

@data_router.delete("/resources/{resource_id}")
async def delete_resource(
    resource_id: str,
    _user: dict = Depends(require_user),
):
    await db_delete(f"resources?id=eq.{resource_id}")
    return {"success": True}
