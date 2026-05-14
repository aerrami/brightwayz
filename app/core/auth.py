"""
app/core/auth.py — FastAPI dependencies for authentication.

Two dependency types:
  • require_user  — validates Supabase JWT, returns decoded payload.
                    Used on all /data/* routes.
  • optional_user — same but returns None if no token present.
                    Used on routes that are public but can be personalised.
"""
from __future__ import annotations

from typing import Optional

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


def _decode(token: str) -> dict:
    cfg = get_settings()
    try:
        return pyjwt.decode(
            token,
            cfg.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
        )
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )


async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """Raises 401 if no valid Supabase JWT is present."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode(credentials.credentials)


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict]:
    """Returns None for unauthenticated requests, decoded payload otherwise."""
    if not credentials:
        return None
    try:
        return _decode(credentials.credentials)
    except HTTPException:
        return None
