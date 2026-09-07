from agent import build_agent


def test_agent_is_configured_with_safety_tools():
    agent = build_agent()
    assert agent.name == "AUREA Agente de Publicación Empresarial"
    assert len(agent.tools) == 4
    assert "approval" in agent.instructions.lower()
    assert "never invent" in agent.instructions.lower()
