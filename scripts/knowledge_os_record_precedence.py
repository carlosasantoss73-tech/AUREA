"""Fail-closed aggregation for records repeated across Knowledge OS indexes."""

from __future__ import annotations

import re
from typing import Any


def _parse_index_version(value: Any) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool) and value > 0:
        return value
    if isinstance(value, str):
        match = re.fullmatch(r"v?(\d+)", value.strip(), re.IGNORECASE)
        if match:
            parsed = int(match.group(1))
            return parsed if parsed > 0 else None
    return None


def aggregate_records(chain_entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate a current-to-historical chain without allowing old records to win.

    `index_version` is the version of the index containing a record, not the
    record's own `version` field. Single occurrences need no precedence decision.
    Repeated IDs require unique, strictly descending index versions in traversal
    order; otherwise the ID is omitted and reported as unresolved.
    """
    occurrences: dict[str, list[dict[str, Any]]] = {}
    conflicts: list[dict[str, Any]] = []

    for chain_position, entry in enumerate(chain_entries):
        file_id = entry.get("file_id")
        index_version = _parse_index_version(entry.get("index_version"))
        records = entry.get("records")
        if not isinstance(file_id, str) or not file_id.strip() or not isinstance(records, list):
            conflicts.append({"reason": "INSUFFICIENT_INDEX_PROVENANCE", "chain_position": chain_position})
            continue

        for record_position, record in enumerate(records):
            record_id = record.get("id") if isinstance(record, dict) else None
            if not isinstance(record_id, str) or not record_id.strip():
                conflicts.append({
                    "reason": "INVALID_RECORD_ID",
                    "file_id": file_id,
                    "index_version": index_version,
                    "record_position": record_position,
                })
                continue
            occurrences.setdefault(record_id, []).append({
                "record": record,
                "file_id": file_id,
                "index_version": index_version,
                "chain_position": chain_position,
            })

    selected: dict[str, dict[str, Any]] = {}
    for record_id, candidates in occurrences.items():
        if len(candidates) == 1:
            selected[record_id] = candidates[0]
            continue

        versions = [candidate["index_version"] for candidate in candidates]
        if any(version is None for version in versions) or len(set(versions)) != len(versions):
            conflicts.append({"reason": "UNRESOLVED_PRECEDENCE", "record_id": record_id})
            continue

        # The chain is traversed from current to historical. Require the
        # repeated entries to respect that order instead of guessing on corrupt
        # or incomplete chain metadata.
        if any(left <= right for left, right in zip(versions, versions[1:])):
            conflicts.append({"reason": "INDEX_CHAIN_ORDER_CONFLICT", "record_id": record_id})
            continue

        latest = max(candidates, key=lambda candidate: candidate["index_version"])
        selected[record_id] = latest
        states = {candidate["record"].get("estado") for candidate in candidates}
        if len(states) > 1:
            conflicts.append({
                "reason": "RECORD_STATE_CONFLICT",
                "record_id": record_id,
                "selected_index_version": latest["index_version"],
                "observed_states": sorted(str(state) for state in states),
            })

    return {"records": selected, "conflicts": conflicts}
