# AUREA — FOUR-TOOL AUTOMATION TEST PROTOCOL V1

## Objective

Demonstrate that one AUREA Tool Expert can configure and operate four materially different browser-automation executors without rebuilding the expert.

## Order

1. Browser Use
2. Skyvern
3. Playwright MCP
4. Stagehand

The next tool starts only after the previous tool reaches a terminal state:

CONFIGURED, VERIFIED, or an explicit BLOCKED with evidence.

## Common test

Use the same harmless public-site task for every executor:

1. open a public test page;
2. navigate to a known target;
3. extract a small deterministic fact;
4. return the fact plus URL/evidence;
5. verify the returned fact against the page;
6. write an AUREA audit record.

Do not begin with TikTok, Google Cloud, payments, account creation, or other consequential mutations.

## Metrics

For every executor record:

- setup time;
- number of human interventions;
- credentials required;
- number of agent/tool steps;
- execution time;
- retries;
- final status;
- evidence quality;
- verification quality;
- failure mode;
- reusable learning.

## Success condition

Success is not just browser interaction.

Success is:

same specialist objective -> different executor -> real execution evidence -> independent verification -> audit

## Human interaction target

Target:

- 0 manual interventions for installation where prerequisites are already present;
- 1 minimal intervention when a credential/login is genuinely required;
- 0 secret values written to logs;
- 0 invented success states.

## Final experiment

After all four complete, run the same objective through the four adapters and compare evidence and verification contracts. This is the portability proof for the Tool Expert Factory.
