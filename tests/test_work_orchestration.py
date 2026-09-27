from apps.tool_expert_factory.contracts import Evidence, ExpertResult, ToolExpertProfile
from apps.tool_expert_factory.work_planner import WorkCellSpec, WorkPlanner
from apps.tool_expert_factory.work_cells import WorkCellRunner
from apps.tool_expert_factory.runtime import SpecialistRuntime


def test_planner_validates_dependencies():
    plan = WorkPlanner().plan(
        trace_id="trace-001",
        objective="execute workflow",
        cells=[
            WorkCellSpec("c1", "specialist-a", "first"),
            WorkCellSpec("c2", "specialist-b", "second", ("c1",)),
        ],
    )
    plan.validate()
    assert [c.cell_id for c in plan.cells] == ["c1", "c2"]


def test_cells_delegate_to_specialist_runtime_and_stop_on_block():
    audit = "/tmp/aurea-work-cells-audit.jsonl"
    runtime = SpecialistRuntime(audit)
    runner = WorkCellRunner(runtime)
    evidence = [Evidence("official", "official://test", "verified", True)]
    profiles = {
        "a": ToolExpertProfile("expert-a", "tool-a", "pack-a"),
        "b": ToolExpertProfile("expert-b", "tool-b", "pack-b"),
    }

    def ok(_request):
        return ExpertResult("expert-a", "trace-001", "EXECUTED", "done",
                            evidence=[evidence[0]])

    def blocked(_request):
        return ExpertResult("expert-b", "trace-001", "BLOCKED", "blocked",
                            blockers=["test_blocker"])

    plan = WorkPlanner().plan(
        trace_id="trace-001", objective="workflow",
        cells=[
            WorkCellSpec("c1", "a", "first"),
            WorkCellSpec("c2", "b", "second", ("c1",)),
        ],
    )
    results = runner.execute(plan, profiles, evidence, {"a": ok, "b": blocked})
    assert [r.cell_id for r in results] == ["c1", "c2"]
    assert results[0].result.status == "EXECUTED"
    assert results[1].result.status == "BLOCKED"
