from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.tool_expert_factory.contracts import Evidence, ExpertResult
from apps.tool_expert_factory.runtime import SpecialistRuntime
import factory_bridge


def test_bridge_has_authoritative_official_evidence():
    assert factory_bridge.OFFICIAL_EVIDENCE
    assert all(e.authoritative for e in factory_bridge.OFFICIAL_EVIDENCE)


def test_bridge_uses_generic_runtime_for_execution(monkeypatch, tmp_path):
    calls = []

    class FakeAdapter:
        def __init__(self, settings):
            pass

        def execute(self, *, prompt, system_instruction):
            return type("R", (), {
                "interaction_id": "interaction-test-1",
                "output_text": "ok",
                "model": "gemini-3.8-flash",
            })()

    monkeypatch.setattr(factory_bridge, "GeminiAdapter", FakeAdapter)
    monkeypatch.setenv("AUREA_GEMINI_FACTORY_AUDIT_PATH", str(tmp_path / "audit.jsonl"))
    monkeypatch.setenv(
        "AUREA_GEMINI_KNOWLEDGE_PATH",
        str(ROOT / "docs/AUREA-GEMINI-EXPERT-KNOWLEDGE-PACK-V2.md"),
    )
    result = factory_bridge.execute_and_verify("read-only test")
    assert result.status == "VERIFIED"
    assert result.trace_id.startswith("factory-")
    assert len((tmp_path / "audit.jsonl").read_text().splitlines()) == 2


