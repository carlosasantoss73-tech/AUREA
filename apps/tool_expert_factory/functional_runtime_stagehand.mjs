import { localBrowser, Stagehand } from "@browserbasehq/stagehand";

const URL = "https://demo.playwright.dev/todomvc/#/";
const TASK = "Create two TodoMVC tasks and independently verify the resulting page state.";

async function main() {
  const started = Date.now();
  const audit = {
    audit: "AUREA-WORK-EXECUTION-STAGEHAND-V1",
    trace_id: `stagehand-work-${Date.now().toString(36)}`,
    tool: "stagehand",
    task: TASK,
    url: URL,
    steps: [],
  };

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
      const page = await browser.context.activePage();
      if (!page) throw new Error("PAGE_INITIALIZATION_FAILURE");

      await page.goto(URL);
      audit.steps.push({ step: "NAVIGATE", status: "EXECUTED", evidence: { url: page.url() } });

      const inputCount = await page.getByPlaceholder("What needs to be done?").count();
      audit.steps.push({ step: "DISCOVER_INPUT", status: inputCount === 1 ? "VERIFIED" : "BLOCKED", evidence: { input_count: inputCount } });
      if (inputCount !== 1) throw new Error("ELEMENT_DISCOVERY_FAILURE");

      const first = await page.act({ action: 'add a todo named "AUREA-STAGEHAND-001"' });
      audit.steps.push({ step: "ACT_FIRST", status: first?.success === false ? "BLOCKED" : "EXECUTED", evidence: first });
      if (first?.success === false) throw new Error("ACTION_FAILURE_FIRST");

      const afterFirst = await page.locator("body").innerText();
      const firstVerified = afterFirst.includes("AUREA-STAGEHAND-001");
      audit.steps.push({ step: "VERIFY_FIRST", status: firstVerified ? "VERIFIED" : "BLOCKED", evidence: { contains_first: firstVerified } });
      if (!firstVerified) throw new Error("VERIFICATION_FAILURE_FIRST");

      const second = await page.act({ action: 'add a todo named "AUREA-STAGEHAND-002"' });
      audit.steps.push({ step: "ACT_SECOND", status: second?.success === false ? "BLOCKED" : "EXECUTED", evidence: second });
      if (second?.success === false) throw new Error("ACTION_FAILURE_SECOND");

      const afterSecond = await page.locator("body").innerText();
      const secondVerified =
        afterSecond.includes("AUREA-STAGEHAND-001") &&
        afterSecond.includes("AUREA-STAGEHAND-002");
      audit.steps.push({ step: "VERIFY_SECOND", status: secondVerified ? "VERIFIED" : "BLOCKED", evidence: { contains_first: afterSecond.includes("AUREA-STAGEHAND-001"), contains_second: afterSecond.includes("AUREA-STAGEHAND-002") } });
      if (!secondVerified) throw new Error("VERIFICATION_FAILURE_SECOND");

      const final = await page.locator(".todo-list li").count();
      const finalBody = await page.locator("body").innerText();
      const finalVerified =
        final >= 2 &&
        finalBody.includes("AUREA-STAGEHAND-001") &&
        finalBody.includes("AUREA-STAGEHAND-002");

      audit.steps.push({
        step: "FINAL_INDEPENDENT_VERIFICATION",
        status: finalVerified ? "VERIFIED" : "BLOCKED",
        evidence: { todo_count: final, first: finalBody.includes("AUREA-STAGEHAND-001"), second: finalBody.includes("AUREA-STAGEHAND-002") },
      });
      if (!finalVerified) throw new Error("VERIFICATION_FAILURE");

      audit.status = "VERIFIED";
      audit.result = "Stagehand executed the work and the final page state was independently verified.";
      audit.duration_seconds = (Date.now() - started) / 1000;
      console.log(JSON.stringify(audit, null, 2));
    } finally {
      await stagehand.close();
    }
  } catch (error) {
    audit.status = "BLOCKED";
    audit.blocker = error?.name ?? "Error";
    audit.error_class = String(error?.message ?? error);
    audit.duration_seconds = (Date.now() - started) / 1000;
    console.log(JSON.stringify(audit, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
