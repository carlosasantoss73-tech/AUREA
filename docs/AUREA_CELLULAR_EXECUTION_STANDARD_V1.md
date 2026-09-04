# AUREA — Cellular Execution Standard V1

Date: 2026-09-04
Status: OPERATING STANDARD

## Purpose

Define the standard for advancing AUREA through parallel Work Cells without sacrificing integration, evidence, governance or regression control.

## Cell classes

### Constructive
Builds a bounded capability or correction.

### Verifying
Attempts to invalidate the constructive result with negative, boundary, recovery and regression tests.

### Integrating
Connects independently verified capabilities through an explicit contract and end-to-end evidence.

## Parallelization rule

Independent cells may execute concurrently. A cell with a dependency must wait for the dependency's verified output. Parallel work must not duplicate a protected subsystem, create conflicting sources of truth, or bypass authorization.

## Mandatory cell closure

Every cell must produce:

1. Result.
2. Evidence.
3. Decision.
4. Known limitations.
5. Learning/correction.
6. Reuse rule for the next iteration.
7. Next action.

## Anti-regression gate

Before merge, verify that the change:

- reuses existing contracts where possible;
- preserves deny-by-default security;
- preserves trace/evidence;
- does not silently broaden authority;
- does not create a second runtime, memory store, or source of truth;
- has focused tests;
- has CI evidence;
- does not modify protected Knowledge OS or `INDICE_MAESTRO_v007` without explicit authorization.

## Current convergence target

`Objective -> Decision -> Plan -> Work Cell -> Knowledge + Authority + Provider -> Admission -> Execution -> Result -> Telemetry + Evidence -> Sentinel -> QA -> Audit -> Recovery/Learning -> Closure -> Next Action`

## Operating principle

Speed is measured by verified convergence, not by commit count. A failed or blocked cell is useful evidence when it prevents an unsafe merge.
