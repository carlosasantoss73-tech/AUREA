from __future__ import annotations
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from config import Settings
from expert import load_knowledge

def test_knowledge_pack_exists_and_is_nonempty() -> None:
    settings = Settings(knowledge_path=str(Path(__file__).parents[3] / "docs/AUREA-GEMINI-EXPERT-KNOWLEDGE-PACK-V2.md"))
    content = load_knowledge(settings)
    assert "NOT PROOF OF LIVE EXECUTION" in content
    assert "Readiness gate" in content

def test_secret_is_not_in_settings_object() -> None:
    settings = Settings()
    assert not hasattr(settings, "api_key")

def test_fail_closed_without_secret(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    settings = Settings()
    try:
        settings.require_api_key()
    except RuntimeError as exc:
        assert str(exc) == "missing_secret:GEMINI_API_KEY"
    else:
        raise AssertionError("missing secret must block")
