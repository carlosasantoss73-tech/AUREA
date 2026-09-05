/**
 * AUREA Hypervelocity E3 adapter for an A2A v1.0 HTTP+JSON agent.
 *
 * This is an executable integration boundary, not proof of a connected agent.
 * E3 remains CLOSED only after a real endpoint is configured and a real
 * request returns verifiable evidence.
 */
import type {
  ExternalCodeCellAdapter,
  ExternalCodeCellRequest,
  ExternalCodeCellResult,
} from "./aurea-external-code-cell";

type A2AFetch = typeof fetch;

export interface A2AExternalCellConfig {
  cellId: string;
  providerId: string;
  endpoint: string;
  bearerToken?: string;
  fetchImpl?: A2AFetch;
}

interface A2AMessageResponse {
  message?: {
    messageId?: string;
    parts?: Array<{ text?: string }>;
  };
  task?: {
    id?: string;
    status?: {
      state?: string;
      message?: {
        parts?: Array<{ text?: string }>;
      };
    };
    artifacts?: Array<{
      parts?: Array<{ text?: string }>;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

export function createA2AExternalCodeCell(
  config: A2AExternalCellConfig,
): ExternalCodeCellAdapter {
  const endpoint = new URL(config.endpoint);
  if (endpoint.protocol !== "https:") {
    throw new Error("A2A_EXTERNAL_CELL_HTTPS_REQUIRED");
  }

  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    cellId: config.cellId,
    providerId: config.providerId,
    status: "EXECUTABLE",
    capabilities: ["coding", "a2a-v1"],
    healthEvidence: [`endpoint:${endpoint.origin}`, "protocol:A2A-1.0"],
    execute: async (request) =>
      executeA2AMission(endpoint, config.bearerToken, fetchImpl, request),
  };
}

async function executeA2AMission(
  endpoint: URL,
  bearerToken: string | undefined,
  fetchImpl: A2AFetch,
  request: ExternalCodeCellRequest,
): Promise<ExternalCodeCellResult> {
  const payload = {
    message: {
      role: "ROLE_USER",
      messageId: request.traceId,
      parts: [{ text: buildMission(request) }],
    },
    configuration: {
      returnImmediately: false,
      acceptedOutputModes: ["text/plain"],
    },
    metadata: {
      aureaCellId: request.cellId,
      aureaTraceId: request.traceId,
    },
  };

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "a2a-version": "1.0",
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as A2AMessageResponse;
  if (!response.ok) {
    return blockedResult(
      request,
      `A2A_HTTP_ERROR:${response.status}`,
      [`A2A_HTTP:${response.status}`, `A2A_ENDPOINT:${endpoint.origin}`],
    );
  }

  if (body.error) {
    return blockedResult(
      request,
      `A2A_ERROR:${body.error.code ?? "UNKNOWN"}`,
      [`A2A_ENDPOINT:${endpoint.origin}`],
    );
  }

  const task = body.task;
  const message = body.message;
  const output =
    message?.parts?.map((part) => part.text ?? "").join("\n").trim() ||
    task?.status?.message?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ||
    task?.artifacts
      ?.flatMap((artifact) => artifact.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();

  if (!output) {
    return blockedResult(request, "A2A_RESULT_EMPTY", [
      `A2A_HTTP:${response.status}`,
      `A2A_ENDPOINT:${endpoint.origin}`,
      ...(task?.id ? [`A2A_TASK:${task.id}`] : []),
    ]);
  }

  const evidence = [
    `A2A_HTTP:${response.status}`,
    `A2A_ENDPOINT:${endpoint.origin}`,
    "A2A_VERSION:1.0",
    ...(task?.id ? [`A2A_TASK:${task.id}`] : []),
    ...(message?.messageId ? [`A2A_MESSAGE:${message.messageId}`] : []),
    ...(task?.status?.state ? [`A2A_STATE:${task.status.state}`] : []),
  ];

  return {
    cellId: request.cellId,
    traceId: request.traceId,
    status: "COMPLETED",
    result: output,
    facts: ["A2A endpoint returned a non-empty response."],
    inferences: [],
    assumptions: [],
    risks: [],
    evidence,
    confidence: 0.9,
    recommendedAction: "Send result through AUREA QA and audit before integration.",
    blockers: [],
    reusableLearning: [
      "External execution evidence must include endpoint, protocol version and remote task/message identity without exposing credentials.",
    ],
  };
}

function buildMission(request: ExternalCodeCellRequest): string {
  return [
    `AUREA CELL_ID=${request.cellId}`,
    `TRACE_ID=${request.traceId}`,
    `OBJECTIVE=${request.objective}`,
    `COMPANY_SCOPE=${request.companyScope}`,
    `PROJECT_SCOPE=${request.projectScope}`,
    `RESPONSIBILITY=${request.responsibility}`,
    `REQUIRED_CAPABILITIES=${request.requiredCapabilities.join(",")}`,
    `AUTHORITY_LEVEL=${request.authorityLevel}`,
    `ALLOWED_KNOWLEDGE=${request.allowedKnowledge.join(" | ")}`,
    `RESTRICTIONS=${request.restrictions.join(" | ")}`,
    `DEPENDENCIES=${request.dependencies.join(" | ")}`,
    `INPUT_EVIDENCE=${request.inputEvidence.join(" | ")}`,
    `EXPECTED_OUTPUT=${request.expectedOutput.join(" | ")}`,
    `VALIDATION_CRITERIA=${request.validationCriteria.join(" | ")}`,
    "Return a bounded result with facts, assumptions, risks, evidence, confidence, blockers and reusable learning.",
  ].join("\n");
}

function blockedResult(
  request: ExternalCodeCellRequest,
  blocker: string,
  evidence: string[],
): ExternalCodeCellResult {
  return {
    cellId: request.cellId,
    traceId: request.traceId,
    status: "BLOCKED",
    result: "",
    facts: [],
    inferences: [],
    assumptions: [],
    risks: [],
    evidence: [`BLOCKED:${blocker}`, ...evidence],
    confidence: 0,
    recommendedAction: "Resolve the A2A execution blocker and retry.",
    blockers: [blocker],
    reusableLearning: [],
  };
}
