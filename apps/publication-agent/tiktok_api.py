"""Minimal server-side TikTok Open API adapter.

Only read/prepare operations are exposed here. Direct-post initialization and upload
are intentionally not executed by this adapter until AUREA has an explicit production
approval checkpoint.
"""
from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/"


def query_creator_info(access_token: str, *, timeout: float = 15.0) -> dict:
    """Query TikTok's latest creator constraints for an authorized user."""
    if not access_token.strip():
        raise ValueError("access_token_required")
    request = Request(
        CREATOR_INFO_URL,
        data=b"{}",
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"tiktok_http_error:{exc.code}:{body[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"tiktok_network_error:{exc.reason}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("tiktok_invalid_response")
    return payload


def prepare_direct_post_metadata(
    *,
    title: str,
    privacy_level: str,
    disable_comment: bool,
    disable_duet: bool,
    disable_stitch: bool,
) -> dict:
    """Prepare user-editable Direct Post metadata without sending anything."""
    if not title.strip():
        raise ValueError("title_required")
    if not privacy_level.strip():
        raise ValueError("privacy_level_required")
    return {
        "title": title,
        "privacy_level": privacy_level,
        "disable_comment": disable_comment,
        "disable_duet": disable_duet,
        "disable_stitch": disable_stitch,
    }
