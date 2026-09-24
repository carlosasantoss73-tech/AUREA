import { describe, expect, it } from "vitest";
import { createInstitutionalContextProvider } from "./institutional-context-provider";

describe("Institutional Bibliotecario adapter", () => {
  it("preserves authoritative evidence and provenance", async () => {
    const provider = createInstitutionalContextProvider({
      async search() {
        return [{
          id: "doc-1",
          projectId: "aurea",
          title: "AUREA decision",
          text: "Bibliotecario is the institutional authority.",
          sourceId: "knowledge-os:doc-1",
          version: 7,
        }];
      },
    });

    const result = await provider.retrieve({
      projectId: "aurea",
      query: "What is the institutional authority?",
      traceId: "trace-1",
    });

    expect(result.facts).toEqual(["Bibliotecario is the institutional authority."]);
    expect(result.citations).toMatchObject([{
      sourceId: "knowledge-os:doc-1",
      documentId: "doc-1",
      version: 7,
    }]);
  });

  it("does not leak another project's records", async () => {
    const provider = createInstitutionalContextProvider({
      async search() {
        return [
          { id: "a", projectId: "aurea", title: "A", text: "A", sourceId: "s-a", version: 1 },
          { id: "b", projectId: "other", title: "B", text: "B", sourceId: "s-b", version: 1 },
        ];
      },
    });

    const result = await provider.retrieve({
      projectId: "aurea",
      query: "A",
      traceId: "trace-2",
    });

    expect(result.facts).toEqual(["A"]);
    expect(result.citations.map((item) => item.documentId)).toEqual(["a"]);
  });

  it("returns no evidence rather than inventing it", async () => {
    const provider = createInstitutionalContextProvider({
      async search() { return []; },
    });

    const result = await provider.retrieve({
      projectId: "aurea",
      query: "missing",
      traceId: "trace-3",
    });

    expect(result.facts).toEqual([]);
    expect(result.citations).toEqual([]);
  });
});
