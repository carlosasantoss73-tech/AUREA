import { describe, expect, it } from "vitest";
import { HealthLedger } from "./health-ledger.js";
import { AureaSentinel } from "./sentinel.js";

describe("AureaSentinel", () => {
  it("records an observed signal with evidence", () => {
    const ledger = new HealthLedger();
    const sentinel = new AureaSentinel(ledger);
    const record = sentinel.observe({
      signalId: "SIG-001", traceId: "TRACE-001", domain: "PROVIDER", component: "provider-x",
      symptom: "unavailable", severity: "S2", evidence: ["timeout"],
    });
    expect(record.status).toBe("OPEN");
    expect(ledger.unresolved()).toHaveLength(1);
  });

  it("records controlled containment", () => {
    const ledger = new HealthLedger();
    const sentinel = new AureaSentinel(ledger);
    const record = sentinel.observe({ signalId: "SIG-002", traceId: "TRACE-002", domain: "EXECUTION", component: "work-cell", symptom: "blocked", severity: "S2", evidence: ["dependency"] });
    expect(sentinel.contain(record, "stop execution").status).toBe("CONTAINED");
  });
});
