"""AUREA Publication Agent: diagnose -> plan -> approval -> execute via adapters."""
from __future__ import annotations

import json

from agents import Agent, Runner, function_tool

from tiktok_review import evaluate_tiktok_review_readiness


def _inspect_business_state(platform: str, business: str) -> dict:
    return {
        "platform": platform,
        "business": business,
        "status": "adapter_not_connected",
        "action": "request_or_connect_platform_adapter",
    }


def _build_publication_plan(platform: str, market: str, objective: str) -> dict:
    return {
        "platform": platform,
        "market": market,
        "objective": objective,
        "mode": "draft_only",
        "requires_human_approval": True,
        "steps": [
            "diagnose",
            "validate_assets",
            "prepare",
            "show_preview",
            "approve",
            "publish",
            "verify",
        ],
    }


def _request_human_approval(summary: str) -> dict:
    return {
        "status": "approval_required",
        "summary": summary,
        "publish_allowed": False,
    }


def _record_learning(result: str, evidence: str, reusable_rule: str) -> dict:
    return {
        "result": result,
        "evidence": evidence,
        "reusable_rule": reusable_rule,
    }


@function_tool
def inspect_business_state(platform: str, business: str) -> str:
    """Report platform connection state without pretending to have access."""
    return json.dumps(_inspect_business_state(platform, business))


@function_tool
def build_publication_plan(platform: str, market: str, objective: str) -> str:
    """Build a non-destructive publication plan before any launch action."""
    return json.dumps(_build_publication_plan(platform, market, objective))


@function_tool
def request_human_approval(summary: str) -> str:
    """Create an approval checkpoint; never publishes by itself."""
    return json.dumps(_request_human_approval(summary))


@function_tool
def record_learning(result: str, evidence: str, reusable_rule: str) -> str:
    """Record the AUREA result/evidence/learning loop in machine-readable form."""
    return json.dumps(_record_learning(result, evidence, reusable_rule))


@function_tool
def check_tiktok_review_readiness(config_json: str) -> str:
    """Check TikTok app-review prerequisites without contacting or mutating TikTok."""
    config = json.loads(config_json)
    return json.dumps(evaluate_tiktok_review_readiness(config))


AGENT_INSTRUCTIONS = """
You are AUREA's Agente de Publicación Empresarial.

Operate with this invariant loop: RESULTADO -> EVIDENCIA -> DECISIÓN -> APRENDIZAJE -> ADAPTACIÓN -> SIGUIENTE ACCIÓN.

Diagnose a business's social advertising/publication setup, detect account and permission
conflicts, prepare the smallest safe action plan, request approval before consequential
publication, execute only through an explicitly connected platform adapter, verify the
result, and turn successful procedures into reusable playbooks.

Hard rules:
- Never invent access, account state, permissions, publication success, or metrics.
- Never create duplicate business accounts when an existing account can be reused.
- Prefer permissions and linked assets over password sharing.
- Separate diagnosis from mutation.
- No paid campaign goes live without an explicit approval checkpoint.
- If a platform adapter is not connected, stop at the exact human/connection step.
- Treat platform review readiness as configuration evidence only; never infer approval.
- After every completed action, record evidence and a reusable learning.
- Do not expose secrets.
"""


def build_agent() -> Agent:
    return Agent(
        name="AUREA Agente de Publicación Empresarial",
        instructions=AGENT_INSTRUCTIONS,
        tools=[
            inspect_business_state,
            build_publication_plan,
            request_human_approval,
            record_learning,
            check_tiktok_review_readiness,
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
