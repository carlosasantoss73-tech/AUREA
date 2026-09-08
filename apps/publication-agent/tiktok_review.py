"""TikTok app-review readiness checks for AUREA's publication agent.

This module is intentionally deterministic and side-effect free. It validates the
configuration that a human or platform adapter has supplied; it never claims that
TikTok has approved an app or granted an API scope.
"""
from __future__ import annotations

from typing import Any


# AUREA's first production path is web OAuth + Direct Post. Do not request the
# Upload API scope unless that separate draft-upload capability is actually needed.
REQUIRED_PRODUCTS = ("login_kit", "content_posting_api")
REQUIRED_SCOPES = ("user.info.basic", "video.publish")


def evaluate_tiktok_review_readiness(config: dict[str, Any]) -> dict[str, Any]:
    """Return evidence-based blockers for a TikTok app-review submission.

    Configuration is not approval. The function deliberately reports approval as
    unknown until TikTok itself provides evidence of approval/live access.
    """
    missing: list[str] = []
    warnings: list[str] = []

    required_fields = {
        "icon": "app_icon",
        "category": "category",
        "description": "description",
        "terms_url": "terms_url",
        "privacy_url": "privacy_url",
        "platforms": "platforms",
        "review_explanation": "review_explanation",
        "demo_video": "demo_video",
    }
    for field, label in required_fields.items():
        value = config.get(field)
        if not value or (isinstance(value, (list, tuple, set)) and not value):
            missing.append(label)

    products = set(config.get("products", ()))
    scopes = set(config.get("scopes", ()))

    for product in REQUIRED_PRODUCTS:
        if product not in products:
            missing.append(f"product:{product}")

    for scope in REQUIRED_SCOPES:
        if scope not in scopes:
            missing.append(f"scope:{scope}")

    platforms = set(config.get("platforms", ()))
    if "web" in platforms and not config.get("redirect_uri"):
        missing.append("redirect_uri")

    if not config.get("direct_post_enabled"):
        missing.append("direct_post_enabled")

    app_name = str(config.get("app_name", "")).strip()
    if not app_name:
        missing.append("app_name")
    if any(term in app_name.lower() for term in ("tiktok", "tik tok")):
        warnings.append("app_name_should_not_reference_tiktok")

    # Direct Post is not intended to be a private utility for accounts managed by
    # the developer/team. A production design must serve genuine authorized users.
    if config.get("audience") != "public_users":
        missing.append("public_user_audience")

    if not config.get("end_to_end_demo"):
        missing.append("end_to_end_demo")

    return {
        "ready_for_submission": not missing,
        "missing": sorted(set(missing)),
        "warnings": sorted(set(warnings)),
        "evidence_status": "configuration_check_only",
        "approval_status": "unknown",
        "publish_status": "not_attempted",
    }
