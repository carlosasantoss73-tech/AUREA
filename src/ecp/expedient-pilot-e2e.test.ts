import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { ContextRetrievalGate, type ContextProvider } from "../context/context-retrieval-gate.js";
import type { ExecutionAdapter } from "../execution-runtime.js";
import { createEcpExpedientHttpHandler } from "./expedient-http-api.js";
import { executeEcpExpedientAnalysis } from "./expedient-analysis-runtime.js";
import type { EcpStoredExpedient } from "./expedient-store.js";

/**
 * Synthetic end-to-end contract test only.
 * Every PDF, context record, and model response below is a fixture.
 * This test does not prove institutional Google Drive access.
 */
function makePdf(text: string): Uint8Array {
  const safeText = text.replace(/[()\\\\]/g, " ");
  const stream = `BT /F1 12 Tf 72 720 Td (${safeText}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\\nstream\\n${stream}\\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\\n${objects[i]}\\nendobj\\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\\n0 ${objects.length + 1}\\n0000000000 65535 f \\n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \\n`;
  pdf += `trailer\\n<< /Size ${objects.length + 1} /Root 1 0 R >>\\nstartxref\\n${xrefOffset}\\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

function base64Pdf(text: string): string {
  return Buffer.from(makePdf(text)).toString("base64");
}

class InMemoryExpedientStore {
  private readonly records = new Map<string, EcpStoredExpedient>();
  async save(record: EcpStoredExpedient): Promise<void> {
    this.records.set(`${record.clientId}:${record.expedientId}`, structuredClone(record));
  }
  async get(clientId: string, expedientId: string): Promise<EcpStoredExpedient | null> {
    const record = this.records.get(`${clientId}:${expedientId}`);
    return record ? structuredClone(record) : null;
  }
}

function syntheticInstitutionalFixture(): ContextProvider {
  return {
    async retrieve(input) {
      return {
        projectId: input.projectId,
        query: input.query,
        facts: ["FIXTURE SINTÉTICO: el pliego de prueba exige cuatro vehículos 4x2."],
        citations: [{
          sourceId: "fixture://bibliotecario/ECP-TEST-001",
          documentId: "ECP-TEST-001",
          version: "fixture-v1",
          title: "FIXTURE SINTÉTICO — NO ES DOCUMENTO INSTITUCIONAL",
          excerpt: "Dato inventado exclusivamente para comprobar la trazabilidad del flujo de prueba.",
          provenance: "INSTITUTIONAL",
        }],
      };
    },
  };
}

describe("ECP isolated pilot — synthetic end-to-end", () => {
  it("receives two fixture PDFs, stores them per client, gates analysis, and returns traceable evidence", async () => {
    const contextGate = new ContextRetrievalGate(syntheticInstitutionalFixture());
    const model: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "fixture-model-provider",
      execute: vi.fn(async () => ({
        output: {
          classification: "NO CONCLUYENTE",
          explanation: "Resultado sintético: una persona debe validar la evidencia primaria.",
          citations: [{ documentId: "ECP-TEST-001", version: "fixture-v1" }],
        },
        evidence: ["SYNTHETIC_MODEL_FIXTURE", "NO_REAL_PROVIDER_CALL"],
      })),
    };

    const store = new InMemoryExpedientStore();
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => ({ clientId: "fixture-client-a", actorId: "fixture-actor-a", actorRole: "ANALYST" }),
      store,
      contextGate,
      randomId: () => "ecp-fixture-expedient-001",
      now: () => new Date("2026-10-12T12:00:00.000Z"),
      analyze: async (record, principal) => executeEcpExpedientAnalysis(record, principal, {
        providerAdapter: model,
        modelId: "fixture-model-v1",
        contextGate,
      }),
    });

    const intakeResponse = await handler(new Request("https://ecp.test/ecp/v1/expedients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metadata: {
          procedureCode: "ECP-FIXTURE-001",
          contractingEntity: "Entidad ficticia para pruebas",
          objectDescription: "Servicio ficticio usado para validar el flujo técnico",
          sourceUrl: "fixture://procedure/ECP-FIXTURE-001",
        },
        documents: [
          {
            documentId: "fixture-pliego-001",
            title: "FIXTURE_pliego.pdf",
            mediaType: "application/pdf",
            sourceUri: "fixture://documents/pliego",
            role: "PROCEDURE",
            contentBase64: base64Pdf("FIXTURE: el pliego de prueba requiere cuatro vehículos 4x2."),
          },
          {
            documentId: "fixture-oferta-001",
            title: "FIXTURE_oferta.pdf",
            mediaType: "application/pdf",
            sourceUri: "fixture://documents/oferta",
            role: "OFFER",
            offeror: "Oferente ficticio A",
            contentBase64: base64Pdf("FIXTURE: la oferta de prueba declara cuatro vehículos 4x2."),
          },
        ],
      }),
    }));

    expect(intakeResponse.status).toBe(201);
    const intakeBody = await intakeResponse.json() as {
      expedientId: string;
      intake: { readiness: string; documents: Array<{ sourceVersion: string; chunks: number }> };
    };
    expect(intakeBody.expedientId).toBe("ecp-fixture-expedient-001");
    expect(intakeBody.intake.readiness).toBe("READY_FOR_EVIDENCE_REVIEW");
    expect(intakeBody.intake.documents).toHaveLength(2);
    expect(intakeBody.intake.documents.every((doc) => doc.sourceVersion.startsWith("sha256:"))).toBe(true);
    expect(intakeBody.intake.documents.every((doc) => doc.chunks > 0)).toBe(true);

    const readinessResponse = await handler(new Request(
      `https://ecp.test/ecp/v1/expedients/${intakeBody.expedientId}/analysis-readiness`,
      { method: "POST" },
    ));
    expect(readinessResponse.status).toBe(200);
    const readiness = await readinessResponse.json() as {
      status: string;
      contextSources: Array<{ documentId: string; version: string | number }>;
      traceId: string;
    };
    expect(readiness.status).toBe("READY_FOR_CONTROLLED_EXECUTION");
    expect(readiness.traceId).toBeTruthy();
    expect(readiness.contextSources).toContainEqual({ documentId: "ECP-TEST-001", version: "fixture-v1" });

    const analysisResponse = await handler(new Request(
      `https://ecp.test/ecp/v1/expedients/${intakeBody.expedientId}/analyze`,
      { method: "POST" },
    ));
    expect(analysisResponse.status).toBe(200);
    const analysis = await analysisResponse.json() as {
      status: string;
      traceId: string;
      evidence: string[];
      output: { classification: string; citations: Array<{ documentId: string; version: string }> };
    };
    expect(analysis.status).toBe("SUCCEEDED");
    expect(analysis.traceId).toBeTruthy();
    expect(analysis.evidence).toContain("SYNTHETIC_MODEL_FIXTURE");
    expect(analysis.evidence.some((item) => item === "ECP_CONTEXT_SOURCE:ECP-TEST-001:fixture-v1")).toBe(true);
    expect(analysis.output.classification).toBe("NO CONCLUYENTE");
    expect(analysis.output.citations).toContainEqual({ documentId: "ECP-TEST-001", version: "fixture-v1" });
    expect(model.execute).toHaveBeenCalledOnce();

    const crossClientRead = await store.get("different-client", intakeBody.expedientId);
    expect(crossClientRead).toBeNull();
  });

  it("rejects analysis without institutional context before invoking the model fixture", async () => {
    const emptyGate = new ContextRetrievalGate({
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    });
    const model: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "fixture-model-provider",
      execute: vi.fn(async () => ({ output: "must never execute", evidence: ["MODEL_CALLED"] })),
    };
    const store = new InMemoryExpedientStore();
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => ({ clientId: "fixture-client", actorId: "fixture-actor", actorRole: "ANALYST" }),
      store,
      contextGate: emptyGate,
      randomId: () => "blocked-fixture-expedient",
      analyze: async (record, principal) => executeEcpExpedientAnalysis(record, principal, {
        providerAdapter: model,
        modelId: "fixture-model-v1",
        contextGate: emptyGate,
      }),
    });
    const intakeResponse = await handler(new Request("https://ecp.test/ecp/v1/expedients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metadata: { procedureCode: "ECP-FIXTURE-002", contractingEntity: "Entidad ficticia", objectDescription: "Objeto de prueba" },
        documents: [
          { documentId: "fixture-procedure", title: "fixture-procedure.pdf", mediaType: "application/pdf", sourceUri: "fixture://procedure", role: "PROCEDURE", contentBase64: base64Pdf("Fixture pliego.") },
          { documentId: "fixture-offer", title: "fixture-offer.pdf", mediaType: "application/pdf", sourceUri: "fixture://offer", role: "OFFER", offeror: "Oferente ficticio", contentBase64: base64Pdf("Fixture oferta.") },
        ],
      }),
    }));
    expect(intakeResponse.status).toBe(201);
    const body = await intakeResponse.json() as { expedientId: string };

    const analysisResponse = await handler(new Request(
      `https://ecp.test/ecp/v1/expedients/${body.expedientId}/analyze`,
      { method: "POST" },
    ));
    expect(analysisResponse.status).toBe(409);
    const result = await analysisResponse.json() as { status: string; error: string };
    expect(result.status).toBe("BLOCKED");
    expect(result.error).toContain("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(model.execute).not.toHaveBeenCalled();
  });
});
