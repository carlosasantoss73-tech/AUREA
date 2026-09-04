import { describe, expect, it } from "vitest";
import { decideRecovery } from "./recovery-event-contract.js";

const baseEvent = {
  eventId: "evt-1",
  traceId: "trace-1",
  workCellId: "wc-1",
  projectId: "p-1",
  occurredAt: "2026-09-04T00:00:00Z",
  evidence: ["EVENT:PERSISTED"],
};

const baseState = {
  workCellId: "wc-1",
  state: "RUNNING",
  traceId: "trace-1",
  evidence: ["STATE:RUNNING"],
};

describe("decideRecovery", () => {
  it("resumes an interrupted work cell", () => {
    expect(decideRecovery({ ...baseEvent, eventType: "EXECUTION_INTERRUPTED" }, baseState).decision).toBe("RESUME");
  });

  it("retries only an explicit execution failure", () => {
    expect(decideRecovery({ ...baseEvent, eventType: "EXECUTION_FAILED" }, baseState).decision).toBe("RETRY_SAFE_STEP");
  });

  it("escalates scope or trace divergence", () => {
    expect(decideRecovery({ ...baseEvent, eventType: "EXECUTION_INTERRUPTED", workCellId: "other" }, baseState).reason).toBe("RECOVERY_SCOPE_MISMATCH");
    expect(decideRecovery({ ...baseEvent, eventType: "EXECUTION_INTERRUPTED", traceId: "other" }, baseState).reason).toBe("RECOVERY_TRACE_MISMATCH");
  });

  it("contains terminal work cells", () => {
    expect(decideRecovery({ ...baseEvent, eventType: "EXECUTION_INTERRUPTED" }, { ...baseState, state: "CLOSED" }).decision).toBe("CONTAIN");
  });

  it("escalates unknown events", () => {
    expect(decideRecovery({ ...baseEvent, eventType: "UNKNOWN" }, baseState).decision).toBe("ESCALATE");
  });
});
