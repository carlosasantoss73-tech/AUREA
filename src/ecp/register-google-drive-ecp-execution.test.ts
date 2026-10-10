import { describe, expect, it, vi } from "vitest";
import { ExecutionRuntime, type ExecutionAdapter } from "../execution-runtime.js";
import { registerGoogleDriveEcpExecutionAdapter } from "./register-google-drive-ecp-execution.js";

function driveFetch() {
  const index = {
    estado_indice: "VIGENTE",
    version_indice: "11",
    registros_nuevos_v011: [{
      id: "AKL-ECP-TEST",
      proyecto: "ecp",
      nombre: "Contrato de prueba ECP",
      descripcion: "El expediente debe citar requisito, fuente y localizador.",
      fuente: "KNOWLEDGE_OS",
      estado: "APROBADO",
      version: "v1",
      ubicacion: { carpeta: "03_AGENTES", fileId: "source-doc-ecp" },
    }],
  };
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("alt=media")) {
      return new Response(JSON.stringify(index), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "current-index",
      name: "INDICE_MAESTRO_v011.json",
      mimeType: "application/json",
      capabilities: { canEdit: false, canDownload: true, canCopy: true },
    }), { status: 200 });
  };
}

describe("Google Drive → Bibliotecario → ECP execution composition", () => {
  it("injects only approved institutional ECP context before provider execution", async () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "resultado citado", evidence: ["PROVIDER_EXECUTED"] })),
    };

    const registered = registerGoogleDriveEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      indexFileId: "current-index",
      accessToken: "test-token",
      fetchImpl: driveFetch(),
      config: { actorId: "ecp-runtime-test", actorRole: "system" },
    });

    const result = await registered.execute({
      traceId: "ecp-live-composition-test",
      provider: {
        providerId: "existing-provider",
        modelId: "test-model",
        status: "EXECUTABLE",
        capabilities: ["ecp.analyze"],
        healthEvidence: ["TEST_PROVIDER_READY"],
      },
      input: { message: "¿Cómo se debe documentar una conclusión?" },
    });

    expect(delegate.execute).toHaveBeenCalledOnce();
    const delegatedInput = delegate.execute.mock.calls[0][0].input as { message: string };
    expect(delegatedInput.message).toContain("ID DOCUMENTO: AKL-ECP-TEST");
    expect(delegatedInput.message).toContain("FUENTE: Contrato de prueba ECP");
    expect(result.evidence).toContain("ECP_CONTEXT_PIPELINE:READY");
    expect(result.evidence).toContain("ECP_CONTEXT_SOURCE:AKL-ECP-TEST:v1");
  });

  it("fails closed without calling the provider when the institutional index has no approved ECP records", async () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "must not run", evidence: ["PROVIDER_EXECUTED"] })),
    };
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("alt=media")) {
        return new Response(JSON.stringify({
          estado_indice: "VIGENTE",
          version_indice: "11",
          registros_nuevos_v011: [{
            id: "proposal-only",
            proyecto: "ecp",
            nombre: "Propuesta",
            descripcion: "No es registro aprobado.",
            fuente: "KNOWLEDGE_OS",
            estado: "PROPUESTA",
            version: "v1",
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: "current-index",
        mimeType: "application/json",
        capabilities: { canEdit: false, canDownload: true, canCopy: true },
      }), { status: 200 });
    };

    const registered = registerGoogleDriveEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      indexFileId: "current-index",
      accessToken: "test-token",
      fetchImpl,
      config: { actorId: "ecp-runtime-test", actorRole: "system" },
    });

    await expect(registered.execute({
      traceId: "ecp-empty-composition-test",
      provider: {
        providerId: "existing-provider",
        modelId: "test-model",
        status: "EXECUTABLE",
        capabilities: ["ecp.analyze"],
        healthEvidence: ["TEST_PROVIDER_READY"],
      },
      input: { message: "Analiza este expediente." },
    })).rejects.toThrow("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});
