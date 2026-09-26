"""AUREA functional browser-tool smoke tests.

Runs a harmless public TodoMVC task where supported. Credentials are read only
from environment variables and never printed.
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path


URL = "https://demo.playwright.dev/todomvc"
TASK = 'Open TodoMVC, add two todos named "AUREA-RUNTIME-1" and "AUREA-RUNTIME-2", and verify both are present.'


async def browser_use() -> dict:
    try:
        from browser_use import Agent, ChatGoogle
        llm = ChatGoogle(model="gemini-flash-latest")
        agent = Agent(task=TASK, llm=llm)
        result = await agent.run()
        return {"tool": "browser-use", "status": "EXECUTED", "evidence": "Agent.run completed", "result_type": type(result).__name__}
    except Exception as exc:
        return {"tool": "browser-use", "status": "BLOCKED", "blocker": type(exc).__name__, "detail": str(exc)[-1000:]}


async def skyvern() -> dict:
    try:
        from skyvern import Skyvern
        client = Skyvern.local()
        browser = await client.launch_local_browser(headless=True)
        page = await browser.get_working_page()
        await page.goto(URL)
        title = await page.title()
        await browser.close()
        return {"tool": "skyvern", "status": "EXECUTED", "evidence": "Skyvern.local + local browser navigation", "title": title}
    except Exception as exc:
        return {"tool": "skyvern", "status": "BLOCKED", "blocker": type(exc).__name__, "detail": str(exc)[-1000:]}


async def main() -> int:
    results = [await browser_use(), await skyvern()]
    print(json.dumps(results, ensure_ascii=False))
    return 0 if all(r["status"] == "EXECUTED" for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
