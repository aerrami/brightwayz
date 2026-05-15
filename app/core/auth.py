"""
app/core/auth.py — FastAPI dependencies for authentication.

Supports both Supabase signing modes:
  • ES256 (current default for new projects, via JWT Signing Keys + JWKS)
  • HS256 (legacy shared-secret mode, also used by the test suite)

The JWT header's `alg` field selects which path is taken. The JWKS is
fetched lazily and cached by PyJWKClient.

Two dependency types:
  • require_user  — validates Supabase JWT, returns decoded payload.
                    Used on all /data/* routes.
  • optional_user — same but returns None if no token present.
                    Used on routes that are public but can be personalised.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

import jwt as pyjwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    cfg = get_settings()
    return PyJWKClient(
        f"{cfg.supabase_url}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        max_cached_keys=8,
    )


def _decode(token: str) -> dict:
    cfg = get_settings()
    try:
        header = pyjwt.get_unverified_header(token)
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    alg = header.get("alg", "")
    try:
        if alg == "HS256":
            return pyjwt.decode(
                token,
                cfg.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        signing_key = _jwks_client().get_signing_key_from_jwt(token).key
        return pyjwt.decode(
            token,
            signing_key,
            algorithms=[alg],
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
