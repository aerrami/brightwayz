"""
app/routers/sms.py — outbound SMS to clients (staff-only).

Looks up the client to get their phone, then sends via Twilio. Doesn't
persist the message yet — Twilio's own dashboard is the source of truth
for delivery. Add a sms_log table later if you need in-app history.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_user
from app.core.sms import send_sms, SMSNotConfigured
from app.core.supabase import db_get_one
from app.models.schemas import SendSMSRequest, SendSMSResponse

router = APIRouter(prefix="/data", tags=["sms"])


@router.post("/sms/send", response_model=SendSMSResponse)
async def send_client_sms(
    body: SendSMSRequest,
    _user: dict = Depends(require_user),
):
    client = await db_get_one(f"clients?id=eq.{body.clientId}&select=id,phone")
    phone = (client.get("phone") or "").strip()
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Client has no phone number on file.",
        )
    try:
        sid = send_sms(phone, body.body)
    except SMSNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return SendSMSResponse(success=True, messageSid=sid)
