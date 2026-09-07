"""Deterministic tests for the publication agent safety contract."""

import asyncio
import json

from agent import (
    AGENT_INSTRUCTIONS,
    build_agent,
    build_publication_plan,
    inspect_business_state,
    record_learning,
    request_human_approval,
)


def _tool_output(tool, **kwargs):
    """Invoke an Agents SDK function tool through its real async runtime contract."""
    async def invoke():
        return await tool.on_invoke_tool(None, json.dumps(kwargs))

    return json.loads(asyncio.run(invoke()))


def test_agent_contract():
    agent = build_agent()
    assert agent.name == "AUREA Agente de Publicación Empresarial"
    assert len(agent.tools) == 4
    assert "approval" in AGENT_INSTRUCTIONS.lower()
    assert "never invent" in AGENT_INSTRUCTIONS.lower()
    assert "RESULTADO" in AGENT_INSTRUCTIONS
    assert "APRENDIZAJE" in AGENT_INSTRUCTIONS


def test_inspection_never_claims_access():
    result = _tool_output(
        inspect_business_state,
        platform="TikTok",
        business="TERRAZAS COSTA LIMÓN",
    )
    assert result["status"] == "adapter_not_connected"
    assert result["action"] == "request_or_connect_platform_adapter"


def test_plan_is_non_destructive_and_requires_approval():
    result = _tool_output(
        build_publication_plan,
        platform="TikTok",
        market="Chile",
        objective="qualified inquiries",
    )
    assert result["mode"] == "draft_only"
    assert result["requires_human_approval"] is True
    assert result["steps"][-2:] == ["publish", "verify"]


def test_approval_never_authorizes_publication():
    result = _tool_output(request_human_approval, summary="First TCL test")
    assert result["status"] == "approval_required"
    assert result["publish_allowed"] is False


def test_learning_is_machine_readable():
    result = _tool_output(
        record_learning,
        result="diagnosed",
        evidence="adapter unavailable",
        reusable_rule="stop before mutation",
    )
    assert result == {
        "result": "diagnosed",
        "evidence": "adapter unavailable",
        "reusable_rule": "stop before mutation",
    }
