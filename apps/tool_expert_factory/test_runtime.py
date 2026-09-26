from pathlib import Path
from apps.tool_expert_factory.contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile
from apps.tool_expert_factory.runtime import SpecialistRuntime

def profile():
    return ToolExpertProfile("TEST-EXPERT", "test", "docs/test.md")

def authoritative():
    return [Evidence("official-doc", "official", "current", authoritative=True)]

def test_runtime_executes_and_audits(tmp_path: Path):
    runtime = SpecialistRuntime(str(tmp_path / "audit.jsonl"))
    request = ExpertRequest("TEST-EXPERT", "diagnose", "trace-1")
    def executor(req):
        return ExpertResult(req.expert_id, req.trace_id, "EXECUTED", "diagnosis complete",
                            evidence=[Evidence("runtime", "test-adapter", "execution evidence")])
    result = runtime.execute(profile(), request, authoritative(), executor)
    assert result.status == "EXECUTED"
    assert len((tmp_path / "audit.jsonl").read_text().splitlines()) == 1

def test_runtime_verifies_with_authoritative_evidence(tmp_path: Path):
    runtime = SpecialistRuntime(str(tmp_path / "audit.jsonl"))
    request = ExpertRequest("TEST-EXPERT", "diagnose", "trace-2")
    executed = ExpertResult("TEST-EXPERT", "trace-2", "EXECUTED", "done",
                            evidence=[Evidence("runtime", "adapter", "execution")])
    verified = runtime.verify(profile(), request, executed,
                              [Evidence("verification", "official-system", "post-state confirmed", authoritative=True)])
    assert verified.status == "VERIFIED"
    assert any(e.authoritative for e in verified.evidence)

def test_runtime_blocks_without_official_gate(tmp_path: Path):
    runtime = SpecialistRuntime(str(tmp_path / "audit.jsonl"))
    request = ExpertRequest("TEST-EXPERT", "diagnose", "trace-3")
    def should_not_run(_):
        raise AssertionError("executor must not run when gate blocks")
    result = runtime.execute(profile(), request, [], should_not_run)
    assert result.status == "BLOCKED"

def test_runtime_fail_closed_on_executor_error(tmp_path: Path):
    runtime = SpecialistRuntime(str(tmp_path / "audit.jsonl"))
    request = ExpertRequest("TEST-EXPERT", "diagnose", "trace-4")
    def broken(_):
        raise RuntimeError("boom")
    result = runtime.execute(profile(), request, authoritative(), broken)
    assert result.status == "BLOCKED"
    assert result.blockers == ["executor_error:RuntimeError"]
