from apps.tool_expert_factory.contracts import Evidence, ExpertResult, ToolExpertProfile
from apps.tool_expert_factory.super_agent import ToolAutomationSuperAgent
from apps.tool_expert_factory.work_planner import WorkCellSpec, WorkPlanner


def test_super_agent_executes_planned_cells_through_runtime(tmp_path):
    agent = ToolAutomationSuperAgent()
    evidence = [Evidence("official", "official://test", "verified", True)]
    profiles = {
        "research": ToolExpertProfile("expert-research", "research-tool", "pack"),
        "browser": ToolExpertProfile("expert-browser", "browser-tool", "pack"),
    }

    def research(_request):
        return ExpertResult(
            "expert-research", "trace-e2e-001", "EXECUTED", "research complete",
            evidence=[evidence[0]],
        )

    def browser(_request):
        return ExpertResult(
            "expert-browser", "trace-e2e-001", "EXECUTED", "browser complete",
            evidence=[evidence[0]],
        )

    plan = WorkPlanner().plan(
        trace_id="trace-e2e-001",
        objective="complete research and browser workflow",
        cells=[
            WorkCellSpec("C01", "research", "perform research"),
            WorkCellSpec("C02", "browser", "perform browser action", ("C01",)),
        ],
    )

    result = agent.execute_plan(
        plan=plan,
        profiles=profiles,
        authoritative_evidence=evidence,
        executors={"expert-research": research, "expert-browser": browser},
        audit_path=str(tmp_path / "audit.jsonl"),
    )

    assert result["DECISION"] == "WORKFLOW_EXECUTED"
    assert [item["status"] for item in result["EVIDENCIA"]] == ["EXECUTED", "EXECUTED"]


def test_super_agent_preserves_block_and_stops_dependent_cells(tmp_path):
    agent = ToolAutomationSuperAgent()
    evidence = [Evidence("official", "official://test", "verified", True)]
    profiles = {
        "a": ToolExpertProfile("expert-a", "tool-a", "pack"),
        "b": ToolExpertProfile("expert-b", "tool-b", "pack"),
        "c": ToolExpertProfile("expert-c", "tool-c", "pack"),
    }

    def ok(_request):
        return ExpertResult("expert-a", "trace-e2e-002", "EXECUTED", "done",
                            evidence=[evidence[0]])

    def blocked(_request):
        return ExpertResult("expert-b", "trace-e2e-002", "BLOCKED", "blocked",
                            blockers=["real_gate_block"])

    def should_not_run(_request):
        raise AssertionError("dependent cell executed after block")

    plan = WorkPlanner().plan(
        trace_id="trace-e2e-002",
        objective="fail closed workflow",
        cells=[
            WorkCellSpec("C01", "a", "first"),
            WorkCellSpec("C02", "b", "blocked"),
            WorkCellSpec("C03", "c", "must not run", ("C02",)),
        ],
    )

    result = agent.execute_plan(
        plan=plan,
        profiles=profiles,
        authoritative_evidence=evidence,
        executors={"expert-a": ok, "expert-b": blocked, "expert-c": should_not_run},
        audit_path=str(tmp_path / "audit.jsonl"),
    )

    assert result["DECISION"] == "STOP_AND_PRESERVE_EVIDENCE"
    assert [item["status"] for item in result["EVIDENCIA"]] == ["EXECUTED", "BLOCKED"]
