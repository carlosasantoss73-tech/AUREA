"""Server-side TikTok Content Posting API adapter for AUREA.

The adapter keeps platform side effects explicit. It supports creator inspection,
Direct Post initialization/export, draft-upload initialization/export, and status
verification. Tokens are accepted only as runtime secrets and are never returned.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/"
DIRECT_POST_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/"
UPLOAD_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024


def _json_request(url: str, access_token: str, payload: dict, *, timeout: float = 30.0) -> dict:
    if not access_token.strip():
        raise ValueError("access_token_required")
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"tiktok_http_error:{exc.code}:{detail[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"tiktok_network_error:{exc.reason}") from exc
    if not isinstance(body, dict):
        raise RuntimeError("tiktok_invalid_response")
    error = body.get("error", {})
    if isinstance(error, dict) and error.get("code") not in (None, "", "ok"):
        raise RuntimeError(f"tiktok_api_error:{error.get('code')}:{error.get('message', '')[:300]}")
    return body


def query_creator_info(access_token: str, *, timeout: float = 15.0) -> dict:
    """Query TikTok's latest creator constraints for an authorized user."""
    return _json_request(CREATOR_INFO_URL, access_token, {}, timeout=timeout)


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


def _video_source(video_path: str, chunk_size: int) -> dict:
    path = Path(video_path)
    if not path.is_file():
        raise FileNotFoundError(video_path)
    size = path.stat().st_size
    if size <= 0:
        raise ValueError("video_empty")
    if chunk_size < 5 * 1024 * 1024 or chunk_size > 64 * 1024 * 1024:
        raise ValueError("chunk_size_out_of_range")
    actual_chunk = min(chunk_size, size)
    return {
        "source": "FILE_UPLOAD",
        "video_size": size,
        "chunk_size": actual_chunk,
        "total_chunk_count": math.ceil(size / actual_chunk),
    }


def initialize_video_upload(
    access_token: str,
    *,
    video_path: str,
    mode: str = "direct_post",
    title: str = "",
    privacy_level: str = "SELF_ONLY",
    disable_comment: bool = False,
    disable_duet: bool = False,
    disable_stitch: bool = False,
    brand_organic_toggle: bool = True,
    is_aigc: bool = False,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> dict:
    """Initialize a TikTok video export and return only non-secret response metadata."""
    source_info = _video_source(video_path, chunk_size)
    if mode not in {"direct_post", "upload_draft"}:
        raise ValueError("unsupported_mode")
    if mode == "upload_draft":
        payload = {"source_info": source_info}
        endpoint = UPLOAD_INIT_URL
    else:
        if not title.strip():
            raise ValueError("title_required")
        if not privacy_level.strip():
            raise ValueError("privacy_level_required")
        payload = {
            "post_info": {
                "title": title,
                "privacy_level": privacy_level,
                "disable_duet": disable_duet,
                "disable_comment": disable_comment,
                "disable_stitch": disable_stitch,
                "brand_organic_toggle": brand_organic_toggle,
                "is_aigc": is_aigc,
            },
            "source_info": source_info,
        }
        endpoint = DIRECT_POST_INIT_URL
    return _json_request(endpoint, access_token, payload)


def upload_video(upload_url: str, video_path: str, *, chunk_size: int = DEFAULT_CHUNK_SIZE) -> dict:
    """Transfer a local video to TikTok using the upload URL returned by initialization."""
    if not upload_url.startswith("https://"):
        raise ValueError("upload_url_must_be_https")
    path = Path(video_path)
    if not path.is_file():
        raise FileNotFoundError(video_path)
    size = path.stat().st_size
    if size <= 0:
        raise ValueError("video_empty")
    actual_chunk = min(chunk_size, size)
    with path.open("rb") as handle:
        offset = 0
        while offset < size:
            data = handle.read(actual_chunk)
            end = offset + len(data) - 1
            request = Request(
                upload_url,
                data=data,
                method="PUT",
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Length": str(len(data)),
                    "Content-Range": f"bytes {offset}-{end}/{size}",
                },
            )
            try:
                with urlopen(request, timeout=120.0) as response:
                    response.read()
            except HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"tiktok_upload_error:{exc.code}:{detail[:300]}") from exc
            except URLError as exc:
                raise RuntimeError(f"tiktok_network_error:{exc.reason}") from exc
            offset = end + 1
    return {"status": "uploaded_to_tiktok", "video_size": size}


def fetch_publish_status(access_token: str, publish_id: str) -> dict:
    """Fetch TikTok's current processing status for a publish/upload id."""
    if not publish_id.strip():
        raise ValueError("publish_id_required")
    return _json_request(STATUS_URL, access_token, {"publish_id": publish_id})
