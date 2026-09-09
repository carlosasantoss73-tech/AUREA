"""TikTok OAuth helpers for AUREA.

Authorization codes, client secrets, access tokens, and refresh tokens must remain
server-side. This module never logs or returns secret values beyond the token response
needed internally by the adapter.
"""
from __future__ import annotations

import hashlib
import secrets
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

AUTHORIZATION_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"


def new_state() -> str:
    """Create an unpredictable CSRF state value."""
    return secrets.token_urlsafe(32)


def build_authorization_url(
    *,
    client_key: str,
    redirect_uri: str,
    scopes: tuple[str, ...] = ("user.info.basic", "video.publish"),
    state: str,
) -> str:
    """Build TikTok's current web OAuth v2 authorization URL."""
    if not client_key.strip():
        raise ValueError("client_key_required")
    if not redirect_uri.startswith("https://"):
        raise ValueError("redirect_uri_must_be_https")
    if not state.strip():
        raise ValueError("state_required")
    if not scopes:
        raise ValueError("scope_required")
    query = urlencode(
        {
            "client_key": client_key,
            "response_type": "code",
            "scope": ",".join(scopes),
            "redirect_uri": redirect_uri,
            "state": state,
        }
    )
    return f"{AUTHORIZATION_URL}?{query}"


def verify_state(expected: str, received: str) -> bool:
    """Constant-time comparison for OAuth callback state."""
    return bool(expected) and bool(received) and secrets.compare_digest(expected, received)


def pkce_challenge(code_verifier: str) -> str:
    """Return the hex SHA-256 PKCE challenge used by TikTok desktop/mobile flows."""
    if not code_verifier:
        raise ValueError("code_verifier_required")
    return hashlib.sha256(code_verifier.encode("ascii")).hexdigest()


def exchange_code_for_tokens(
    *,
    client_key: str,
    client_secret: str,
    code: str,
    redirect_uri: str,
    code_verifier: str | None = None,
    timeout: float = 20.0,
) -> dict:
    """Exchange an authorization code server-side for TikTok user tokens."""
    for value, name in ((client_key, "client_key"), (client_secret, "client_secret"), (code, "code"), (redirect_uri, "redirect_uri")):
        if not value.strip():
            raise ValueError(f"{name}_required")
    form = {
        "client_key": client_key,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    if code_verifier:
        form["code_verifier"] = code_verifier
    body = urlencode(form).encode("utf-8")
    request = Request(
        TOKEN_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - network boundary
        raise RuntimeError(f"tiktok_token_exchange_failed:{type(exc).__name__}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("tiktok_invalid_token_response")
    if payload.get("error"):
        raise RuntimeError(f"tiktok_token_error:{payload.get('error')}")
    if not payload.get("access_token") or not payload.get("refresh_token"):
        raise RuntimeError("tiktok_token_response_missing_tokens")
    return payload
