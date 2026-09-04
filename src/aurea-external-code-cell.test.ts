import { describe, expect, it } from "vitest";
import {
  ExternalCodeCellRequest,
  ExternalCodeCellRuntime,
} from "./aurea-external-code-cell";

const request: ExternalCodeCellRequest = {
  cellId: "cell-test",
  traceId: "trace-test",
  objective: "Validate bounded code-cell execution",
  companyScope: "AUREA",
  projectScope: "external-code-cell",
  responsibility: "QA",
  requiredCapabilities: ["coding"],
  authorityLevel: "BRANCH_ONLY",
  allowedKnowledge: ["repository files required by the task"],
  restrictions: ["no main writes", "no secrets in evidence"],
  dependencies: [],
  inputEvidence: ["test-fixture"],
  expectedOutput: ["validated result"],
  validationCriteria: ["identity matches", "evidence present", "confidence is bounded"],
};

describe("ExternalCodeCellRuntime", () => {
  it("fails closed when the cell is not registered", async () => {
    const runtime = new ExternalCodeCellRuntime();
    const result = await runtime.execute(request);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("EXTERNAL_CODE_CELL_NOT_REGISTERED");
  });

  it("fails closed when the cell is registered but not executable", async () => {
    const runtime = new ExternalCodeCellRuntime();
    runtime.register({
      cellId: request.cellId,
      providerId: "external-agent-test",
      status: "CONNECTED",
      capabilities: ["coding"],
      healthEvidence: ["connection:test"],
      execute: async () => {
        throw new Error("must not execute");
      },
    });

    const result = await runtime.execute(request);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("EXTERNAL_CODE_CELL_NOT_EXECUTABLE:CONNECTED");
  });

  it("accepts an executable result only when identity, evidence and confidence are valid", async () => {
    const runtime = new ExternalCodeCellRuntime();
    runtime.register({
      cellId: request.cellId,
      providerId: "external-agent-test",
      status: "EXECUTABLE",
      capabilities: ["coding"],
      healthEvidence: ["connection:test", "execution:test"],
      execute: async () => ({
        cellId: request.cellId,
        traceId: request.traceId,
        status: "COMPLETED",
        result: "validated",
        facts: ["test passed"],
        inferences: [],
        assumptions: [],
        risks: [],
        evidence: ["TEST:EVIDENCE"],
        confidence: 0.9,
        recommendedAction: "retain",
        blockers: [],
        reusableLearning: ["identity and evidence must be checked at the runtime boundary"],
      }),
    });

    const result = await runtime.execute(request);

    expect(result.status).toBe("COMPLETED");
    expect(result.cellId).toBe(request.cellId);
    expect(result.traceId).toBe(request.traceId);
    expect(result.evidence).toContain("TEST:EVIDENCE");
  });

  it("blocks an executable result with mismatched identity", async () => {
    const runtime = new ExternalCodeCellRuntime();
    runtime.register({
      cellId: request.cellId,
      providerId: "external-agent-test",
      status: "EXECUTABLE",
      capabilities: ["coding"],
      healthEvidence: ["connection:test"],
      execute: async () => ({
        cellId: "wrong-cell",
        traceId: request.traceId,
        status: "COMPLETED",
        result: "invalid",
        facts: [],
        inferences: [],
        assumptions: [],
        risks: [],
        evidence: ["TEST:EVIDENCE"],
        confidence: 1,
        recommendedAction: "stop",
        blockers: [],
        reusableLearning: [],
      }),
    });

    const result = await runtime.execute(request);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("EXTERNAL_CODE_CELL_RESULT_IDENTITY_MISMATCH");
  });
});
