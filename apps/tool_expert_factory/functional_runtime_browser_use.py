"""Real Browser Use runtime smoke for AUREA.

Uses Browser Use Cloud for the browser and its hosted BU2 model so the audit
does not depend on the previously exhausted Gemini free-tier quota.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

from browser_use import Agent, Browser, ChatBrowserUse


TASK = (
    'Open https://demo.playwright.dev/todomvc, add one todo named '
    '"AUREA-AUDIT-BROWSER-USE-001", then verify it is present.'
)


async def main() -> int:
    if not os.environ.get("BROWSER_USE_API_KEY", "").strip():
        print(json.dumps({
            "tool": "browser-use",
            "status": "BLOCKED",
            "blocker": "browser_use_api_key_missing",
            "next_action": "Configure BROWSER_USE_API_KEY in the CI environment.",
        }))
        return 2

    browser = Browser(use_cloud=True)
    try:
        agent = Agent(
            task=TASK,
            llm=ChatBrowserUse(model="bu-2-0"),
            browser=browser,
        )
        history = await agent.run(max_steps=12)
        evidence = {
            "is_done": history.is_done(),
            "is_successful": history.is_successful(),
            "urls": history.urls()[-5:],
            "final_result": str(history.final_result())[-1500:],
        }
        status = "VERIFIED" if history.is_successful() is True else "BLOCKED"
        print(json.dumps({
            "tool": "browser-use",
            "status": status,
            "audit_id": "AUREA-WORK-EXECUTION-BROWSER-USE-V1",
            "task": TASK,
            "evidence": evidence,
        }, ensure_ascii=False))
        return 0 if status == "VERIFIED" else 1
    finally:
        # Browser Use Cloud sessions must be stopped explicitly when exposed
        # through the SDK; the Agent/browser lifecycle handles task cleanup.
        pass


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
