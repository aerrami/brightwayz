"""
app/core/supabase.py — thin async wrapper around the Supabase REST API.

All database operations go through here so that:
  • Auth is handled in one place (service role key for server-side ops).
  • Errors surface as HTTPExceptions with meaningful messages.
  • The client is shared across the app lifetime (single httpx.AsyncClient).
"""
from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client


def _headers(token: str | None = None) -> dict[str, str]:
    cfg = get_settings()
    auth = token or cfg.supabase_service_role_key
    return {
        "apikey": cfg.supabase_service_role_key,
        "Authorization": f"Bearer {auth}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _url(path: str) -> str:
    return f"{get_settings().supabase_url}/rest/v1/{path}"


def _raise(r: httpx.Response) -> None:
    if not r.is_success:
        try:
            detail = r.json().get("message", r.text)
        except Exception:
            detail = r.text
        raise HTTPException(status_code=r.status_code, detail=detail)


async def db_get(path: str) -> list | dict:
    r = await get_client().get(_url(path), headers=_headers())
    _raise(r)
    return r.json()


async def db_get_one(path: str) -> dict:
    rows = await db_get(path)
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return rows[0] if isinstance(rows, list) else rows


async def db_post(table: str, payload: dict) -> dict:
    r = await get_client().post(_url(table), json=payload, headers=_headers())
    _raise(r)
    rows = r.json()
    return rows[0] if isinstance(rows, list) and rows else rows


async def db_patch(path: str, payload: dict) -> dict:
    r = await get_client().patch(_url(path), json=payload, headers=_headers())
    _raise(r)
    rows = r.json()
    return rows[0] if isinstance(rows, list) and rows else {}


async def db_delete(path: str) -> bool:
    r = await get_client().delete(_url(path), headers=_headers())
    _raise(r)
    return True
