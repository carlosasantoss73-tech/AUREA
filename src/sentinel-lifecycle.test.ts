import { describe, expect, it } from "vitest";
import { HealthLedger } from "./health-ledger.js";
import { SentinelLifecycle } from "./sentinel-lifecycle.js";

function signal(severity: "S0" | "S1" | "S2" | "S3" | "S4") {
  return {
    signalId: `signal-${severity}`,
    traceId: `trace-${severity}`,
    domain: "EXECUTION" as const,
    component: "runtime",
    symptom: "test incident",
    severity,
    evidence: ["TEST:EVIDENCE"],
  };
}

describe("SentinelLifecycle", () => {
  it("contains S2 and records diagnosis, classification, verification and learning", () => {
    const ledger = new HealthLedger();
    const lifecycle = new SentinelLifecycle(ledger);

    const opened = lifecycle.process(signal("S2"));
    expect(opened.decision.disposition).toBe("CONTAIN");
    expect(opened.record.status).toBe("CONTAINED");

    const diagnosed = lifecycle.diagnose(opened.record, "provider timeout", "upstream latency", "execution delayed");
    const classified = lifecycle.classify(diagnosed, "KNOWN_TRANSIENT", "retry after backoff");
    const verified = lifecycle.verify(classified, "provider recovered", true);
    const learned = lifecycle.learn(verified, "timeout requires bounded retry", "ALWAYS_BOUND_RETRY_AND_RECORD_BACKOFF");

    expect(learned.status).toBe("RESOLVED");
    expect(learned.learning).toContain("bounded retry");
    expect(learned.preventiveRule).toBe("ALWAYS_BOUND_RETRY_AND_RECORD_BACKOFF");
    expect(ledger.list().length).toBe(6);
  });

  it("escalates S4 instead of auto-containing it", () => {
    const ledger = new HealthLedger();
    const lifecycle = new SentinelLifecycle(ledger);

    const result = lifecycle.process(signal("S4"));

    expect(result.decision.disposition).toBe("ESCALATE");
    expect(result.record.status).toBe("ESCALATED");
    expect(result.record.actionTaken).toBe("ESCALATED_TO_HUMAN_GOVERNANCE");
  });
});
