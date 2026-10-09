import { describe, expect, it } from "vitest";
import { composeEcpContext } from "./context-pipeline.js";
import type { ContextRetrievalResult } from "../context/context-retrieval-gate.js";

const ready: ContextRetrievalResult = {
  traceId: "trace-ecp-1",
  status: "READY",
  reason: "HISTORICAL_CONTEXT_RETRIEVED",
  context: {
    projectId: "ecp",
    query: "pliego requisitos",
    facts: ["El pliego exige cuatro vehículos 4x2."],
    citations: [{
      sourceId: "bibliotecario:doc-17",
      documentId: "doc-17",
      version: "v4",
      title: "Pliego del procedimiento",
      excerpt: "Cuatro vehículos 4x2",
      provenance: "INSTITUTIONAL",
    }],
  },
};

describe("ECP shared context pipeline", () => {
  it("composes the shared retrieval result into a citation-preserving ECP pack", () => {
    const result = composeEcpContext(ready);
    expect(result.status).toBe("READY");
    expect(result.pack?.promptSection).toContain("ID DOCUMENTO: doc-17");
    expect(result.pack?.promptSection).toContain("ID FUENTE: bibliotecario:doc-17");
  });

  it("blocks empty retrieval rather than using local seeds", () => {
    const result = composeEcpContext({
      traceId: "trace-ecp-2",
      status: "EMPTY",
      reason: "HISTORICAL_CONTEXT_NOT_FOUND",
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers[0]).toContain("ECP_RETRIEVAL_EMPTY");
  });

  it("blocks a context pack from another project", () => {
    const result = composeEcpContext({
      ...ready,
      context: { ...ready.context!, projectId: "xolar" },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("ECP_PROJECT_SCOPE_MISMATCH");
  });

  it("blocks non-institutional citations", () => {
    const result = composeEcpContext({
      ...ready,
      context: {
        ...ready.context!,
        citations: [{ ...ready.context!.citations[0], provenance: "LOCAL_SEED" }],
      },
    });
    expect(result.status).toBe("BLOCKED");
  });
});
