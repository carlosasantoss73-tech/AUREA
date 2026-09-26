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
  let stagehand;
  try {
    stagehand = await Stagehand.create({
      browser,
      model: {
        modelName: "google/gemini-3-flash-preview",
        apiKey: process.env.GEMINI_API_KEY,
      },
    });

    try {
      const page = await browser.context.activePage();
      if (!page) throw new Error("PAGE_INITIALIZATION_FAILURE");

      await page.goto(URL);
      audit.steps.push({ step: "NAVIGATE", status: "EXECUTED", evidence: { url: page.url() } });

      const inputCount = await page.locator("input.new-todo").count();
      audit.steps.push({ step: "DISCOVER_INPUT", status: inputCount === 1 ? "VERIFIED" : "BLOCKED", evidence: { input_count: inputCount } });
      if (inputCount !== 1) throw new Error("ELEMENT_DISCOVERY_FAILURE");

      const firstFill = await stagehand.act({
      selector: "input.new-todo",
      description: "Fill the new todo input with AUREA-STAGEHAND-001",
      method: "fill",
      arguments: ["AUREA-STAGEHAND-001"],
    });
    const firstSubmit = await stagehand.act({
      selector: "input.new-todo",
      description: "Press Enter to submit the first todo",
      method: "press",
      arguments: ["Enter"],
    });
    const first = { fill: firstFill, submit: firstSubmit };
      audit.steps.push({
        step: "ACT_FIRST",
        status: "EXECUTED",
        execution_mode: "deterministic_stagehand_action",
        evidence: first,
      });
      const firstCount = await page.locator(".todo-list li").count();
      const firstBody = await page.locator("body").innerText();
      const firstVerified = firstCount >= 1 && firstBody.includes("AUREA-STAGEHAND-001");
      audit.steps.push({ step: "VERIFY_FIRST", status: firstVerified ? "VERIFIED" : "BLOCKED", evidence: { todo_count: firstCount, contains_first: firstBody.includes("AUREA-STAGEHAND-001") } });
      if (!firstVerified) throw new Error("VERIFICATION_FAILURE_FIRST");

      const secondFill = await stagehand.act({
        selector: "input.new-todo",
        description: "Fill the new todo input with AUREA-STAGEHAND-002",
        method: "fill",
        arguments: ["AUREA-STAGEHAND-002"],
      });
      const secondSubmit = await stagehand.act({
        selector: "input.new-todo",
        description: "Press Enter to submit the second todo",
        method: "press",
        arguments: ["Enter"],
      });
      const second = { fill: secondFill, submit: secondSubmit };
      audit.steps.push({
        step: "ACT_SECOND",
        status: "EXECUTED",
        execution_mode: "deterministic_stagehand_action",
        evidence: second,
      });
      const secondCount = await page.locator(".todo-list li").count();
      const secondBody = await page.locator("body").innerText();
      const secondVerified = secondCount >= 2 && secondBody.includes("AUREA-STAGEHAND-001") && secondBody.includes("AUREA-STAGEHAND-002");
      audit.steps.push({ step: "VERIFY_SECOND", status: secondVerified ? "VERIFIED" : "BLOCKED", evidence: { todo_count: secondCount, contains_first: secondBody.includes("AUREA-STAGEHAND-001"), contains_second: secondBody.includes("AUREA-STAGEHAND-002") } });
      if (!secondVerified) throw new Error("VERIFICATION_FAILURE_SECOND");

      const final = await page.locator(".todo-list li").count();
      const finalBody = await page.locator("body").innerText();
      const finalVerified = final >= 2 && finalBody.includes("AUREA-STAGEHAND-001") && finalBody.includes("AUREA-STAGEHAND-002");
      audit.steps.push({ step: "FINAL_INDEPENDENT_VERIFICATION", status: finalVerified ? "VERIFIED" : "BLOCKED", evidence: { todo_count: final, first: finalBody.includes("AUREA-STAGEHAND-001"), second: finalBody.includes("AUREA-STAGEHAND-002") } });
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
