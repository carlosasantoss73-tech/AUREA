from __future__ import annotations

import asyncio
import json
import time
import uuid

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

URL = "https://demo.playwright.dev/todomvc/#/"
TASK = "Create two TodoMVC tasks and independently verify the resulting page state."


def text_content(result) -> str:
    return "".join(getattr(item, "text", str(item)) for item in result.content)


async def run_code(session: ClientSession, code: str) -> str:
    result = await session.call_tool("browser_run_code_unsafe", {"code": code})
    return text_content(result)


async def main() -> int:
    trace_id = f"mcp-work-{uuid.uuid4().hex[:12]}"
    started = time.time()
    audit = {
        "audit": "AUREA-WORK-EXECUTION-V1",
        "trace_id": trace_id,
        "tool": "playwright-mcp",
        "task": TASK,
        "url": URL,
        "steps": [],
    }

    server = StdioServerParameters(
        command="npx",
        args=["@playwright/mcp@latest", "--headless"],
    )

    try:
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                listed = await session.list_tools()
                names = {tool.name for tool in listed.tools}
                audit["server_initialized"] = True
                audit["tool_count"] = len(names)
                audit["available_tools"] = sorted(names)

                required = {"browser_navigate", "browser_run_code_unsafe"}
                missing = sorted(required - names)
                if missing:
                    audit["status"] = "BLOCKED"
                    audit["blocker"] = "required_tools_missing"
                    audit["missing_tools"] = missing
                    print(json.dumps(audit, ensure_ascii=False))
                    return 1

                nav = await session.call_tool("browser_navigate", {"url": URL})
                audit["steps"].append({
                    "step": "NAVIGATE",
                    "status": "EXECUTED",
                    "evidence": text_content(nav)[-2000:],
                })

                discovery = await run_code(
                    session,
                    """async (page) => ({
                        url: page.url(),
                        title: await page.title(),
                        input_present: await page.getByPlaceholder("What needs to be done?").count() === 1
                    })""",
                )
                audit["steps"].append({
                    "step": "DISCOVER_INPUT",
                    "status": "VERIFIED",
                    "evidence": discovery[-2000:],
                })
                if '"input_present":true' not in discovery.replace(" ", "").lower():
                    raise RuntimeError("ELEMENT_DISCOVERY_FAILURE")

                typed = await run_code(
                    session,
                    """async (page) => {
                        const input = page.getByPlaceholder("What needs to be done?");
                        await input.fill("AUREA-MCP-001");
                        return {typed: await input.inputValue()};
                    }""",
                )
                audit["steps"].append({
                    "step": "TYPE_FIRST",
                    "status": "EXECUTED",
                    "evidence": typed[-2000:],
                })

                first = await run_code(
                    session,
                    """async (page) => {
                        const input = page.getByPlaceholder("What needs to be done?");
                        await input.press("Enter");
                        const body = await page.locator("body").innerText();
                        return {created: body.includes("AUREA-MCP-001"), body_excerpt: body.slice(-1200)};
                    }""",
                )
                audit["steps"].append({
                    "step": "SUBMIT_FIRST",
                    "status": "VERIFIED",
                    "evidence": first[-2000:],
                })
                if '"created":true' not in first.replace(" ", "").lower():
                    raise RuntimeError("STATE_CHANGE_FAILURE_FIRST")

                second = await run_code(
                    session,
                    """async (page) => {
                        const input = page.getByPlaceholder("What needs to be done?");
                        await input.fill("AUREA-MCP-002");
                        await input.press("Enter");
                        const body = await page.locator("body").innerText();
                        return {
                            first: body.includes("AUREA-MCP-001"),
                            second: body.includes("AUREA-MCP-002"),
                            body_excerpt: body.slice(-1500)
                        };
                    }""",
                )
                audit["steps"].append({
                    "step": "SUBMIT_SECOND",
                    "status": "VERIFIED",
                    "evidence": second[-2500:],
                })
                normalized = second.replace(" ", "").lower()
                if '"first":true' not in normalized or '"second":true' not in normalized:
                    raise RuntimeError("STATE_CHANGE_FAILURE_SECOND")

                final = await run_code(
                    session,
                    """async (page) => {
                        const body = await page.locator("body").innerText();
                        return {
                            url: page.url(),
                            first: body.includes("AUREA-MCP-001"),
                            second: body.includes("AUREA-MCP-002"),
                            title_count: await page.locator(".todo-list li").count(),
                            body_excerpt: body.slice(-1800)
                        };
                    }""",
                )
                audit["steps"].append({
                    "step": "FINAL_INDEPENDENT_VERIFICATION",
                    "status": "VERIFIED",
                    "evidence": final[-3000:],
                })
                normalized = final.replace(" ", "").lower()
                if '"first":true' not in normalized or '"second":true' not in normalized:
                    raise RuntimeError("VERIFICATION_FAILURE")

                audit["status"] = "VERIFIED"
                audit["result"] = "The work objective was executed and independently verified."
                audit["duration_seconds"] = round(time.time() - started, 3)
                print(json.dumps(audit, ensure_ascii=False))
                return 0

    except Exception as exc:
        audit["status"] = "BLOCKED"
        audit["blocker"] = type(exc).__name__
        audit["error_class"] = str(exc)
        audit["duration_seconds"] = round(time.time() - started, 3)
        print(json.dumps(audit, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
