import { localBrowser, Stagehand } from "@browserbasehq/stagehand";

const URL = "https://demo.playwright.dev/todomvc/#/";

async function main() {
  const browser = await localBrowser.launch({ headless: true });
  try {
    const stagehand = await Stagehand.create({
      browser,
      model: {
        modelName: "google/gemini-3.0-flash",
        apiKey: process.env.GEMINI_API_KEY,
      },
    });
    try {
      const [page] = await browser.context.pages();
      await page.goto(URL);
      const input = page.getByPlaceholder("What needs to be done?");
      await input.fill("AUREA-STAGEHAND-1");
      await input.press("Enter");
      await input.fill("AUREA-STAGEHAND-2");
      await input.press("Enter");
      const body = await page.locator("body").innerText();
      const ok = body.includes("AUREA-STAGEHAND-1") && body.includes("AUREA-STAGEHAND-2");
      console.log(JSON.stringify({
        tool: "stagehand",
        status: ok ? "EXECUTED" : "BLOCKED",
        evidence: { url: page.url(), verified_todos: ok, stagehand_created: true, body_excerpt: body.slice(-1500) },
        ...(ok ? {} : { blocker: "task_verification_failed" })
      }));
      process.exitCode = ok ? 0 : 1;
    } finally {
      await stagehand.close();
    }
  } catch (error) {
    console.log(JSON.stringify({
      tool: "stagehand",
      status: "BLOCKED",
      blocker: error?.name ?? "Error",
      detail: String(error?.message ?? error).slice(-1500),
    }));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
