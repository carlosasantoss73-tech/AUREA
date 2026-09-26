# AUREA — TOOL AUTOMATION SUPER AGENT V1

## RESULTADO

Created the orchestration layer for one specialist whose first mission is to configure, validate and sequentially test four browser-automation tools:

1. Browser Use
2. Skyvern
3. Playwright MCP
4. Stagehand

The super agent is not a fifth browser automation engine. It is the configuration/orchestration specialist above the four executors.

## EVIDENCIA

Current official sources audited on 2026-09-26:

- Browser Use: open-source Python/TypeScript browser agent; local Python library; MIT license.
- Skyvern: self-hosted open-source deployment; local browser mode; SDK and Docker/Kubernetes paths; AGPL-3.0 core repository.
- Playwright MCP: official Microsoft MCP server for browser automation through accessibility snapshots; standard npx setup; Apache-2.0.
- Stagehand: current Browserbase repository; local browser runs; TypeScript/Python/Go SDKs; MIT license.

The live official-source gate is encoded in apps/tool_expert_factory/super_configurator.py. It refuses installation if the configured official sources cannot be fetched and matched.

## DECISIÓN

Use one super specialist and four sequential executors.

Pipeline:

Official Source Gate -> Environment Gate -> Tool Installer -> Smoke Test -> Credential Gate -> Evidence -> Audit -> Next Tool

No tool is considered operational merely because its package installed.

States:

- PENDING
- READY
- CONFIGURED_AWAITING_CREDENTIALS
- CONFIGURED
- BLOCKED

The existing Specialist Runtime remains the governance boundary. This layer does not replace it.

## HUMAN-INTERVENTION CONTRACT

The target is minimum intervention, not zero intervention.

The human may need to:

- enter an API key/token;
- complete a browser login;
- approve a consequential mutation;
- approve a paid service if a free/local path is insufficient.

The super agent must never request or log secret values into AUREA audit artifacts.

## FREE TESTING DEFINITION

Free means the software can be installed and exercised locally without buying the vendor managed browser service.

It does not mean the underlying LLM is automatically free. A model/API key may still be required unless a local model is selected.

Recommended first pass:

- Browser Use: local browser + permitted model provider or local model.
- Skyvern: embedded/local mode + local or permitted LLM.
- Playwright MCP: local browser; model/client is external to the MCP server.
- Stagehand: local browser; model provider is configured separately.

## SEQUENTIAL TEST CONTRACT

For each tool:

1. Re-verify current official sources.
2. Detect prerequisites.
3. Install/configure only official package paths.
4. Run smoke test.
5. Record evidence.
6. Stop if blocked.
7. Ask the human only for the smallest missing credential/login/approval.
8. Resume the same tool.
9. Mark CONFIGURED only after evidence.
10. Proceed to the next tool.

## 15-CELL LAYERING

The super agent uses the existing 15-cell architecture as governance rather than creating another parallel architecture:

- C01: official knowledge source
- C02: authority/permission boundary
- C03: context gate
- C04: runtime contract
- C05: adapter contract
- C06: model/provider contract
- C07: fallback contract
- C08: AUREA/Nodriza integration boundary
- C09: work planner
- C10: tool skill/playbook
- C11: persistence/versioning
- C12: external/A2A interface
- C13: validation
- C14: evidence/audit
- C15: integration control

The new super agent adds a concrete configuration loop over those existing layers.

## IMPORTANT

This change does not claim the four tools are installed on the user's computer. It creates the agent and the executable local configuration path. Actual installation requires running the configurator in the target environment.

That distinction is intentional and follows AUREA's rule:

DOCUMENTED != IMPLEMENTED != INTEGRATED != VALIDATED != OPERATIONAL.
