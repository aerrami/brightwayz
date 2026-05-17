"""
app/core/notifications.py — outbound notifications for CRM events.

Email is delivered via Resend's HTTP API (no SDK dependency). SMS is
intentionally stub-only on this branch — the Twilio client lives in
feature/2-texting; if that branch is merged alongside this one, swap
the log call below for `app.core.sms.send_sms`.

Every notifier is **failure-tolerant**: send errors are logged and
swallowed so a flaky third-party provider can't break a status update.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


STATUS_TEMPLATES: dict[str, tuple[str, str]] = {
    "open": (
        "We received your request",
        "Hi {name},\n\nThanks for reaching out to Brightwayz. We've received your request and a case manager will be in touch soon.\n\n— Brightwayz",
    ),
    "assigned": (
        "A case manager has been assigned",
        "Hi {name},\n\nGood news — a case manager has been assigned to your request and will reach out shortly.\n\n— Brightwayz",
    ),
    "in_progress": (
        "Your request is in progress",
        "Hi {name},\n\nWe're actively working on your request. We'll keep you posted as things move forward.\n\n— Brightwayz",
    ),
    "resolved": (
        "Your request has been resolved",
        "Hi {name},\n\nWe've resolved your request. If you need anything else, just reply or submit a new request anytime.\n\n— Brightwayz",
    ),
    "closed": (
        "Your case is now closed",
        "Hi {name},\n\nYour case with Brightwayz is now closed. Thank you for working with us — we're always here if you need help again.\n\n— Brightwayz",
    ),
}


def _send_email(to: str, subject: str, text: str) -> Optional[str]:
    cfg = get_settings()
    if not cfg.resend_api_key:
        logger.info("EMAIL (stub, no RESEND_API_KEY) → %s | %s", to, subject)
        return None
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {cfg.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": cfg.notification_from_email,
                "to": [to],
                "subject": subject,
                "text": text,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json().get("id")
    except Exception as exc:
        logger.warning("EMAIL send failed → %s: %s", to, exc)
        return None


def _send_sms(to: str, text: str) -> Optional[str]:
    # Twilio is on the feature/2-texting branch — keep this a stub so the two
    # feature branches stay independent. If both are merged, call
    # `app.core.sms.send_sms(to, text)` here.
    logger.info("SMS (stub, F2 not merged) → %s | %s", to, text[:60])
    return None


def notify_case_status_change(
    status: str,
    client_first_name: str,
    client_email: Optional[str],
    client_phone: Optional[str],
) -> dict:
    """Send the templated notification for a status transition.

    Returns a dict summarising what was attempted/sent so the caller can
    surface it to the user (e.g. "email sent, sms stubbed").
    """
    template = STATUS_TEMPLATES.get(status)
    if not template:
        return {"sent": False, "reason": f"no template for status '{status}'"}

    subject, body = template
    text = body.format(name=client_first_name or "there")

    result = {"email": None, "sms": None}
    if client_email:
        result["email"] = _send_email(client_email, subject, text) or "logged"
    if client_phone:
        result["sms"] = _send_sms(client_phone, f"{subject}\n\n{text}") or "logged"
    return result
