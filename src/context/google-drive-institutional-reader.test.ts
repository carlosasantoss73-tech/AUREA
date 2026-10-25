import { describe, expect, it } from "vitest";
import { GoogleDriveInstitutionalReader } from "./google-drive-institutional-reader";

const index = (fileId: string, previous?: string) => ({
  estado_indice: "VIGENTE",
  version_indice: "11",
  indice_anterior: previous
    ? { estado: "REEMPLAZADO", fileId: previous, version: "10" }
    : undefined,
  registros_nuevos_v011: [{
    id: `record-${fileId}`,
    proyecto: "aurea",
    nombre: "Registro institucional de prueba",
    descripcion: "Evidencia institucional de prueba.",
    fuente: "KNOWLEDGE_OS",
    estado: "VIGENTE",
    version: "1",
    ubicacion: { carpeta: "00_CONTROL", fileId: `source-${fileId}` },
  }],
});

function makeFetch(payloads: Record<string, unknown>) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = url.match(/files\/([^?]+)/);
    const id = decodeURIComponent(match?.[1] ?? "");
    if (url.includes("alt=media")) return new Response(JSON.stringify(payloads[id]), { status: 200 });
    return new Response(JSON.stringify({
      id,
      name: "INDICE_MAESTRO_v011.json",
      mimeType: "application/json",
      capabilities: { canEdit: false, canDownload: true, canCopy: true },
    }), { status: 200 });
  };
}

describe("Google Drive institutional reader", () => {
  it("reads the observed V011 shape and traverses the index chain", async () => {
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current",
      accessToken: "test-token",
      fetchImpl: makeFetch({ current: index("current", "previous"), previous: index("previous") }),
    });

    const current = await reader.readCurrentIndex("trace-1");
    expect(current).toMatchObject({ fileId: "current", version: 11, state: "VIGENTE", previousIndexFileId: "previous" });

    const records = await reader.readRecords("current", {
      projectId: "aurea",
      query: "institucional",
      traceId: "trace-1",
    });

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.state === "VIGENTE")).toBe(true);
    expect(records[0].sourceId).toBe("source-current");
  });



  it("supports the observed legacy records collection and ignores non-retrievable proposal states", async () => {
    const current = {
      estado_indice: "VIGENTE",
      version_indice: "11",
      indice_anterior: { estado: "REEMPLAZADO", fileId: "previous", version: "v10" },
      registros_nuevos_v011: [{
        id: "proposal",
        proyecto: "XOLAR",
        nombre: "Propuesta",
        descripcion: "Propuesta no recuperable.",
        fuente: "KNOWLEDGE_OS",
        estado: "PROPUESTA",
        version: "v1",
        ubicacion: { fileId: "proposal-source" },
      }],
    };
    const previous = {
      estado_indice: "REEMPLAZADO",
      version_indice: "v10",
      registros: [{
        id: "legacy-1",
        proyecto: "XOLAR",
        nombre: "Registro histórico vigente",
        descripcion: "Evidencia histórica vigente.",
        fuente: "KNOWLEDGE_OS",
        estado: "VIGENTE",
        version: "v1 (copia)",
        ubicacion: { fileId: "legacy-source" },
      }],
    };
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current",
      accessToken: "test-token",
      fetchImpl: makeFetch({ current, previous }),
    });

    const records = await reader.readRecords("current", {
      projectId: "XOLAR",
      query: "histórico",
      traceId: "trace-3",
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: "legacy-1",
      projectId: "XOLAR",
      version: "v1 (copia)",
      state: "VIGENTE",
      sourceId: "legacy-source",
    });
  });



  it("does not require the V011 record collection on a historical index", async () => {
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current",
      accessToken: "test-token",
      fetchImpl: makeFetch({
        current: {
          estado_indice: "VIGENTE",
          version_indice: "v011",
          indice_anterior: { estado: "REEMPLAZADO", fileId: "previous", version: "v010" },
          registros_nuevos_v011: [{
            id: "proposal",
            proyecto: "XOLAR",
            nombre: "Propuesta",
            descripcion: "Propuesta no recuperable.",
            fuente: "KNOWLEDGE_OS",
            estado: "PROPUESTA",
            version: "v1",
          }],
        },
        previous: {
          estado_indice: "REEMPLAZADO",
          version_indice: "v010",
          indice_anterior: undefined,
        },
      }),
    });

    const records = await reader.readRecords("current", {
      projectId: "XOLAR",
      query: "",
      traceId: "trace-4",
    });

    expect(records).toHaveLength(0);
  });

  it("does not confuse write capability with read authorization", async () => {
    const payload = {
      estado_indice: "VIGENTE",
      version_indice: "11",
      registros_nuevos_v011: [],
    };
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current",
      accessToken: "test-token",
      fetchImpl: async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("alt=media")) {
          return new Response(JSON.stringify(payload), { status: 200 });
        }
        return new Response(JSON.stringify({
          id: "current",
          mimeType: "application/json",
          capabilities: { canEdit: true, canDownload: true, canCopy: true },
        }), { status: 200 });
      },
    });

    await expect(reader.readCurrentIndex("trace-2")).resolves.toMatchObject({
      fileId: "current",
      version: 11,
      state: "VIGENTE",
    });
  });

  it("reads versioned incremental record collections without hard-coding v011", async () => {
    const current = {
      estado_indice: "VIGENTE",
      version_indice: "v013",
      indice_anterior: { estado: "REEMPLAZADO", fileId: "previous", version: "v012" },
      registros_nuevos_v013: [{
        id: "AKL-048", proyecto: "AUREA", nombre: "Registro incremental v013",
        descripcion: "Prueba de lectura incremental versionada.", fuente: "KNOWLEDGE_OS",
        estado: "VIGENTE", version: "v1",
        ubicacion: { carpeta: "00_CONTROL", fileId: "source-v013" },
      }],
    };
    const previous = {
      estado_indice: "REEMPLAZADO", version_indice: "v012",
      registros_nuevos_v012: [{
        id: "AKL-047", proyecto: "AUREA", nombre: "Context Pack AUREA v3",
        descripcion: "Context Pack en prueba.", fuente: "KNOWLEDGE_OS",
        estado: "EN PRUEBA", version: "v3",
        ubicacion: { carpeta: "00_CONTROL", fileId: "source-v012" },
      }],
    };
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current", accessToken: "test-token",
      fetchImpl: makeFetch({ current, previous }),
    });
    const records = await reader.readRecords("current", {
      projectId: "AUREA", query: "", traceId: "trace-incremental-vnnn",
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: "AKL-048", sourceId: "source-v013", state: "VIGENTE" });
    expect(records.some((record) => record.id === "AKL-047")).toBe(false);
  });

  it("reads multiple versioned incremental collections and legacy records in one index", async () => {
    const current = {
      estado_indice: "VIGENTE", version_indice: "v014",
      registros: [{
        id: "legacy", proyecto: "AUREA", nombre: "Registro legado",
        descripcion: "Registro de formato histórico.", fuente: "KNOWLEDGE_OS",
        estado: "VIGENTE", version: "v1",
      }],
      registros_nuevos_v013: [{
        id: "incremental-13", proyecto: "AUREA", nombre: "Registro incremental 13",
        descripcion: "Registro v013.", fuente: "KNOWLEDGE_OS", estado: "VIGENTE", version: "v1",
      }],
      registros_nuevos_v014: [{
        id: "incremental-14", proyecto: "AUREA", nombre: "Registro incremental 14",
        descripcion: "Registro v014.", fuente: "KNOWLEDGE_OS", estado: "VIGENTE", version: "v1",
      }],
    };
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: "current", accessToken: "test-token", fetchImpl: makeFetch({ current }),
    });
    const records = await reader.readRecords("current", {
      projectId: "AUREA", query: "", traceId: "trace-incremental-multiple",
    });
    expect(records.map((record) => record.id).sort()).toEqual(["incremental-13", "incremental-14", "legacy"]);
  });

});
