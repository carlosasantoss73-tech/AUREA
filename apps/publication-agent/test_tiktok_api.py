"""Deterministic tests for the read-only TikTok adapter."""

import pytest

from tiktok_api import prepare_direct_post_metadata


def test_metadata_is_prepared_without_side_effects():
    result = prepare_direct_post_metadata(
        title="Mi publicación",
        privacy_level="SELF_ONLY",
        disable_comment=False,
        disable_duet=True,
        disable_stitch=True,
    )
    assert result["title"] == "Mi publicación"
    assert result["privacy_level"] == "SELF_ONLY"
    assert result["disable_duet"] is True


def test_metadata_requires_explicit_user_values():
    with pytest.raises(ValueError, match="title_required"):
        prepare_direct_post_metadata(
            title="",
            privacy_level="SELF_ONLY",
            disable_comment=False,
            disable_duet=False,
            disable_stitch=False,
        )

    with pytest.raises(ValueError, match="privacy_level_required"):
        prepare_direct_post_metadata(
            title="Title",
            privacy_level="",
            disable_comment=False,
            disable_duet=False,
            disable_stitch=False,
        )
