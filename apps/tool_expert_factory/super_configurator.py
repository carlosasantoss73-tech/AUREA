"""AUREA Super Configurator for browser-automation Tool Experts.

Sequentially configures Browser Use, Skyvern, Playwright MCP, and Stagehand.
It never stores or prints secret values.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal


ToolId = Literal["browser-use", "skyvern", "playwright-mcp", "stagehand"]


@dataclass(frozen=True)
class OfficialSource:
    url: str
    marker: str


@dataclass(frozen=True)
class ToolSpec:
    tool_id: ToolId
    name: str
    layer: str
    license: str
    local_path: bool
    official_sources: tuple[OfficialSource, ...]
    prerequisites: tuple[str, ...]
    install_commands: tuple[tuple[str, ...], ...]
    smoke_command: tuple[str, ...]
    credential_env: tuple[str, ...] = ()


@dataclass
class ToolState:
    tool_id: str
    status: str = "PENDING"
    official_verified: bool = False
    installed: bool = False
    smoke_verified: bool = False
    credential_required: bool = False
    credential_present: bool = False
    blockers: list[str] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)


TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool_id="browser-use",
        name="Browser Use",
        layer="AI browser agent / local execution",
        license="MIT",
        local_path=True,
        official_sources=(
            OfficialSource("https://github.com/browser-use/browser-use", "open-source"),
            OfficialSource("https://github.com/browser-use/browser-use/blob/main/README.md", "Python Library"),
            OfficialSource("https://github.com/browser-use/browser-use/blob/main/pyproject.toml", "version"),
            OfficialSource("https://github.com/browser-use/browser-use/blob/main/skills/cloud/SKILL.md", "BROWSER_USE_API_KEY"),
        ),
        prerequisites=("Python >= 3.11", "Chromium/browser runtime"),
        install_commands=(
            ("python", "-m", "pip", "install", "uv"),
            ("python", "-m", "pip", "install", "browser-use"),
            ("uvx", "browser-use", "install"),
        ),
        smoke_command=("python", "-c", "from browser_use import Agent; print(Agent.__name__)"),
        credential_env=("BROWSER_USE_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_API_KEY"),
    ),
    ToolSpec(
        tool_id="skyvern",
        name="Skyvern",
        layer="AI browser automation / local embedded mode",
        license="AGPL-3.0",
        local_path=True,
        official_sources=(
            OfficialSource("https://github.com/Skyvern-AI/skyvern", "Automate browser based workflows with AI"),
            OfficialSource("https://github.com/Skyvern-AI/skyvern/blob/main/docs/developers/self-hosted/overview.mdx", "self-hosted"),
            OfficialSource("https://github.com/Skyvern-AI/skyvern/blob/main/docs/sdk-reference/complete-reference.mdx", "Skyvern.local"),
        ),
        prerequisites=("Python >= 3.11", "Chromium/Playwright"),
        install_commands=(
            ("python", "-m", "pip", "install", "skyvern[local]"),
            ("python", "-m", "playwright", "install", "chromium"),
        ),
        smoke_command=("python", "-c", "import skyvern; print('skyvern_import_ok')"),
        credential_env=("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"),
    ),
    ToolSpec(
        tool_id="playwright-mcp",
        name="Playwright MCP",
        layer="MCP browser tool server",
        license="Apache-2.0",
        local_path=True,
        official_sources=(
            OfficialSource("https://playwright.dev/docs/getting-started-mcp", "Standalone server"),
            OfficialSource("https://github.com/microsoft/playwright-mcp", "browser automation capabilities"),
            OfficialSource("https://github.com/microsoft/playwright-mcp/blob/main/package.json", "@playwright/mcp"),
        ),
        prerequisites=("Node.js >= 20", "MCP-capable client"),
        install_commands=(
            ("npx", "@playwright/mcp@latest", "--help"),
        ),
        smoke_command=("npx", "@playwright/mcp@latest", "--help"),
    ),
    ToolSpec(
        tool_id="stagehand",
        name="Stagehand",
        layer="AI + deterministic browser automation SDK",
        license="MIT",
        local_path=True,
        official_sources=(
            OfficialSource("https://github.com/browserbase/stagehand", "Stagehand is the SDK for browser agents"),
            OfficialSource("https://github.com/browserbase/stagehand/blob/main/README.md", "Local runs"),
            OfficialSource("https://github.com/browserbase/stagehand/blob/main/CONTRIBUTING.md", "MIT license"),
        ),
        prerequisites=("Node.js >= 20.19 or >= 22.12", "Chrome for local runs"),
        install_commands=(
            ("npm", "install", "--no-save", "@browserbasehq/stagehand", "zod"),
        ),
        smoke_command=("node", "--input-type=module", "-e", "import('@browserbasehq/stagehand').then(m => { if (!m.Stagehand) process.exit(1); console.log('stagehand_import_ok') })"),
        credential_env=("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"),
    ),
)


class SuperConfigurator:
    """Sequential, fail-closed configuration orchestrator."""

    def __init__(self, workspace: Path | None = None) -> None:
        self.workspace = workspace or Path("runtime/tool-expert-super-configurator")
        self.workspace.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _executable(name: str) -> bool:
        return shutil.which(name) is not None

    def verify_official_sources(self, spec: ToolSpec, timeout: int = 12) -> tuple[bool, list[str]]:
        evidence: list[str] = []
        for source in spec.official_sources:
            request = urllib.request.Request(
                source.url,
                headers={"User-Agent": "AUREA-Tool-Expert-Super-Configurator/1.0"},
            )
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    body = response.read(250_000).decode("utf-8", errors="ignore")
                    if response.status != 200:
                        return False, [f"official_source_http_{response.status}:{source.url}"]
                    if source.marker.lower() not in body.lower():
                        return False, [f"official_source_marker_missing:{source.url}"]
                    evidence.append(f"official_verified:{source.url}")
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                return False, [f"official_source_unreachable:{source.url}:{type(exc).__name__}"]
        return True, evidence

    def check_prerequisites(self, spec: ToolSpec) -> tuple[bool, list[str]]:
        blockers: list[str] = []
        if spec.tool_id in {"browser-use", "skyvern"} and not self._executable("python"):
            blockers.append("python_not_found")
        if spec.tool_id in {"playwright-mcp", "stagehand"} and not self._executable("node"):
            blockers.append("node_not_found")
        if spec.tool_id in {"playwright-mcp", "stagehand"} and not self._executable("npm"):
            blockers.append("npm_not_found")
        return not blockers, blockers

    @staticmethod
    def _safe_command(command: tuple[str, ...]) -> bool:
        return bool(command) and command[0].lower() in {
            "python", "python3", "py", "uvx", "npx", "npm", "node"
        }

    def run_command(self, command: tuple[str, ...]) -> tuple[int, str]:
        if not self._safe_command(command):
            return 126, "blocked_command_not_allowlisted"
        completed = subprocess.run(
            list(command),
            cwd=self.workspace,
            text=True,
            capture_output=True,
            timeout=600,
            check=False,
        )
        output = (completed.stdout + "\n" + completed.stderr).strip()
        return completed.returncode, output[-6000:]

    def install_one(self, spec: ToolSpec, *, apply: bool = False) -> ToolState:
        state = ToolState(spec.tool_id)
        official_ok, official_evidence = self.verify_official_sources(spec)
        state.official_verified = official_ok
        state.evidence.extend(official_evidence)
        if not official_ok:
            state.status = "BLOCKED"
            state.blockers.append("official_source_gate_failed")
            return state

        prereq_ok, blockers = self.check_prerequisites(spec)
        if not prereq_ok:
            state.status = "BLOCKED"
            state.blockers.extend(blockers)
            return state

        if not apply:
            state.status = "READY"
            state.evidence.append("dry_run_install_plan_only")
            return state

        for command in spec.install_commands:
            code, output = self.run_command(command)
            state.evidence.append(f"command:{' '.join(command)}:exit={code}")
            if code != 0:
                state.status = "BLOCKED"
                state.blockers.append(f"install_command_failed:{command[0]}")
                state.evidence.append(output)
                return state

        state.installed = True
        code, output = self.run_command(spec.smoke_command)
        state.evidence.append(f"smoke:{' '.join(spec.smoke_command)}:exit={code}")
        if code != 0:
            state.status = "BLOCKED"
            state.blockers.append("smoke_test_failed")
            state.evidence.append(output)
            return state

        state.smoke_verified = True
        state.credential_required = bool(spec.credential_env)
        state.credential_present = any(bool(__import__("os").environ.get(name, "").strip()) for name in spec.credential_env)
        state.status = "CONFIGURED" if (not state.credential_required or state.credential_present) else "CONFIGURED_AWAITING_CREDENTIALS"
        if state.credential_required:
            state.evidence.append(f"credential_presence_verified:{state.credential_present}")
        state.evidence.append("software_configuration_verified")
        return state

    def sequential(self, *, apply: bool = False) -> list[ToolState]:
        results: list[ToolState] = []
        for spec in TOOL_SPECS:
            state = self.install_one(spec, apply=apply)
            results.append(state)
            self._write_audit(state)
            if state.status == "BLOCKED":
                break
        return results

    def plan(self) -> dict[str, object]:
        return {
            "orchestrator": "AUREA-TOOL-EXPERT-SUPER-CONFIGURATOR-V1",
            "sequence": [spec.tool_id for spec in TOOL_SPECS],
            "human_intervention_policy": {
                "allowed": ["credential_entry", "browser_login", "explicit_mutation_approval"],
                "forbidden": ["secret_logging", "invented_success", "silent_mutation"],
            },
            "tools": [asdict(spec) for spec in TOOL_SPECS],
        }

    def _write_audit(self, state: ToolState) -> None:
        path = self.workspace / "audit.jsonl"
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(state), ensure_ascii=False) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="AUREA browser automation super configurator")
    parser.add_argument("command", choices=("plan", "install"))
    parser.add_argument("--apply", action="store_true", help="Actually install; otherwise only plan.")
    args = parser.parse_args()

    configurator = SuperConfigurator()
    if args.command == "plan":
        print(json.dumps(configurator.plan(), ensure_ascii=False, indent=2))
        return 0

    results = configurator.sequential(apply=args.apply)
    print(json.dumps([asdict(item) for item in results], ensure_ascii=False, indent=2))
    return 0 if all(item.status != "BLOCKED" for item in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
