"""
app/routers/events.py — client calendar events
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from app.core.auth import require_user
from app.core.supabase import db_get, db_get_one, db_patch, db_post
from app.models.schemas import ClientEventCreate, ClientEventUpdate

router = APIRouter(prefix="/data", tags=["events"])

def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/client-event")
async def list_events(
    org_id: str = Query(...),
    client_id: str = Query(...),
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"client_events?org_id=eq.{org_id}&client_id=eq.{client_id}&order=date.asc&select=*"
    )


@router.post("/client-event")
async def create_event(
    body: ClientEventCreate,
    _user: dict = Depends(require_user),
):
    event = await db_post("client_events", {
        "client_id": body.client_id,
        "org_id": body.org_id,
        "event_name": body.event_name,
        "event_description": body.event_description,
        "date": body.date,
        "location": body.location,
        "event_url": body.event_url,
        "reminders": body.reminders,
        "created_at": _now(),
    })
    return event


@router.post("/update-client-event/{event_id}")
async def update_event(
    event_id: str,
    body: ClientEventUpdate,
    _user: dict = Depends(require_user),
):
    return await db_patch(f"client_events?id=eq.{event_id}", {
        "event_name": body.event_name,
        "event_description": body.event_description,
        "date": body.date,
        "location": body.location,
        "event_url": body.event_url,
        "reminders": body.reminders,
    })


@router.post("/delete-client-event/{event_id}")
async def delete_event(
    event_id: str,
    _user: dict = Depends(require_user),
):
    await db_patch(f"client_events?id=eq.{event_id}", {"deleted": True})
    return {"success": True}
