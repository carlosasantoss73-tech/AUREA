from __future__ import annotations
import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

URL = "https://demo.playwright.dev/todomvc"

async def main() -> int:
    server = StdioServerParameters(
        command="npx",
        args=["@playwright/mcp@latest", "--headless"],
    )
    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            names = {t.name for t in tools.tools}
            evidence = {"server_initialized": True, "tool_count": len(names), "tools": sorted(names)}

            if "browser_navigate" not in names:
                print(json.dumps({"tool":"playwright-mcp","status":"BLOCKED","evidence":evidence,"blocker":"browser_navigate_missing"}))
                return 1

            nav = await session.call_tool("browser_navigate", {"url": URL})
            evidence["navigation_called"] = True
            evidence["navigation_result"] = str(nav.content)[:1500]

            if "browser_run_code_unsafe" in names:
                code = """async (page) => {
                  await page.goto("https://demo.playwright.dev/todomvc/#/");
                  const input = page.getByPlaceholder("What needs to be done?");
                  await input.fill("AUREA-MCP-1");
                  await input.press("Enter");
                  await input.fill("AUREA-MCP-2");
                  await input.press("Enter");
                  const body = await page.locator("body").innerText();
                  return {ok: body.includes("AUREA-MCP-1") && body.includes("AUREA-MCP-2"), body};
                }"""
                result = await session.call_tool("browser_run_code_unsafe", {"code": code})
                raw = "".join(getattr(x, "text", str(x)) for x in result.content)
                evidence["verification"] = raw[-3000:]
                ok = "AUREA-MCP-1" in raw and "AUREA-MCP-2" in raw
            else:
                snapshot = await session.call_tool("browser_snapshot", {})
                evidence["snapshot"] = "".join(getattr(x, "text", str(x)) for x in snapshot.content)[-5000:]
                ok = False

            out = {"tool":"playwright-mcp","status":"EXECUTED" if ok else "BLOCKED","evidence":evidence}
            if not ok:
                out["blocker"] = "mcp_task_verification_failed"
            print(json.dumps(out, ensure_ascii=False))
            return 0 if ok else 1

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
