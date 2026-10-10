import { AureaExecutionGate } from "../execution-gate.js";
import { ExecutionRuntime, type ExecutionAdapter, type ExecutionRuntimeResult } from "../execution-runtime.js";
import { HealthLedger } from "../health-ledger.js";
import { AureaPlatformIntegration } from "../aurea-platform-integration.js";
import { ProviderRuntime, type ProviderRuntimeAdapter } from "../provider-runtime.js";
import { RuntimeAdmission } from "../runtime-admission.js";
import { AureaSentinel } from "../sentinel.js";
import type { WorkCell } from "../work-cell.js";
import type { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import type { ExecutionResultStore } from "../execution-result-store.js";
import type { EcpAuthenticatedPrincipal } from "./expedient-http-api.js";
import type { EcpStoredExpedient } from "./expedient-store.js";
import { registerEcpExecutionAdapter } from "./register-ecp-execution.js";

export interface EcpAnalysisRuntimeConfig {
  providerAdapter: ExecutionAdapter;
  modelId: string;
  contextGate: ContextRetrievalGate;
  resultStore?: ExecutionResultStore;
}

export interface EcpAnalysisResult {
  status: "SUCCEEDED" | "REPLAYED" | "BLOCKED" | "FAILED";
  traceId: string;
  providerId?: string;
  modelId?: string;
  output?: unknown;
  evidence: string[];
  error?: string;
}

const MAX_EVIDENCE_CHARS = 120_000;

function buildEvidencePrompt(record: EcpStoredExpedient): string {
  const { metadata, documents } = record.intake;
  const lines = [
    "OBJETIVO: auditoría técnico-documental neutral de un expediente de contratación pública de Ecuador.",
    "LÍMITES: no recomiendes adjudicatario ni ganador. No sustituyas a la comisión técnica ni a asesoría jurídica.",
    "REGLAS: usa únicamente evidencia primaria suministrada y contexto institucional citado. No inventes requisitos, páginas, fechas, identidades ni hechos. Separa HECHO, INFERENCIA y CRITERIO JURÍDICO. Si falta evidencia, usa NO CONCLUYENTE. No conviertas ausencia de texto extraído en prueba de incumplimiento.",
    "SALIDA: resume cobertura documental; identifica cada requisito verificable; compara de forma simétrica a cada oferente; clasifica CUMPLE / NO CUMPLE / CONVALIDABLE / NO CONCLUYENTE; cita documento, versión SHA-256 y localizador exacto; explica qué evidencia falta y qué debe validar una persona.",
    "",
    `PROCEDIMIENTO: ${metadata.procedureCode}`,
    `ENTIDAD: ${metadata.contractingEntity}`,
    `OBJETO: ${metadata.objectDescription}`,
    `URL DECLARADA: ${metadata.sourceUrl}`,
    `DOCUMENTOS RECIBIDOS: ${documents.length}`,
  ];
  for (const [index, document] of documents.entries()) {
    lines.push("", `DOCUMENTO ${index + 1}: ${document.ingestion.title}`);
    lines.push(`ROL: ${document.role}`);
    if (document.offeror) lines.push(`OFERENTE DECLARADO: ${document.offeror}`);
    lines.push(`ID: ${document.ingestion.documentId}`);
    lines.push(`VERSIÓN: ${document.ingestion.sourceVersion}`);
    lines.push(`SHA-256: ${document.ingestion.sourceSha256}`);
    lines.push(`UNIDADES ORIGEN: ${document.ingestion.sourceUnits}; UNIDADES EXTRAÍDAS: ${document.ingestion.extractedUnits}; CHUNKS: ${document.ingestion.chunks.length}`);
    if (document.ingestion.warnings.length) lines.push(`ADVERTENCIAS DE EXTRACCIÓN: ${document.ingestion.warnings.join("; ")}`);
    for (const chunk of document.ingestion.chunks) {
      lines.push(`[EVIDENCIA documento=${chunk.documentId} versión=${chunk.version} localizador=${chunk.locatorKind}:${chunk.locator} chunk=${chunk.chunkIndex + 1}/${chunk.chunkCount}]`, chunk.text);
    }
  }
  const prompt = lines.join("\n");
  if (prompt.length > MAX_EVIDENCE_CHARS) throw new Error("ECP_ANALYSIS_EVIDENCE_TOO_LARGE_SPLIT_REQUIRED");
  return prompt;
}

export async function executeEcpExpedientAnalysis(
  record: EcpStoredExpedient,
  principal: EcpAuthenticatedPrincipal,
  config: EcpAnalysisRuntimeConfig,
): Promise<EcpAnalysisResult> {
  const traceId = crypto.randomUUID();
  if (record.intake.readiness !== "READY_FOR_EVIDENCE_REVIEW") {
    return { status: "BLOCKED", traceId, evidence: [], error: `ECP_EXPEDIENT_INTAKE_INCOMPLETE:${record.intake.blockers.join("|")}` };
  }
  if (!config.modelId.trim()) return { status: "BLOCKED", traceId, evidence: [], error: "ECP_PROVIDER_MODEL_REQUIRED" };

  let prompt: string;
  try { prompt = buildEvidencePrompt(record); }
  catch (error) { return { status: "BLOCKED", traceId, evidence: [], error: error instanceof Error ? error.message : "ECP_EVIDENCE_PROMPT_FAILED" }; }

  const provider: ProviderRuntimeAdapter = {
    providerId: config.providerAdapter.providerId,
    modelId: config.modelId,
    status: "EXECUTABLE",
    capabilities: ["ecp.analyze"],
    healthEvidence: ["ECP_PROVIDER_ADAPTER_REGISTERED", "ECP_PROVIDER_CREDENTIAL_BOUNDARY"],
  };
  const providers = new ProviderRuntime();
  providers.register(provider);

  const platform = new AureaPlatformIntegration();
  platform.register({
    manifest: {
      integrationId: "ecp-expedient-analysis",
      componentId: "ecp-expedient-analysis-runtime",
      version: "1",
      boundaries: ["KNOWLEDGE", "PERMISSION", "EXECUTION", "WORK_CELL", "QA", "AUDIT"],
      requiredCapabilities: ["ecp.analyze", "knowledge.read"],
      requiredConfiguration: ["ECP_INSTITUTIONAL_CONTEXT", "ECP_PROVIDER"],
      healthChecks: ["institutional-context-gate", "provider-adapter", "execution-gate"],
      rollbackPlan: "Disable the ECP analysis route; preserve the expediente and trace evidence.",
    },
    inspect: () => ({
      integrationId: "ecp-expedient-analysis",
      status: "HEALTHY",
      checkedAt: new Date().toISOString(),
      checks: { healthy: true },
      evidence: ["ECP_DEDICATED_RUNTIME", "INSTITUTIONAL_CONTEXT_GATE", "PROVIDER_ADAPTER_REGISTERED"],
      blockers: [],
    }),
  });

  const execution = new ExecutionRuntime(config.resultStore);
  registerEcpExecutionAdapter({
    runtime: execution,
    providerAdapter: config.providerAdapter,
    contextGate: config.contextGate,
    config: {
      actorId: principal.actorId,
      actorRole: principal.actorRole,
      allowedProjects: ["ecp"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
    },
  });

  const cell: WorkCell = {
    workCellId: `ECP-${record.expedientId}-${traceId.slice(0, 8)}`,
    projectId: "ecp",
    companyId: "AUREA",
    objective: `Revisar evidencia del procedimiento ${record.intake.metadata.procedureCode}`,
    owner: principal.actorId,
    planner: "ecp-pilot-runtime",
    agents: ["ecp"],
    dependencies: [],
    restrictions: ["NO_ADJUDICATION_RECOMMENDATION", "NO_UNSUPPORTED_INFERENCE", "INSTITUTIONAL_CONTEXT_REQUIRED", "PRIMARY_EVIDENCE_REQUIRED"],
    state: "READY",
    deliverables: [],
    evidence: [],
    qaStatus: "PENDING",
    auditStatus: "PENDING",
  };

  const admission = new RuntimeAdmission(
    platform,
    config.contextGate,
    providers,
    new AureaExecutionGate(new AureaSentinel(new HealthLedger())),
  );
  const admitted = await admission.admit({
    traceId,
    integrationId: "ecp-expedient-analysis",
    workCell: cell,
    contextQuery: `${record.intake.metadata.procedureCode} ${record.intake.metadata.objectDescription}`,
    actorId: principal.actorId,
    actorRole: principal.actorRole,
    capabilityId: "ecp.analyze",
    toolId: "ecp.analyze",
    action: "analyze_expedient_evidence",
    effectClass: "EXTERNAL",
    providerCapability: "ecp.analyze",
    preferredProviderId: provider.providerId,
    allowedProviderIds: [provider.providerId],
    allowedProjects: ["ecp"],
    contextAllowedProjects: ["ecp"],
    contextAllowedCapabilities: ["knowledge.read"],
    contextAllowedTools: ["knowledge.search"],
    allowedCapabilities: ["ecp.analyze"],
    allowedTools: ["ecp.analyze"],
    maxCalls: 1,
    callsUsed: 0,
  });

  if (admitted.status !== "ADMITTED" || !admitted.providerId) {
    return { status: "BLOCKED", traceId, evidence: admitted.evidence, error: admitted.blockers.join("|") || "ECP_RUNTIME_ADMISSION_BLOCKED" };
  }
  const selected = providers.select({ requiredCapability: "ecp.analyze", preferredProviderId: admitted.providerId, allowedProviderIds: [provider.providerId] });
  if (!selected.provider) return { status: "BLOCKED", traceId, evidence: [...admitted.evidence, ...selected.evidence], error: selected.blockers.join("|") || "ECP_PROVIDER_SELECTION_BLOCKED" };

  const result: ExecutionRuntimeResult = await execution.execute({
    admission: admitted,
    provider: selected.provider,
    input: { message: prompt },
  });
  const error = result.error;
  if (error?.startsWith("ECP_INSTITUTIONAL_CONTEXT_BLOCKED")) {
    return { status: "BLOCKED", traceId: result.traceId, providerId: result.providerId, modelId: result.modelId, evidence: result.evidence, error };
  }
  return {
    status: result.status,
    traceId: result.traceId,
    ...(result.providerId ? { providerId: result.providerId } : {}),
    ...(result.modelId ? { modelId: result.modelId } : {}),
    ...(result.output !== undefined ? { output: result.output } : {}),
    evidence: result.evidence,
    ...(error ? { error } : {}),
  };
}
