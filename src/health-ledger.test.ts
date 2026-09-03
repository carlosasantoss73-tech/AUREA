import { describe, expect, it } from "vitest";
import { HealthLedger } from "./health-ledger.js";

describe("HealthLedger", () => {
  it("requires evidence and keeps unresolved records queryable", () => {
    const ledger = new HealthLedger();
    expect(() => ledger.append({
      healthRecordId: "HR-001", timestamp: new Date().toISOString(), severity: "S1", domain: "EXECUTION",
      component: "test", traceId: "TRACE-001", symptom: "failure", evidence: [], status: "OPEN",
    })).toThrow("HEALTH_RECORD_REQUIRES_ID_TRACE_AND_EVIDENCE");

    ledger.append({
      healthRecordId: "HR-002", timestamp: new Date().toISOString(), severity: "S1", domain: "EXECUTION",
      component: "test", traceId: "TRACE-002", symptom: "failure", evidence: ["evidence"], status: "OPEN",
    });
    expect(ledger.unresolved()).toHaveLength(1);
  });
});
