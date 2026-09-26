# AUREA — TOOL AUTOMATION KNOWLEDGE PACK V1

Audit date: 2026-09-26

## Authority rule

Official vendor documentation and official repositories are configuration authority. Community discussions are troubleshooting evidence only. Books and third-party articles are background/training material and never override current official documentation.

## 1. Browser Use

Official sources:
- https://github.com/browser-use/browser-use
- https://github.com/browser-use/browser-use/blob/main/README.md
- https://github.com/browser-use/browser-use/blob/main/pyproject.toml
- https://docs.browser-use.com/

Verified facts:
- Open-source Browser Use agent is available as a Python library.
- Current repository metadata reports version 0.13.10 at audit time.
- Python requirement is >=3.11.
- Local browser execution is supported.
- The Python library is MIT licensed.
- Hosted browser/agent services are separate from the free open-source library.
- Authentication can use a local browser profile or provider API keys depending on execution path.

Configuration pattern:
Python -> browser-use -> local browser -> selected LLM

Key risks:
- LLM inference may incur provider cost.
- Cloud browser/API is not equivalent to the free local library.
- Authentication/session state must not be written into AUREA audit logs.

## 2. Skyvern

Official sources:
- https://github.com/Skyvern-AI/skyvern
- https://github.com/Skyvern-AI/skyvern/blob/main/docs/developers/self-hosted/overview.mdx
- https://github.com/Skyvern-AI/skyvern/blob/main/docs/sdk-reference/complete-reference.mdx
- https://www.skyvern.com/docs/

Verified facts:
- Self-hosted deployment is an official supported path.
- Core open-source repository is AGPL-3.0.
- Local embedded browser mode is available through the SDK.
- Skyvern uses Playwright with Chromium for browser execution.
- Self-hosted deployments can use customer infrastructure and supported LLM providers.
- Ollama is an official documented path for local model execution.

Configuration pattern:
Python -> Skyvern.local()/local browser -> selected LLM

Key risks:
- Self-hosted software and managed Cloud are different operational products.
- LLM/API costs remain separate from software licensing.
- Docker/Kubernetes is the full self-host path; local SDK is the lighter first experiment.

## 3. Playwright MCP

Official sources:
- https://playwright.dev/docs/getting-started-mcp
- https://github.com/microsoft/playwright-mcp
- https://github.com/microsoft/playwright-mcp/blob/main/package.json

Verified facts:
- Official Microsoft MCP server exposes browser automation to MCP clients.
- It uses structured accessibility snapshots rather than requiring a vision model for basic operation.
- Standard setup is npx @playwright/mcp@latest.
- Official getting-started guidance currently calls for Node.js 20+ and an MCP client.
- The package is Apache-2.0 licensed.
- Browser binaries can be obtained as part of first use.

Configuration pattern:
MCP client -> Playwright MCP -> Chromium/browser

Key risks:
- The MCP server is a tool layer, not an LLM provider.
- Context size can grow when large accessibility trees are returned.
- Community reports are troubleshooting signals, not authority.

## 4. Stagehand

Official sources:
- https://github.com/browserbase/stagehand
- https://github.com/browserbase/stagehand/blob/main/README.md
- https://github.com/browserbase/stagehand/blob/main/CONTRIBUTING.md
- https://stagehand.dev/

Verified facts:
- Current Stagehand repository is maintained by Browserbase.
- Current architecture exposes TypeScript, Python and Go SDKs.
- Local browser runs are supported.
- Stagehand combines deterministic browser control with AI methods such as act, extract, and observe.
- Current repository is MIT licensed.
- Current v4 architecture is protocol-first and includes an in-browser runtime.
- Browserbase Cloud is optional for the local experiment; cloud credentials are a separate dependency.

Configuration pattern:
Node/Python -> Stagehand -> local Chrome -> selected LLM

Key risks:
- Stagehand v4 is a current architectural line; do not copy old v2/v3 setup instructions without revalidation.
- Local browser and Browserbase Cloud are separate deployment choices.
- LLM provider credentials are separate from Stagehand installation.

## Cross-tool conclusion

The four tools are sufficiently different to make a meaningful portability experiment:

- Browser Use = agent-centric
- Skyvern = agentic workflow/automation platform
- Playwright MCP = MCP browser tool layer
- Stagehand = hybrid deterministic + AI SDK

The same AUREA Specialist Runtime can therefore be tested against four materially different execution boundaries.

## Community evidence

Recent community discussions surfaced recurring practical concerns around authentication/session reuse, token/context overhead from browser state, reliability under changing UI, keeping final assertions deterministic, and separating exploratory agent behavior from repeatable verification.

These observations are useful as test cases, not as configuration authority.

## Free-path rule

For this experiment, free means local/open-source execution where possible. It does not guarantee zero model cost. If a provider API key is required, the super agent must stop at the credential gate and ask only for the missing authorization.
