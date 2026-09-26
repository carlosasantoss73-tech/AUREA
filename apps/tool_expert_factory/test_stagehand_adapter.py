from __future__ import annotations

import json
from unittest.mock import patch

from .contracts import ExpertRequest
from .stagehand_adapter import execute_stagehand


def test_stagehand_adapter_maps_verified_audit_to_executed():
    payload = {
        "status": "VERIFIED",
        "result": "Stagehand executed and verified.",
        "steps": [
            {"step": "FINAL_INDEPENDENT_VERIFICATION", "status": "VERIFIED",
             "evidence": {"todo_count": 2, "first": True, "second": True}}
        ],
    }

    class Completed:
        returncode = 0
        stdout = json.dumps(payload)
        stderr = ""

    with patch("subprocess.run", return_value=Completed()):
        result = execute_stagehand(
            ExpertRequest(
                expert_id="AUREA-STAGEHAND-EXPERT-V1",
                objective="Create and verify two TodoMVC tasks.",
                trace_id="stagehand-test-001",
            )
        )

    assert result.status == "EXECUTED"
    assert result.evidence
    assert result.expert_id == "AUREA-STAGEHAND-EXPERT-V1"
    assert result.trace_id == "stagehand-test-001"


def test_stagehand_adapter_fails_closed_on_unverified_result():
    payload = {"status": "BLOCKED", "blocker": "provider_quota"}

    class Completed:
        returncode = 1
        stdout = json.dumps(payload)
        stderr = ""

    with patch("subprocess.run", return_value=Completed()):
        result = execute_stagehand(
            ExpertRequest(
                expert_id="AUREA-STAGEHAND-EXPERT-V1",
                objective="Create and verify two TodoMVC tasks.",
                trace_id="stagehand-test-002",
            )
        )

    assert result.status == "BLOCKED"
    assert result.blockers == ["provider_quota"]
