"""
app/core/sms.py — thin Twilio wrapper for outbound SMS and WhatsApp.

If TWILIO_* env vars are unset, the send_* functions raise so the caller
can return a clear 503 instead of a confusing crash. Keeps the dependency
on Twilio isolated to this module.
"""
from __future__ import annotations

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.core.config import get_settings


class SMSNotConfigured(RuntimeError):
    pass


class WhatsAppNotConfigured(RuntimeError):
    pass


def _twilio_client() -> Client:
    cfg = get_settings()
    if not (cfg.twilio_account_sid and cfg.twilio_auth_token):
        raise SMSNotConfigured(
            "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
        )
    return Client(cfg.twilio_account_sid, cfg.twilio_auth_token)


def send_sms(to: str, body: str) -> str:
    """Send an SMS. Returns the Twilio message SID. Raises on failure."""
    cfg = get_settings()
    if not cfg.twilio_from_number:
        raise SMSNotConfigured(
            "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "and TWILIO_FROM_NUMBER."
        )
    client = _twilio_client()
    try:
        message = client.messages.create(to=to, from_=cfg.twilio_from_number, body=body)
    except TwilioRestException as exc:
        raise RuntimeError(f"Twilio error {exc.code}: {exc.msg}") from exc
    return message.sid


def send_whatsapp(to: str, body: str) -> str:
    """Send a WhatsApp message. `to` should be a plain E.164 number; this
    function adds the `whatsapp:` prefix. Returns the Twilio message SID.
    Raises on failure.
    """
    cfg = get_settings()
    if not cfg.twilio_whatsapp_from_number:
        raise WhatsAppNotConfigured(
            "WhatsApp is not configured. Set TWILIO_WHATSAPP_FROM_NUMBER "
            "(include the 'whatsapp:' prefix)."
        )
    client = _twilio_client()
    to_addr = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    try:
        message = client.messages.create(
            to=to_addr,
            from_=cfg.twilio_whatsapp_from_number,
            body=body,
        )
    except TwilioRestException as exc:
        raise RuntimeError(f"Twilio error {exc.code}: {exc.msg}") from exc
    return message.sid
