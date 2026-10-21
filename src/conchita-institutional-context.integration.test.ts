import { describe, expect, it } from "vitest";
import { createConchitaInstitutionalContextProvider } from "./conchita-institutional-context";
import { ContextRetrievalGate } from "./context/context-retrieval-gate";

function driveFetch(payload: unknown) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("alt=media")) {
      return new Response(JSON.stringify(payload), { status: 200 });
    }
    const id = decodeURIComponent(url.match(/files\/([^?]+)/)?.[1] ?? "");
    return new Response(JSON.stringify({
      id,
      name: "INDICE_MAESTRO_v011.json",
      mimeType: "application/json",
      capabilities: { canEdit: false, canDownload: true, canCopy: true },
    }), { status: 200 });
  };
}

const approvedIndex = {
  estado_indice: "VIGENTE",
  version_indice: "11",
  registros_nuevos_v011: [{
    id: "record-aurea-1",
    proyecto: "AUREA",
    nombre: "Procedimiento institucional aprobado",
    descripcion: "Procedimiento vigente autorizado para el proyecto AUREA.",
    fuente: "KNOWLEDGE_OS",
    estado: "APROBADO",
    version: "1",
    ubicacion: { fileId: "source-document-1" },
  }],
};

describe("Conchita institutional context integration", () => {
  it("returns institutional citations from the read-only Drive adapter", async () => {
    const provider = createConchitaInstitutionalContextProvider({
      indexFileId: "verified-test-index",
      accessToken: "test-token",
      fetchImpl: driveFetch(approvedIndex),
    });

    const result = await provider.retrieve({
      projectId: "AUREA",
      query: "procedimiento institucional",
      traceId: "integration-approved-record",
    });

    expect(result.projectId).toBe("AUREA");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({
      sourceId: "source-document-1",
      documentId: "record-aurea-1",
      provenance: "INSTITUTIONAL",
    });
    expect(result.facts).toEqual([
      "Procedimiento vigente autorizado para el proyecto AUREA.",
    ]);
  });

  it("returns no institutional evidence when the current index has no approved records", async () => {
    const provider = createConchitaInstitutionalContextProvider({
      indexFileId: "verified-test-index",
      accessToken: "test-token",
      fetchImpl: driveFetch({
        estado_indice: "VIGENTE",
        version_indice: "11",
        registros_nuevos_v011: [{
          id: "proposal-only",
          proyecto: "AUREA",
          nombre: "Propuesta no aprobada",
          descripcion: "Este contenido no debe recuperarse.",
          fuente: "KNOWLEDGE_OS",
          estado: "PROPUESTA",
          version: "1",
        }],
      }),
    });

    const result = await provider.retrieve({
      projectId: "AUREA",
      query: "propuesta",
      traceId: "integration-no-approved-records",
    });

    expect(result.citations).toEqual([]);
    expect(result.facts).toEqual([]);
  });
});
