import { describe, expect, it, vi } from "vitest";
import { createConchitaInstitutionalContextProvider } from "./conchita-institutional-context.js";

describe("Conchita institutional context provider", () => {
  it("returns only scoped approved institutional records with source/version evidence", async () => {
    const index = {
      estado_indice: "VIGENTE",
      version_indice: 12,
      registros_nuevos_v011: [
        {
          id: "BIB-TEST-001",
          proyecto: "CANONICAL-TEST",
          nombre: "Continuidad de prueba",
          descripcion: "Regla institucional aprobada para la prueba.",
          fuente: "DOC-TEST-001",
          version: "v3",
          estado: "APROBADO",
          ubicacion: { fileId: "DOC-TEST-001" },
        },
        {
          id: "BIB-OTHER-001",
          proyecto: "OTHER-PROJECT",
          nombre: "No debe aparecer",
          descripcion: "Registro de otro proyecto.",
          fuente: "DOC-OTHER",
          version: "v1",
          estado: "APROBADO",
        },
        {
          id: "BIB-PENDING-001",
          proyecto: "CANONICAL-TEST",
          nombre: "No aprobado",
          descripcion: "No debe promoverse.",
          fuente: "DOC-PENDING",
          version: "v1",
          estado: "PROPUESTA",
        },
      ],
    };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("alt=media")) {
        return new Response(JSON.stringify(index), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: "INDEX-TEST",
        name: "index.json",
        mimeType: "application/json",
        capabilities: { canEdit: false, canDownload: true, canCopy: false },
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const provider = createConchitaInstitutionalContextProvider({
      indexFileId: "INDEX-TEST",
      accessToken: "readonly-test-token",
      fetchImpl,
    });
    const result = await provider.retrieve({
      projectId: "CANONICAL-TEST",
      query: "continuidad institucional",
      traceId: "TRACE-TEST-001",
    });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({
      sourceId: "DOC-TEST-001",
      documentId: "BIB-TEST-001",
      version: "v3",
      provenance: "INSTITUTIONAL",
    });
    expect(result.facts).toEqual(["Regla institucional aprobada para la prueba."]);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("rejects an empty index ID before attempting network access", () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(() => createConchitaInstitutionalContextProvider({
      indexFileId: "",
      accessToken: "readonly-test-token",
      fetchImpl,
    })).toThrow("BIBLIOTECARIO_INDEX_ID_REQUIRED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
