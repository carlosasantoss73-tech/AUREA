from __future__ import annotations

import json
from unittest.mock import patch

from .browser_use_adapter import execute_browser_use
from .contracts import ExpertRequest


def test_browser_use_adapter_maps_verified_audit_to_executed():
    payload = {
        "tool": "browser-use",
        "status": "VERIFIED",
        "evidence": {
            "is_done": True,
            "is_successful": True,
            "final_result": "Todo verified.",
        },
    }

    class Completed:
        returncode = 0
        stdout = json.dumps(payload)
        stderr = ""

    with patch("subprocess.run", return_value=Completed()):
        result = execute_browser_use(
            ExpertRequest(
                expert_id="AUREA-BROWSER-USE-EXPERT-V1",
                objective="Create and verify one TodoMVC task.",
                trace_id="browser-use-test-001",
            )
        )

    assert result.status == "EXECUTED"
    assert result.evidence
    assert result.expert_id == "AUREA-BROWSER-USE-EXPERT-V1"
    assert result.trace_id == "browser-use-test-001"


def test_browser_use_adapter_fails_closed_on_missing_key():
    payload = {
        "tool": "browser-use",
        "status": "BLOCKED",
        "blocker": "browser_use_api_key_missing",
    }

    class Completed:
        returncode = 2
        stdout = json.dumps(payload)
        stderr = ""

    with patch("subprocess.run", return_value=Completed()):
        result = execute_browser_use(
            ExpertRequest(
                expert_id="AUREA-BROWSER-USE-EXPERT-V1",
                objective="Create and verify one TodoMVC task.",
                trace_id="browser-use-test-002",
            )
        )

    assert result.status == "BLOCKED"
    assert result.blockers == ["browser_use_api_key_missing"]
