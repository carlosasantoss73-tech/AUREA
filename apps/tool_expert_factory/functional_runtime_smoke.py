from __future__ import annotations
import asyncio, json

URL="https://demo.playwright.dev/todomvc"
TASK='Open TodoMVC, add two todos named "AUREA-RUNTIME-1" and "AUREA-RUNTIME-2", then verify both are present.'

async def browser_use():
    try:
        from browser_use import Agent, BrowserProfile, BrowserSession, ChatGoogle
        session=BrowserSession(browser_profile=BrowserProfile(headless=True, chromium_sandbox=False))
        history=await Agent(task=TASK,llm=ChatGoogle(model="gemini-flash-latest"),browser_session=session).run(max_steps=12)
        ok=history.is_successful() is True
        return {"tool":"browser-use","status":"EXECUTED" if ok else "BLOCKED","evidence":{"is_done":history.is_done(),"is_successful":history.is_successful(),"urls":history.urls()[-5:],"final_result":str(history.final_result())[-1000:]},**({"blocker":"agent_execution_not_successful"} if not ok else {})}
    except Exception as e:
        return {"tool":"browser-use","status":"BLOCKED","blocker":type(e).__name__,"detail":str(e)[-1000:]}

async def skyvern():
    browser=None
    try:
        from skyvern import Skyvern
        browser=await Skyvern.local().launch_local_browser(headless=True)
        page=await browser.get_working_page()
        await page.goto(URL)
        await page.agent.run_task(TASK)
        body=await page.locator("body").text_content() or ""
        ok="AUREA-RUNTIME-1" in body and "AUREA-RUNTIME-2" in body
        return {"tool":"skyvern","status":"EXECUTED" if ok else "BLOCKED","evidence":{"url":URL,"verified_todos":ok,"body_excerpt":body[-1500:]},"blocker":None if ok else "page_verification_failed"}
    except Exception as e:
        return {"tool":"skyvern","status":"BLOCKED","blocker":type(e).__name__,"detail":str(e)[-1000:]}
    finally:
        if browser:
            try: await browser.close()
            except Exception: pass

async def main():
    results=[await browser_use(),await skyvern()]
    print(json.dumps(results,ensure_ascii=False))
    return 0 if all(x["status"]=="EXECUTED" for x in results) else 1
if __name__=="__main__": raise SystemExit(asyncio.run(main()))
