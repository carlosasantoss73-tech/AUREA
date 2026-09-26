from pathlib import Path

from apps.tool_expert_factory.super_agent import ToolAutomationSuperAgent


def test_super_agent_has_four_tool_sequence():
    agent = ToolAutomationSuperAgent(Path("runtime/test-super-agent"))
    result = agent.configure_all(apply=False)
    assert result["agent_id"] == "AUREA-TOOL-AUTOMATION-SUPER-AGENT-V1"
    assert [item["tool_id"] for item in result["EVIDENCIA"]] == [
        "browser-use",
        "skyvern",
        "playwright-mcp",
        "stagehand",
    ]
    assert result["DECISION"] == "DRY_RUN_ONLY"
