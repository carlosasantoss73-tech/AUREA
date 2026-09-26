from pathlib import Path

from apps.tool_expert_factory.super_configurator import TOOL_SPECS, SuperConfigurator


def test_four_tools_are_sequential_and_distinct():
    assert [spec.tool_id for spec in TOOL_SPECS] == [
        "browser-use",
        "skyvern",
        "playwright-mcp",
        "stagehand",
    ]


def test_every_tool_has_official_sources_and_install_contract():
    for spec in TOOL_SPECS:
        assert spec.official_sources
        assert spec.install_commands
        assert spec.smoke_command


def test_install_commands_are_allowlisted():
    configurator = SuperConfigurator(Path("runtime/test-super-configurator"))
    for spec in TOOL_SPECS:
        for command in spec.install_commands:
            assert configurator._safe_command(command)


def test_plan_is_explicit_about_human_intervention():
    plan = SuperConfigurator(Path("runtime/test-super-configurator")).plan()
    policy = plan["human_intervention_policy"]
    assert "credential_entry" in policy["allowed"]
    assert "secret_logging" in policy["forbidden"]
