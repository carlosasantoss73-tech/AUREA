# AUREA Technology Radar — 2026-08-29

Status: evidence-bound daily scan. This file records only materially relevant findings from the current scan. It is not proof of integration.

## Scope

Two fronts: recent discoveries from the last ~24h and historical backfill where useful. Prioritize open source/free/low cost. Deduplicate against current repository evidence and the 2026-08-28 Knowledge OS checkpoint.

## Recent — last ~24h

### R1 — Tencent Hy4 preview
- Date/evidence: released Aug 28, 2026; official repository is public.
- What: open-source 770B MoE, 49B active/token, 1M context; optimized for software engineering, research, office/analysis and agents; OpenAI-compatible serving via vLLM/SGLang; Apache-2.0.
- Maturity: preview/early release.
- Cost: weights open; local inference requires substantial GPU infrastructure. Cloud/API availability exists but cost not established here.
- Evidence: https://github.com/Tencent-Hunyuan/Hy4-preview ; Reuters Aug 28, 2026.
- AUREA value: candidate for model benchmarking, long-context research, coding and artifact-generation evaluation; useful as a provider in the Multi-Provider abstraction, not as a default until benchmarked.
- Dependencies: vLLM/SGLang and very large GPU capacity for self-hosting.
- Risks: preview limitations; over-verification/long reasoning; hardware cost.
- Recommendation: PROBAR (benchmark only).
- Fact vs inference: model specs/license/release are verified; AUREA suitability is an inference requiring tests.

### R2 — Z.ai GLM-5.3 / GLM-5.3-Flash
- Date/evidence: current public weights are available; GLM-5.3 and Flash are open-weight releases.
- What: GLM-5.3 targets coding/long-horizon agentic work. GLM-5.3-Flash is natively multimodal, 320B total/18B active, and MIT licensed; local serving supported by vLLM/SGLang/Transformers/KTransformers/Unsloth.
- Maturity: public model release; Flash is particularly relevant for multimodal/efficiency testing.
- Cost: weights are free to download; inference cost depends on hardware/API. Flash license is MIT. Base GLM-5.3 uses the GLM-5.3 license with a special >$10B Model-as-a-Service security-review clause.
- Evidence: https://huggingface.co/zai-org/GLM-5.3 ; https://huggingface.co/zai-org/GLM-5.3-Flash
- AUREA value: strong candidate for coding-agent, multimodal and low-cost provider benchmarking; Flash may be especially relevant to the Media/vision path.
- Risks: licensing distinction between GLM-5.3 and Flash; large model serving requirements.
- Recommendation: PROBAR.
- Fact vs inference: model cards/licenses are verified; relative AUREA performance is unverified until benchmarked.

### R3 — Anthropic Model Hardware Standard (MHS)
- Date/evidence: research preview announced Aug 27, 2026.
- What: model-agnostic standard, built on MCP concepts, for AI agents to discover/operate physical lab and manufacturing devices; parallel operation is part of the design.
- Maturity: research preview, limited early access; not yet open source.
- Cost: not established.
- Evidence: https://www.anthropic.com/news/model-hardware-standard-research-preview
- AUREA value: architectural signal rather than immediate product integration. Reinforces separating capability/connector/provider contracts from agent logic and designing for safe parallel execution.
- Dependencies: compatible programmable devices, network interfaces and safety controls.
- Risks: early access, physical-world side effects, safety, no open-source release yet.
- Recommendation: OBSERVAR.
- Fact vs inference: standard/research preview is verified; applicability to AUREA is an architectural inference.

### R4 — OpenAI Codex persistent mode (reported testing)
- Date/evidence: reported Aug 27, 2026.
- What: a persistent/proactive Codex mode under testing that can continue work until stopped and generate follow-up tasks, with permission constraints.
- Maturity: testing/reporting, not an established public feature in this scan.
- AUREA value: validates the direction of AUREA Radar/scheduled agents and strengthens the need for bounded autonomy, permissions, idempotency, audit and stop controls.
- Risks: persistence increases security/misalignment risk.
- Recommendation: OBSERVAR.
- Evidence: Wired, Aug 27, 2026: https://www.wired.com/story/openai-is-developing-a-persistent-ai-agent
- Fact vs inference: reported feature is not independently confirmed here as generally available; architectural implications are inference.

### R5 — Cursor/OpenAI model-access change
- Date/evidence: Aug 29, 2026.
- What: Reuters reports OpenAI plans to terminate model provision to Cursor on Nov 12, 2026; discussions remain ongoing and Anthropic plans increased support.
- AUREA value: concrete vendor-dependency risk. Strengthens AUREA's provider abstraction and fallback strategy.
- Recommendation: OBSERVAR.
- Evidence: Reuters, Aug 29, 2026: https://www.reuters.com/business/media-telecom/openai-end-partnership-with-spacexs-cursor-2026-08-29/

## Backfill — high-value historical candidates

### B1 — OpenWorker
- Open-source, MIT, local-first desktop AI coworker; 25+ connectors, MCP support, scheduled automations, approval-gated consequential actions, BYO model including local Ollama.
- Strong architectural benchmark for AUREA's Execution Fabric and outcome-oriented UX.
- Recommendation: PROBAR as a reference implementation, not integrate wholesale.
- Evidence: https://github.com/andrewyng/openworker

### B2 — OpenViking
- Open-source context database for agents unifying memory, resources and skills using a filesystem paradigm, tiered L0/L1/L2 context loading, hierarchical retrieval and session self-iteration.
- Main project is AGPLv3; CLI/examples have other licenses. This is a license consideration for commercial incorporation.
- Strong benchmark against AUREA Knowledge OS/Context Store, especially progressive disclosure and skill/context co-management.
- Recommendation: PROBAR architecture patterns; do not copy code without license review.
- Evidence: https://github.com/volcengine/OpenViking

### B3 — Agent Reach
- MIT-licensed CLI that gives agents internet read/search capabilities across X/Twitter, Reddit, YouTube, GitHub, Bilibili and other sources, designed around zero API fees and shell/tool adapters.
- Extremely relevant to Radar because it can reduce friction for legitimate public-web research and source discovery.
- Risks: scraping platform terms, account/tool permissions, source reliability and security of shell execution.
- Recommendation: PROBAR in a sandboxed Radar research cell after legal/security review.
- Evidence: https://github.com/Panniantong/Agent-Reach

### B4 — OmniRoute
- MIT-licensed local AI gateway; current public repo advertises hundreds of providers/models, free tiers, automatic fallback, token compression, MCP/A2A and compatibility with Claude Code/Codex/Cursor/OpenCode/Cline/Copilot.
- Strong candidate for the Multi-Provider and cost-control benchmark.
- Risks: provider terms/quotas; routing credentials; must not become a hidden bypass around AUREA governance.
- Recommendation: PROBAR.
- Evidence: https://github.com/diegosouzapw/OmniRoute

### B5 — TencentDB Agent Memory v2.x
- Open-source memory system with layered L0→L3 memory, Skill/Wiki/Code-Graph assets, local SQLite/vector options, SDKs, OpenTelemetry and integrations; v2.0/v2.0.1 releases in Aug 2026 emphasize reusable agent experience and skills.
- Strong benchmark for AUREA's memory-to-skill learning loop and evidence traceability. Current AUREA B15 explicitly uses governed caller-supplied evidence and does not yet prove autonomous memory ingestion.
- Recommendation: PROBAR architecture/benchmark; do not replace AUREA Context Store.
- Evidence: https://github.com/TencentCloud/TencentDB-Agent-Memory/releases and https://github.com/Tencent/TencentDB-Agent-Memory

## Radar decisions

Immediate PROBAR queue: GLM-5.3-Flash, Hy4 preview, OpenWorker, Agent Reach, OmniRoute, TencentDB Agent Memory.

OBSERVAR queue: Anthropic MHS, Codex persistent mode, Cursor/OpenAI dependency event.

No candidate is marked INCORPORATE solely from this scan. Integration requires repository-level adapter implementation, permissions, tests, provenance and runtime evidence.

## Relationship to current AUREA evidence

The 2026-08-28 Knowledge OS checkpoint confirms current AUREA has a file-backed persistent Context Store, Context Retrieval Gate, governed memory ingestion with idempotency/versioning, and deny-by-default Permission Gateway; it explicitly says external provider execution, multi-provider operational connectivity and automatic conversation ingestion are NOT VERIFIED. This radar therefore treats the new candidates as benchmarks/possible adapters, not as already integrated components.

Source: `docs/KNOWLEDGE_OS_AUREA_CONSOLIDATED_2026-08-28_B15.md`.
