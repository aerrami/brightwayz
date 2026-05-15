"""
app/routers/messaging.py — real-time messaging support endpoints

Note: real-time delivery uses Ably (handled client-side).
This router handles:
  - Persisting messages to Supabase
  - Unread counts
  - Fetching message history
  - Staff ↔ client conversation management
  - People (staff) chat endpoints
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from app.core.auth import require_user
from app.core.supabase import db_get, db_patch, db_post
from app.models.schemas import MarkUnreadRequest, SendMessageRequest, StaffSendMessageRequest, ChatStartRequest

router = APIRouter(prefix="/data", tags=["messaging"])

def _now():
    return datetime.now(timezone.utc).isoformat()


# ── Staff: get messages for a client (in dashboard people tab) ────────────────

@router.get("/people/chat/messages/{client_id}")
async def get_staff_messages(
    client_id: str,
    org_id: str = Query(...),
    before: str = Query(""),
    _user: dict = Depends(require_user),
):
    q = f"messages?client_id=eq.{client_id}&org_id=eq.{org_id}&order=created_at.desc&limit=50&select=*"
    if before:
        q += f"&created_at=lt.{before}"
    return await db_get(q)


# ── Staff: send a message to a client (creates conversation if needed) ───────

@router.post("/people/chat/messages")
async def send_staff_message(
    body: StaffSendMessageRequest,
    user: dict = Depends(require_user),
):
    existing = await db_get(
        f"conversations?client_id=eq.{body.clientId}&org_id=eq.{body.orgId}&select=id"
    )
    if existing:
        conv_id = existing[0]["id"]
    else:
        conv = await db_post("conversations", {
            "org_id": body.orgId,
            "client_id": body.clientId,
            "created_at": _now(),
        })
        conv_id = conv["id"]

    return await db_post("messages", {
        "conversation_id": conv_id,
        "client_id": body.clientId,
        "org_id": body.orgId,
        "sender_id": user.get("sub"),
        "body": body.body,
        "read": False,
        "created_at": _now(),
    })


# ── Staff: mark client messages as read ───────────────────────────────────────

@router.post("/people/chat/unread")
async def mark_staff_unread(
    body: MarkUnreadRequest,
    user: dict = Depends(require_user),
):
    if body.clientId:
        await db_patch(
            f"messages?client_id=eq.{body.clientId}&read=eq.false",
            {"read": True},
        )
    return {"success": True}


# ── Client: start a conversation with an org ──────────────────────────────────

@router.post("/client/chat/start")
async def start_client_conversation(
    body: ChatStartRequest,
    user: dict = Depends(require_user),
):
    client_id = user.get("sub")
    existing = await db_get(
        f"conversations?client_id=eq.{client_id}&org_id=eq.{body.orgId}&select=id"
    )
    if existing:
        return {"conversationId": existing[0]["id"]}
    conv = await db_post("conversations", {
        "org_id": body.orgId,
        "client_id": client_id,
        "created_at": _now(),
    })
    return {"conversationId": conv["id"]}


# ── Client: fetch messages in a conversation ──────────────────────────────────

@router.get("/client/chat/messages/{org_id}")
async def get_client_messages(
    org_id: str,
    before: str = Query(""),
    user: dict = Depends(require_user),
):
    client_id = user.get("sub")
    convs = await db_get(
        f"conversations?client_id=eq.{client_id}&org_id=eq.{org_id}&select=id"
    )
    if not convs:
        return []
    conv_id = convs[0]["id"]
    q = f"messages?conversation_id=eq.{conv_id}&order=created_at.desc&limit=50&select=*"
    if before:
        q += f"&created_at=lt.{before}"
    return await db_get(q)


# ── Client: send a message ────────────────────────────────────────────────────

@router.post("/client/chat/messages")
async def send_client_message(
    body: SendMessageRequest,
    user: dict = Depends(require_user),
):
    msg = await db_post("messages", {
        "conversation_id": body.conversationId,
        "sender_id": user.get("sub"),
        "body": body.body,
        "read": False,
        "created_at": _now(),
    })
    return msg


# ── Client: get unread count ──────────────────────────────────────────────────

@router.get("/client/chat/unread")
async def get_client_unread(user: dict = Depends(require_user)):
    client_id = user.get("sub")
    rows = await db_get(
        f"messages?client_id=eq.{client_id}&read=eq.false&select=id,conversation_id"
    )
    return {"unreads": rows}


# ── Client: reset unread for an org ──────────────────────────────────────────

@router.post("/client/chat/unread")
async def reset_client_unread(
    body: MarkUnreadRequest,
    user: dict = Depends(require_user),
):
    client_id = user.get("sub")
    convs = await db_get(
        f"conversations?client_id=eq.{client_id}&org_id=eq.{body.orgId}&select=id"
    )
    if convs:
        await db_patch(
            f"messages?conversation_id=eq.{convs[0]['id']}&read=eq.false",
            {"read": True},
        )
    return {"success": True}
