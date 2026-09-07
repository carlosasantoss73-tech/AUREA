"""AUREA Publication Agent: diagnose -> plan -> approval -> execute via adapters.

The first implementation is deliberately provider-neutral. Platform actions are
represented by explicit tools/adapters so credentials and platform connectors can
be added without rebuilding the agent core.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from agents import Agent, Runner, function_tool


@dataclass
class PublicationContext:
    business: str
    market: str
    approval_required: bool = True


@function_tool
def inspect_business_state(platform: str, business: str) -> str:
    """Return the known diagnostic state for a platform.

    This intentionally reports "not connected" rather than pretending that an
    account was inspected. Real platform adapters will replace this tool.
    """
    return json.dumps({
        "platform": platform,
        "business": business,
        "status": "adapter_not_connected",
        "action": "request_or_connect_platform_adapter",
    })


@function_tool
def build_publication_plan(platform: str, market: str, objective: str) -> str:
    """Build a non-destructive publication plan before any launch action."""
    return json.dumps({
        "platform": platform,
        "market": market,
        "objective": objective,
        "mode": "draft_only",
        "requires_human_approval": True,
        "steps": ["diagnose", "validate_assets", "prepare", "show_preview", "approve", "publish", "verify"],
    })


@function_tool
def request_human_approval(summary: str) -> str:
    """Create an approval checkpoint; never publishes by itself."""
    return json.dumps({
        "status": "approval_required",
        "summary": summary,
        "publish_allowed": False,
    })


@function_tool
def record_learning(result: str, evidence: str, reusable_rule: str) -> str:
    """Record the AUREA result/evidence/learning loop in machine-readable form."""
    return json.dumps({
        "result": result,
        "evidence": evidence,
        "reusable_rule": reusable_rule,
    })


AGENT_INSTRUCTIONS = """
You are AUREA's Agente de Publicación Empresarial.

Operate with this invariant loop: RESULTADO -> EVIDENCIA -> DECISIÓN -> APRENDIZAJE -> ADAPTACIÓN -> SIGUIENTE ACCIÓN.

Your job is to diagnose a business's social advertising/publication setup, detect account
and permission conflicts, prepare the smallest safe action plan, request approval before
any consequential publication, execute only through an explicitly connected platform
adapter, verify the result, and turn successful procedures into reusable playbooks.

Hard rules:
- Never invent access, account state, permissions, publication success, or metrics.
- Never create duplicate business accounts when an existing account can be reused.
- Prefer permissions and linked assets over password sharing.
- Separate diagnosis from mutation.
- No paid campaign goes live without an explicit approval checkpoint.
- If a platform adapter is not connected, say so and stop at the exact human/connection step.
- After every completed action, record evidence and a reusable learning.
- Do not expose secrets.
"""


def build_agent() -> Agent:
    return Agent(
        name="AUREA Agente de Publicación Empresarial",
        instructions=AGENT_INSTRUCTIONS,
        model=os.getenv("AUREA_MODEL", "gpt-5.6-sol"),
        tools=[
            inspect_business_state,
            build_publication_plan,
            request_human_approval,
            record_learning,
        ],
    )


async def run_agent(instruction: str) -> str:
    result = await Runner.run(build_agent(), instruction)
    return result.final_output


if __name__ == "__main__":
    import asyncio
    import sys

    prompt = " ".join(sys.argv[1:]).strip() or (
        "Diagnose the current TERRAZAS COSTA LIMÓN TikTok/Meta publication setup "
        "and prepare a safe first action plan without publishing anything."
    )
    print(asyncio.run(run_agent(prompt)))
