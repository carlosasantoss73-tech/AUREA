import { describe, expect, it } from "vitest";
import { GoogleDriveInstitutionalReader } from "./google-drive-institutional-reader";
import { createGoogleDriveInstitutionalContextProvider } from "./google-drive-institutional-context-provider";
import { ContextRetrievalGate } from "./context-retrieval-gate";
import { ExecutionRuntime, type ExecutionAdapter } from "../execution-runtime";
import { registerGoogleDriveEcpExecutionAdapter } from "../ecp/register-google-drive-ecp-execution";

const token = process.env.AUREA_LIVE_DRIVE_TOKEN;
const indexFileId = process.env.AUREA_KNOWLEDGE_OS_INDEX_ID;
const projectId = process.env.AUREA_LIVE_PROJECT_ID;

function requireLiveConfig(): { token: string; indexFileId: string; projectId: string } {
  if (!token || !indexFileId || !projectId) {
    throw new Error("LIVE_INSTITUTIONAL_TEST_CONFIGURATION_MISSING");
  }
  if (projectId !== "ecp") throw new Error("LIVE_TEST_MUST_USE_ECP_PROJECT_SCOPE");
  return { token, indexFileId, projectId };
}

describe("LIVE Bibliotecario / Knowledge OS reader — ECP scope", () => {
  it.skipIf(!token || !indexFileId || !projectId)(
    "reads the real current V011 and reports whether ECP records exist",
    async () => {
      const liveConfig = requireLiveConfig();
      const reader = new GoogleDriveInstitutionalReader({
        indexFileId: liveConfig.indexFileId,
        accessToken: liveConfig.token,
      });

      const current = await reader.readCurrentIndex("live-ecp-reader");
      expect(current.state).toBe("VIGENTE");
      expect(current.fileId).toBe(liveConfig.indexFileId);

      const records = await reader.readRecords(liveConfig.indexFileId, {
        projectId: "ecp",
        query: "",
        traceId: "live-ecp-reader",
      });
      expect(records.every((record) => record.projectId === "ecp")).toBe(true);
      expect(records.every((record) => record.state === "VIGENTE" || record.state === "APROBADO")).toBe(true);

      console.log(JSON.stringify({
        LIVE_READER: "PASS",
        CURRENT_INDEX_VERSION: current.version,
        PROJECT_SCOPE: "ecp",
        APPROVED_ECP_RECORDS: records.length,
        ECP_REGISTRY_STATUS: records.length ? "FOUND" : "BLOCKED_NO_APPROVED_ECP_RECORD",
        PROVENANCE_BOUNDARY: "INSTITUTIONAL_CONTEXT_PROVIDER_REQUIRED",
      }));
    },
    30_000,
  );

  it.skipIf(!token || !indexFileId || !projectId)(
    "passes only valid ECP institutional evidence through the shared ContextRetrievalGate",
    async () => {
      const liveConfig = requireLiveConfig();
      const reader = new GoogleDriveInstitutionalReader({
        indexFileId: liveConfig.indexFileId,
        accessToken: liveConfig.token,
      });
      const provider = createGoogleDriveInstitutionalContextProvider(reader);
      const gate = new ContextRetrievalGate(provider);
      const result = await gate.retrieve({
        actorId: "live-ecp-reader",
        actorRole: "system",
        projectId: "ecp",
        query: "",
        institutionalOnly: true,
      });

      expect(result.context?.projectId ?? "ecp").toBe("ecp");
      if (result.status === "READY") {
        expect((result.context?.citations.length ?? 0)).toBeGreaterThan(0);
        expect(result.context?.citations.every((citation) => citation.provenance === "INSTITUTIONAL")).toBe(true);
        console.log(JSON.stringify({
          LIVE_CONTEXT_GATE: "READY",
          CITATIONS_RETRIEVED: result.context?.citations.length ?? 0,
          PROJECT_SCOPE: "ecp",
        }));
      } else {
        expect(result.status).toBe("BLOCKED");
        expect(result.reason).toBe("INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK");
        console.log(JSON.stringify({
          LIVE_CONTEXT_GATE: "BLOCKED",
          BLOCKER: "NO_APPROVED_ECP_RECORD_OR_INSTITUTIONAL_CITATIONS",
          PROJECT_SCOPE: "ecp",
          FAIL_CLOSED: true,
        }));
      }
    },
    30_000,
  );
});


describe("LIVE ECP execution composition — authorized institutional source", () => {
  it.skipIf(!token || !indexFileId || !projectId)(
    "uses the real current index and either executes with approved ECP context or blocks before provider invocation",
    async () => {
      const liveConfig = requireLiveConfig();
      const runtime = new ExecutionRuntime();
      let providerCalls = 0;
      const delegate: ExecutionAdapter = {
        providerId: "ecp-live-composition-test-provider",
        async execute() {
          providerCalls += 1;
          return { output: "LIVE_COMPOSITION_SMOKE_OK", evidence: ["LIVE_TEST_PROVIDER_CALLED"] };
        },
      };
      const registered = registerGoogleDriveEcpExecutionAdapter({
        runtime,
        providerAdapter: delegate,
        indexFileId: liveConfig.indexFileId,
        accessToken: liveConfig.token,
        config: { actorId: "live-ecp-composition", actorRole: "system" },
      });

      let executionResult: Awaited<ReturnType<typeof registered.execute>> | undefined;
      let executionError: unknown;
      try {
        executionResult = await registered.execute({
          traceId: "live-ecp-composition",
          provider: {
            providerId: "ecp-live-composition-test-provider",
            modelId: "test-model",
            status: "EXECUTABLE",
            capabilities: ["ecp.analyze"],
            healthEvidence: ["LIVE_TEST_PROVIDER_READY"],
          },
          input: { message: "Smoke test: cita evidencia institucional ECP." },
        });
      } catch (error) {
        executionError = error;
      }

      if (executionError !== undefined) {
        expect(String(executionError)).toContain("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
        expect(providerCalls).toBe(0);
        console.log(JSON.stringify({
          LIVE_ECP_COMPOSITION: "PASS_FAIL_CLOSED",
          PROVIDER_CALLS: providerCalls,
          BLOCKER: "NO_APPROVED_ECP_RECORD_OR_INSTITUTIONAL_CITATIONS",
        }));
        return;
      }

      expect(executionResult).toBeDefined();
      expect(providerCalls).toBe(1);
      expect(executionResult?.evidence).toContain("ECP_CONTEXT_PIPELINE:READY");
      expect(executionResult?.evidence.some((item) => item.startsWith("ECP_CONTEXT_SOURCE:"))).toBe(true);
      console.log(JSON.stringify({
        LIVE_ECP_COMPOSITION: "PASS_WITH_APPROVED_CONTEXT",
        PROVIDER_CALLS: providerCalls,
      }));
    },
    60_000,
  );
});
