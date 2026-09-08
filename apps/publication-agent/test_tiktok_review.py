"""Tests for TikTok review readiness; no network or platform mutation."""

from tiktok_review import evaluate_tiktok_review_readiness


def complete_config() -> dict:
    return {
        "app_name": "AUREA",
        "icon": True,
        "category": "Business",
        "description": "A platform that helps businesses manage and publish their original social content.",
        "terms_url": "https://example.com/terms",
        "privacy_url": "https://example.com/privacy",
        "platforms": ["web"],
        "redirect_uri": "https://example.com/oauth/tiktok/callback",
        "review_explanation": "The app lets authorized users connect their TikTok account and publish their own content from the app.",
        "demo_video": True,
        "end_to_end_demo": True,
        "products": ["login_kit", "content_posting_api"],
        "scopes": ["user.info.basic", "video.publish", "video.upload"],
        "direct_post_enabled": True,
        "audience": "public_users",
    }


def test_incomplete_configuration_is_blocked():
    result = evaluate_tiktok_review_readiness({})
    assert result["ready_for_submission"] is False
    assert "app_icon" in result["missing"]
    assert "product:login_kit" in result["missing"]
    assert "scope:video.publish" in result["missing"]
    assert result["approval_status"] == "unknown"
    assert result["publish_status"] == "not_attempted"


def test_complete_configuration_is_ready_but_not_approved():
    result = evaluate_tiktok_review_readiness(complete_config())
    assert result["ready_for_submission"] is True
    assert result["missing"] == []
    assert result["approval_status"] == "unknown"
    assert result["publish_status"] == "not_attempted"


def test_web_apps_need_a_redirect_uri():
    config = complete_config()
    config.pop("redirect_uri")
    result = evaluate_tiktok_review_readiness(config)
    assert "redirect_uri" in result["missing"]


def test_internal_only_use_is_a_blocker():
    config = complete_config()
    config["audience"] = "internal_users"
    result = evaluate_tiktok_review_readiness(config)
    assert "public_user_audience" in result["missing"]


def test_tiktok_brand_name_is_a_warning_not_an_approval_claim():
    config = complete_config()
    config["app_name"] = "TERRAZAS TikTok Publisher"
    result = evaluate_tiktok_review_readiness(config)
    assert "app_name_should_not_reference_tiktok" in result["warnings"]
    assert result["approval_status"] == "unknown"
