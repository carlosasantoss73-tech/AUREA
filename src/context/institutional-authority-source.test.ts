import { describe, expect, it } from "vitest";
import { createInstitutionalAuthoritySource } from "./institutional-authority-source.js";
import type { InstitutionalAuthorityReader } from "./institutional-authority.js";

function readerFixture(): InstitutionalAuthorityReader {
  return {
    async readCurrentIndex() {
      return { fileId: "index-current", version: 4, state: "VIGENTE", previousIndexFileId: "index-old" };
    },
    async readIndex(fileId) {
      return { fileId, version: 3, state: "REEMPLAZADO" };
    },
    async readRecords(indexFileId, input) {
      expect(indexFileId).toBe("index-current");
      expect(input.projectId).toBe("ecp");
      return [
        { id: "doc-1", projectId: "ecp", title: "Pliego vigente", text: "Cuatro vehículos 4x2.", sourceId: "bib:doc-1", version: 2, state: "VIGENTE" },
        { id: "doc-2", projectId: "otro-proyecto", title: "No corresponde", text: "Texto ajeno.", sourceId: "bib:doc-2", version: 1, state: "VIGENTE" },
        { id: "doc-3", projectId: "ecp", title: "Dato reemplazado", text: "Texto antiguo.", sourceId: "bib:doc-3", version: 1, state: "REEMPLAZADO" },
        { id: "doc-4", projectId: "ecp", title: "Pendiente", text: "No aprobado.", sourceId: "bib:doc-4", version: 1, state: "PENDIENTE" },
      ];
    },
  };
}

describe("institutional authority source adapter", () => {
  it("returns only approved/current records scoped to the requested project", async () => {
    const source = createInstitutionalAuthoritySource(readerFixture());
    const records = await source.search({ projectId: "ecp", query: "vehículos", traceId: "trace-1" });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: "doc-1",
      projectId: "ecp",
      sourceId: "bib:doc-1",
      version: 2,
      text: "Cuatro vehículos 4x2.",
    });
  });

  it("fails closed when the current index is not vigente", async () => {
    const fixture = readerFixture();
    const broken: InstitutionalAuthorityReader = {
      ...fixture,
      async readCurrentIndex() {
        return { fileId: "index-current", version: 4, state: "REEMPLAZADO" };
      },
    };
    const source = createInstitutionalAuthoritySource(broken);
    await expect(source.search({ projectId: "ecp", query: "pliego", traceId: "trace-2" }))
      .rejects.toThrow("INSTITUTIONAL_CURRENT_INDEX_NOT_VIGENTE");
  });
});
