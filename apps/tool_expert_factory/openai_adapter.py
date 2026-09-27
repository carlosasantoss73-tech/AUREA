"""OpenAI provider adapter for AUREA Specialist Runtime.

The adapter owns transport only. It never promotes provider output to
institutional truth; final verification remains AUREA/Bibliotecario-owned.
"""
from __future__ import annotations

import json
import os
import urllib.request

from .contracts import Evidence, ExpertRequest, ExpertResult


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_OPENAI_MODEL = "gpt-5.6-luna"


def execute_openai(request: ExpertRequest, *, model: str = DEFAULT_OPENAI_MODEL) -> ExpertResult:
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="OpenAI provider cannot execute without OPENAI_API_KEY.",
            decision="STOP",
            blockers=["openai_api_key_missing"],
            next_action="Provide OPENAI_API_KEY through the approved secret boundary.",
            evidence=[Evidence("provider", "openai-api", "credential boundary missing", False)],
        )

    payload = {
        "model": model,
        "input": request.objective,
        "max_output_tokens": 1200,
    }
    try:
        req = urllib.request.Request(
            OPENAI_RESPONSES_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            body = json.load(response)
    except Exception as exc:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="OpenAI provider execution failed.",
            decision="STOP",
            blockers=[f"openai_request_failed:{type(exc).__name__}"],
            next_action="Inspect the provider error without exposing credentials.",
            evidence=[Evidence("provider", "openai-api", "OpenAI request failed.", False)],
        )

    texts = []
    for item in body.get("output", []):
        for part in item.get("content", []):
            if part.get("type") == "output_text":
                texts.append(part.get("text", ""))

    output = "\n".join(texts).strip()
    if not output:
        return ExpertResult(
            expert_id=request.expert_id,
            trace_id=request.trace_id,
            status="BLOCKED",
            result="OpenAI provider returned no usable text output.",
            decision="STOP",
            blockers=["openai_empty_output"],
            next_action="Inspect the provider response contract.",
            evidence=[Evidence("provider", "openai-api", "Empty output.", False)],
        )

    return ExpertResult(
        expert_id=request.expert_id,
        trace_id=request.trace_id,
        status="EXECUTED",
        result=output,
        evidence=[
            Evidence(
                "provider",
                "openai-api",
                f"OpenAI Responses API executed with model {model}.",
                False,
            )
        ],
        decision="READY_FOR_AUREA_VERIFICATION",
        next_action="Attach Bibliotecario-authoritative evidence before VERIFIED.",
    )
