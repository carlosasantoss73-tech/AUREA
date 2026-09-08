"""Deterministic tests for TikTok OAuth request construction."""

import pytest

from tiktok_oauth import build_authorization_url, new_state, pkce_challenge, verify_state


def test_authorization_url_uses_current_v2_endpoint_and_scopes():
    state = new_state()
    url = build_authorization_url(
        client_key="client-key",
        redirect_uri="https://example.com/oauth/tiktok/callback",
        scopes=("user.info.basic", "video.publish"),
        state=state,
    )
    assert url.startswith("https://www.tiktok.com/v2/auth/authorize/?")
    assert "client_key=client-key" in url
    assert "response_type=code" in url
    assert "scope=user.info.basic%2Cvideo.publish" in url
    assert "state=" in url


def test_state_comparison_rejects_mismatch():
    assert verify_state("abc", "abc") is True
    assert verify_state("abc", "abd") is False
    assert verify_state("", "abc") is False


def test_web_redirect_requires_https():
    with pytest.raises(ValueError, match="redirect_uri_must_be_https"):
        build_authorization_url(
            client_key="client-key",
            redirect_uri="http://example.com/callback",
            state="state",
        )


def test_pkce_challenge_is_deterministic():
    assert pkce_challenge("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
