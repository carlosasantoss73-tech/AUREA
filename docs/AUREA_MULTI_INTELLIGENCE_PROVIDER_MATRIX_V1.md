# AUREA — Multi-Intelligence Provider Matrix V1

## Purpose

AUREA must not behave as a single-model system. It must be able to route work to multiple independent intelligence providers, compare their outputs, use specialist reviewers, and fail over without confusing **registered**, **configured**, **connected**, **available**, and **executable** states.

This document defines the provider families to be considered by the orchestration layer. It does **not** claim that any provider is currently connected to the AUREA runtime.

## Provider families

| Family | Examples | Primary use in AUREA | Current architectural state |
|---|---|---|---|
| OpenAI | GPT-family / OpenAI coding capabilities | orchestration, reasoning, coding, general execution | existing integration target; runtime connection must be verified |
| Anthropic | Claude-family | adversarial review, reasoning, coding review, long-context analysis | existing provider architecture target; runtime connection must be verified |
| Google | Gemini-family | multimodal analysis, long-horizon coding/agents, image/video/audio workflows | candidate provider; must be registered and health-checked before use |
| Alibaba/Qwen | Qwen-family | multilingual, multimodal, cost/throughput alternatives | candidate provider; must be registered and health-checked before use |
| DeepSeek | DeepSeek V4 family | reasoning/coding alternative, independent cross-check | candidate provider; must be registered and health-checked before use |
| Zhipu/GLM | GLM family | Chinese-language reasoning/coding alternative | candidate provider; must be registered and health-checked before use |
| Moonshot/Kimi | Kimi family | long-context/reasoning alternative | candidate provider; must be registered and health-checked before use |
| Baidu | ERNIE/Qianfan family | Chinese-language and enterprise alternative | candidate provider; must be registered and health-checked before use |

## Important distinction

AUREA must never say "we used Google/DeepSeek/Qwen/Claude/etc." merely because a provider exists in this matrix.

The runtime must record:

- providerId
- modelId
- provider status
- connection evidence
- capability
- prompt version
- context package ID
- traceId
- latency
- cost when available
- output evidence
- QA result
- reviewer/provider disagreement

Only an **EXECUTABLE** provider may be selected by the provider runtime for execution.

## Multi-intelligence pattern

For work that benefits from independent verification, AUREA should use a controlled pattern:

1. **Primary agent** produces the candidate result.
2. **Independent specialist(s)** review the result using the same task contract but independent reasoning.
3. **Adversarial reviewer** searches for factual, logical, security, architectural, or compliance defects.
4. **AUREA Decision Engine** compares outputs and evidence.
5. If providers agree and evidence is sufficient, continue.
6. If providers disagree materially, escalate to evidence review rather than selecting by brand preference.
7. **QA/Audit** validates the final result independently.
8. **Learning loop** records which provider/reviewer pattern produced the strongest verified outcome.

## Parallelization rule

Independent provider reviews should run in parallel when:

- they do not mutate shared state;
- they receive the same authorized task/context contract;
- their outputs can be reconciled deterministically;
- resource and budget limits allow concurrency;
- Sentinel can contain a failing branch without corrupting the Work Cell.

Provider execution that mutates external state remains sequential and gated.

## Provider selection principle

Provider selection is capability-driven, evidence-driven, and policy-constrained — not popularity-driven.

AUREA should be able to choose:

- best reasoning provider for the task;
- best coding reviewer;
- best multimodal provider;
- lowest-risk available fallback;
- independent second opinion;
- regional/provider-diversity alternative;
- cost/latency optimized provider when quality thresholds are satisfied.

## Current implementation gap

`ProviderRuntime` already enforces executable-provider selection, but the current runtime does not yet constitute a live connection to all providers in this matrix. The next implementation step is provider adapters + health evidence + credential/configuration boundaries, followed by multi-provider comparative QA.

## Governance

Provider credentials, external calls, spending limits, data residency, and sensitive context routing remain subject to AUREA permission, authority, Sentinel, QA, and audit controls.

No provider may bypass the Work Cell, Knowledge/Context boundary, Permission Gateway, Execution Gate, Sentinel, or QA/Audit closure path.
