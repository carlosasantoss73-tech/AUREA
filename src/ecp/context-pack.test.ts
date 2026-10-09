import { describe, expect, it } from "vitest";
import { buildEcpContextPack } from "./context-pack.js";
import type { RetrievedContext } from "../context/context-retrieval-gate.js";

const context: RetrievedContext = {
  projectId: "ecp",
  query: "pliego",
  facts: ["El requisito exige cuatro vehículos."],
  citations: [{
    sourceId: "soce:pliego-1",
    documentId: "pliego-1",
    version: 3,
    title: "Pliego oficial",
    excerpt: "Cuatro vehículos 4x2.",
    provenance: "INSTITUTIONAL",
  }],
};

describe("ECP citation-preserving context pack", () => {
  it("renders every fact with source identity and version", () => {
    const result = buildEcpContextPack({ context, traceId: "t-1", institutionalOnly: true });
    expect(result.status).toBe("READY");
    expect(result.promptSection).toContain("ID DOCUMENTO: pliego-1");
    expect(result.promptSection).toContain("VERSIÓN: 3");
  });

  it("blocks absent context", () => {
    expect(buildEcpContextPack({ traceId: "t-2" }).blockers)
      .toContain("ECP_CONTEXT_REQUIRED_BUT_NOT_FOUND");
  });

  it("blocks local seed when institutional-only mode is required", () => {
    const local = { ...context, citations: [{ ...context.citations[0], provenance: "LOCAL_SEED" as const }] };
    expect(buildEcpContextPack({ context: local, traceId: "t-3", institutionalOnly: true }).status)
      .toBe("BLOCKED");
  });

  it("blocks missing citation metadata", () => {
    const invalid = { ...context, citations: [{ ...context.citations[0], documentId: undefined }] };
    expect(buildEcpContextPack({ context: invalid, traceId: "t-4" }).status).toBe("BLOCKED");
  });

  it("blocks fact/citation count mismatch before rendering", () => {
    const mismatch = { ...context, facts: [...context.facts, "Otro hecho sin cita"] };
    expect(buildEcpContextPack({ context: mismatch, traceId: "t-5" }).blockers)
      .toContain("ECP_FACT_CITATION_COUNT_MISMATCH");
    expect(buildEcpContextPack({ context: mismatch, traceId: "t-5" }).promptSection).toBeUndefined();
  });
});
