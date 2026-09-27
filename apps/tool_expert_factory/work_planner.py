"""AUREA Work Planner V1.

Plans are deterministic orchestration units. The planner does not execute tools;
it decomposes one objective into ordered logical work cells.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WorkCellSpec:
    cell_id: str
    specialist_id: str
    objective: str
    depends_on: tuple[str, ...] = ()


@dataclass(frozen=True)
class WorkPlan:
    trace_id: str
    objective: str
    cells: tuple[WorkCellSpec, ...]

    def validate(self) -> None:
        ids = {cell.cell_id for cell in self.cells}
        if len(ids) != len(self.cells):
            raise ValueError("duplicate_work_cell_id")
        for cell in self.cells:
            if any(dep not in ids for dep in cell.depends_on):
                raise ValueError(f"unknown_work_cell_dependency:{cell.cell_id}")


class WorkPlanner:
    def plan(self, *, trace_id: str, objective: str, cells: list[WorkCellSpec]) -> WorkPlan:
        if not objective.strip():
            raise ValueError("objective_required")
        plan = WorkPlan(trace_id=trace_id, objective=objective, cells=tuple(cells))
        plan.validate()
        return plan
