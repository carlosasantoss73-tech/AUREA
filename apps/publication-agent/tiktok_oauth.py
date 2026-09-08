"""Side-effect-free TikTok OAuth helpers for AUREA.

The module builds authorization requests and validates callback state locally. It does
not exchange tokens or publish content. Client secrets and user tokens must remain on
server-side infrastructure.
"""
from __future__ import annotations

import hashlib
import secrets
from urllib.parse import urlencode

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
    """Return the SHA-256 PKCE challenge used by TikTok desktop/mobile flows."""
    if not code_verifier:
        raise ValueError("code_verifier_required")
    return hashlib.sha256(code_verifier.encode("ascii")).hexdigest()
