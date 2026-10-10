# AUREA — Reverse Benchmark of Radar's 9 Technology Candidates

Date: 2026-08-29
Status: ANALYSIS / EVIDENCE-BOUND

## Rule
A candidate is not considered integrated merely because Radar discovered it. Adoption requires source evidence, license/security review, an isolated test, a clear AUREA mapping, and regression evidence.

## 1. Tencent Hy4
- Potential value: open-model/provider benchmarking.
- AUREA mapping: Provider Registry / Multi-Provider.
- Decision: EXPERIMENT.
- Immediate action: benchmark capability, cost, context, multimodal behavior and deployment constraints before any provider activation.

## 2. GLM-5.3 / Flash
- Potential value: coding and multimodal model-provider comparison.
- AUREA mapping: Provider Registry and model policy.
- Decision: EXPERIMENT.
- Immediate action: compare against current model path on representative AUREA tasks; no production switch yet.

## 3. Anthropic Model Hardware Standard
- Potential value: architectural signal for agent infrastructure, connectors and parallel execution.
- AUREA mapping: infrastructure and Execution Fabric design.
- Decision: WATCH / BENCHMARK.
- Immediate action: extract principles; do not treat third-party architecture as an implementation dependency.

## 4. Codex Persistent Mode
- Potential value: persistent/background agent workflows.
- AUREA mapping: Scheduler, Agent lifecycle, Execution Fabric.
- Decision: EXPERIMENT.
- Immediate action: test persistence, resumability, failure recovery and human approval boundaries.

## 5. OpenWorker
- Potential value: agents, connectors, MCP and scheduled automation.
- AUREA mapping: Connector Registry, Scheduler, Agent Factory.
- Decision: EXPERIMENT.
- Immediate action: compare its composition model with AUREA; borrow patterns, not implementation.

## 6. OpenViking
- Potential value: unified memory/resources/skills context, tiered context loading, recursive retrieval and observable retrieval traces.
- AUREA mapping: Bibliotecario / Knowledge OS / Context Retrieval Gate.
- Decision: EXPERIMENT as an external benchmark, NOT immediate replacement.
- Rationale: AUREA already has a governed persistent Context Store and retrieval boundary. OpenViking is valuable primarily as a benchmark for hierarchical context, experience memory and retrieval observability. Current public documentation reports integrations with Claude Code, Codex, Cursor and MCP and publishes benchmark results; these claims require independent reproduction before architectural adoption.
- Immediate action: reproduce a small local benchmark against AUREA's current context path before considering any dependency.

## 7. Agent-Reach
- Potential value: broaden Radar's research reach across public sources.
- AUREA mapping: Radar Reach adapters.
- Decision: INTEGRATE only behind the governed Radar Reach boundary after license/security/source review.
- Immediate action: adapter-level experiment; captured evidence must remain non-activating.

## 8. OmniRoute
- Potential value: model/provider routing, fallback and cost optimization.
- AUREA mapping: Provider Registry / model policy / Execution Fabric.
- Decision: EXPERIMENT.
- Immediate action: benchmark routing quality, failure handling, observability and provider neutrality.

## 9. TencentDB Agent Memory
- Potential value: experience memory and persistence patterns.
- AUREA mapping: Bibliotecario / Memory OS / learning-capture layer.
- Decision: WATCH / EXPERIMENT.
- Immediate action: compare experience-memory schema and governance with AUREA; do not introduce a second memory system.

## Cross-candidate conclusions

1. OpenViking is the strongest benchmark for the Bibliotecario/Knowledge OS because it treats memories, resources and skills as a unified navigable context layer.
2. Agent-Reach is the strongest immediate candidate for Radar Reach because it addresses the research-access gap rather than duplicating a core AUREA subsystem.
3. OmniRoute is the strongest candidate for Multi-Provider routing/fallback benchmarking.
4. OpenWorker and Codex Persistent Mode are useful benchmarks for Scheduler + Agent lifecycle + resumable execution.
5. Tencent Hy4 and GLM are provider/model experiments, not architecture dependencies.
6. Anthropic hardware guidance is an architectural benchmark, not a feature to copy.
7. TencentDB Agent Memory should inform learning/experience capture, not create a second memory store.

## Adoption order

P0: Agent-Reach adapter experiment; OpenViking retrieval benchmark; OmniRoute provider-routing benchmark.
P1: OpenWorker/Codex persistence and scheduling benchmark; model-provider benchmarks.
P2: experience-memory benchmark and infrastructure research.

## Guardrails

- No automatic credential creation.
- No production activation from Radar discovery.
- No duplicate Knowledge OS or Runtime.
- No claims of external integration until tested.
- No proprietary code copying.
- Every adopted capability enters the Capability Registry and lifecycle governance.
