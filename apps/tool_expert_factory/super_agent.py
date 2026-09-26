"""AUREA Tool Automation Super Agent V1.

Thin orchestration layer above the deterministic SuperConfigurator.
It owns the user-facing sequence and delegates installation mechanics.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from .super_configurator import SuperConfigurator


class ToolAutomationSuperAgent:
    agent_id = "AUREA-TOOL-AUTOMATION-SUPER-AGENT-V1"

    def __init__(self, workspace: Path | None = None) -> None:
        self.configurator = SuperConfigurator(workspace)

    def refresh_knowledge(self, sources: list[dict[str, str]]) -> dict[str, object]:
        """Refresh candidate knowledge while preserving authority boundaries."""
        from .knowledge_researcher import KnowledgeResearcher
        researcher = KnowledgeResearcher()
        findings = []
        for item in sources:
            source = researcher.classify_url(
                item["url"], topic=item.get("topic", "tool"), publisher=item.get("publisher", "unknown")
            )
            finding = researcher.fetch(source)
            findings.append(researcher.as_record(finding))
        return {
            "agent_id": self.agent_id,
            "RESULTADO": "Knowledge refresh completed with provenance-aware evidence.",
            "EVIDENCIA": findings,
            "DECISION": "Official sources may enter institutional validation; non-official sources remain learning/troubleshooting evidence.",
            "APRENDIZAJE": "Web breadth improves troubleshooting only when authority and provenance remain explicit.",
            "ADAPTACION": "Revalidate official sources before configuration or mutation.",
            "SIGUIENTE_ACCION": "Cross-check candidate findings against current official documentation and executable tests.",
        }

    def configure_all(self, *, apply: bool = False) -> dict[str, object]:
        results = self.configurator.sequential(apply=apply)
        blocked = next((item for item in results if item.status == "BLOCKED"), None)

        if blocked is not None:
            decision = "STOP_AND_PRESERVE_EVIDENCE"
            next_action = f"Resolve blocker for {blocked.tool_id}, then resume the same tool."
        elif apply:
            decision = "ADVANCE_ONLY_AFTER_VERIFIED_TOOL_STATE"
            next_action = "Collect only the minimum credential/login needed, then run the same tool verification."
        else:
            decision = "DRY_RUN_ONLY"
            next_action = "Re-run with --apply in the target environment when explicit installation approval is intended."

        return {
            "agent_id": self.agent_id,
            "RESULTADO": "Sequential four-tool configuration cycle completed to the current gate.",
            "EVIDENCIA": [asdict(item) for item in results],
            "DECISION": decision,
            "APRENDIZAJE": "The same configuration specialist can govern materially different browser executors through one ordered contract.",
            "ADAPTACION": "Keep each executor behind a stable tool-specific contract; do not fork the Specialist Runtime.",
            "SIGUIENTE_ACCION": next_action,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="AUREA Tool Automation Super Agent")
    parser.add_argument("--apply", action="store_true", help="Explicitly authorize local installation.")
    args = parser.parse_args()

    agent = ToolAutomationSuperAgent()
    result = agent.configure_all(apply=args.apply)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if all(item["status"] != "BLOCKED" for item in result["EVIDENCIA"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
