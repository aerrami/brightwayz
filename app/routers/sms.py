"""
app/routers/sms.py — outbound SMS and WhatsApp to clients (staff-only).

Looks up the client to get their phone, then sends via Twilio. Doesn't
persist messages yet — Twilio's own dashboard is the source of truth
for delivery. Add a sms_log table later if you need in-app history.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_user
from app.core.sms import (
    send_sms,
    send_whatsapp,
    SMSNotConfigured,
    WhatsAppNotConfigured,
)
from app.core.supabase import db_get_one
from app.models.schemas import (
    SendSMSRequest,
    SendSMSResponse,
    SendWhatsAppRequest,
    SendWhatsAppResponse,
)

router = APIRouter(prefix="/data", tags=["sms"])


async def _phone_for(client_id: str) -> str:
    client = await db_get_one(f"clients?id=eq.{client_id}&select=id,phone")
    phone = (client.get("phone") or "").strip()
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Client has no phone number on file.",
        )
    return phone


@router.post("/sms/send", response_model=SendSMSResponse)
async def send_client_sms(
    body: SendSMSRequest,
    _user: dict = Depends(require_user),
):
    phone = await _phone_for(body.clientId)
    try:
        sid = send_sms(phone, body.body)
    except SMSNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return SendSMSResponse(success=True, messageSid=sid)


@router.post("/whatsapp/send", response_model=SendWhatsAppResponse)
async def send_client_whatsapp(
    body: SendWhatsAppRequest,
    _user: dict = Depends(require_user),
):
    phone = await _phone_for(body.clientId)
    try:
        sid = send_whatsapp(phone, body.body)
    except (WhatsAppNotConfigured, SMSNotConfigured) as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return SendWhatsAppResponse(success=True, messageSid=sid)
