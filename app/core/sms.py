"""
app/core/sms.py — thin Twilio wrapper for outbound SMS.

If TWILIO_* env vars are unset, send_sms() raises so the caller can
return a clear 503 instead of a confusing crash. Keeps the dependency
on Twilio isolated to this module.
"""
from __future__ import annotations

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.core.config import get_settings


class SMSNotConfigured(RuntimeError):
    pass


def _client() -> tuple[Client, str]:
    cfg = get_settings()
    if not (cfg.twilio_account_sid and cfg.twilio_auth_token and cfg.twilio_from_number):
        raise SMSNotConfigured(
            "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "and TWILIO_FROM_NUMBER."
        )
    return Client(cfg.twilio_account_sid, cfg.twilio_auth_token), cfg.twilio_from_number


def send_sms(to: str, body: str) -> str:
    """Send an SMS. Returns the Twilio message SID. Raises on failure."""
    client, from_number = _client()
    try:
        message = client.messages.create(to=to, from_=from_number, body=body)
    except TwilioRestException as exc:
        raise RuntimeError(f"Twilio error {exc.code}: {exc.msg}") from exc
    return message.sid
