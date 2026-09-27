"""AUREA logical Work Cell execution layer."""
from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Mapping, Sequence, Callable

from .contracts import Evidence, ExpertRequest, ExpertResult, ToolExpertProfile
from .runtime import SpecialistRuntime
from .work_planner import WorkPlan, WorkCellSpec


@dataclass(frozen=True)
class WorkCellResult:
    cell_id: str
    specialist_id: str
    result: ExpertResult


class WorkCellRunner:
    """Executes planned cells through the existing SpecialistRuntime.

    Cells are logical orchestration units, not independent agents.
    """

    def __init__(self, runtime: SpecialistRuntime):
        self.runtime = runtime

    def execute(
        self,
        plan: WorkPlan,
        profiles: Mapping[str, ToolExpertProfile],
        authoritative_evidence: Sequence[Evidence],
        executors: Mapping[str, Callable],
    ) -> tuple[WorkCellResult, ...]:
        plan.validate()
        completed: set[str] = set()
        results: list[WorkCellResult] = []

        for cell in plan.cells:
            if not set(cell.depends_on).issubset(completed):
                raise RuntimeError(f"work_cell_dependency_not_completed:{cell.cell_id}")

            profile = profiles.get(cell.specialist_id)
            if profile is None:
                raise RuntimeError(f"specialist_profile_missing:{cell.specialist_id}")
            executor = executors.get(profile.expert_id)
            if executor is None:
                raise RuntimeError(f"specialist_executor_missing:{profile.expert_id}")

            request = ExpertRequest(
                expert_id=profile.expert_id,
                objective=cell.objective,
                trace_id=plan.trace_id,
                mutation_allowed=False,
            )
            result = self.runtime.execute(
                profile, request, authoritative_evidence, executor
            )
            results.append(WorkCellResult(cell.cell_id, cell.specialist_id, result))

            if result.status == "BLOCKED":
                break
            completed.add(cell.cell_id)

        return tuple(results)
