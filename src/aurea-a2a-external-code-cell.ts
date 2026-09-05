/**
 * AUREA Hypervelocity E3 adapter for A2A v1.0 external agents.
 *
 * Supports the standard HTTP+JSON and JSON-RPC bindings. This is an
 * executable integration boundary, not proof of a connected agent: E3
 * remains CLOSED only after a real endpoint returns verifiable evidence.
 */
import type {
  A2AProtocolBinding,
} from "./aurea-a2a-agent-discovery";
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
  protocolBinding?: A2AProtocolBinding;
  tenant?: string;
  bearerToken?: string;
  fetchImpl?: A2AFetch;
}

interface A2AMessageResponse {
  message?: {
    messageId?: string;
    parts?: Array<{ text?: string; data?: unknown }>;
  };
  task?: {
    id?: string;
    status?: {
      state?: string;
      message?: {
        parts?: Array<{ text?: string; data?: unknown }>;
      };
    };
    artifacts?: Array<{
      parts?: Array<{ text?: string; data?: unknown }>;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

interface A2AJsonRpcResponse {
  jsonrpc?: string;
  id?: string | number | null;
  result?: A2AMessageResponse;
  error?: {
    code?: number;
    message?: string;
  };
}

const TERMINAL_TASK_STATES = new Set([
  "TASK_STATE_COMPLETED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
  "TASK_STATE_FAILED",
]);

export function createA2AExternalCodeCell(
  config: A2AExternalCellConfig,
): ExternalCodeCellAdapter {
  const endpoint = new URL(config.endpoint);
  if (endpoint.protocol !== "https:") {
    throw new Error("A2A_EXTERNAL_CELL_HTTPS_REQUIRED");
  }

  const protocolBinding = config.protocolBinding ?? "HTTP+JSON";
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    cellId: config.cellId,
    providerId: config.providerId,
    status: "EXECUTABLE",
    capabilities: ["coding", "a2a-v1", protocolBinding.toLowerCase()],
    healthEvidence: [
      `endpoint:${endpoint.origin}`,
      `protocol:A2A-1.0:${protocolBinding}`,
      ...(config.tenant ? [`tenant:${config.tenant}`] : []),
    ],
    execute: async (request) =>
      executeA2AMission(
        endpoint,
        protocolBinding,
        config.tenant,
        config.bearerToken,
        fetchImpl,
        request,
      ),
  };
}

async function executeA2AMission(
  endpoint: URL,
  protocolBinding: A2AProtocolBinding,
  tenant: string | undefined,
  bearerToken: string | undefined,
  fetchImpl: A2AFetch,
  request: ExternalCodeCellRequest,
): Promise<ExternalCodeCellResult> {
  const message = {
    role: "ROLE_USER",
    messageId: request.traceId,
    parts: [{ text: buildMission(request) }],
  };

  const payload =
    protocolBinding === "JSONRPC"
      ? {
          jsonrpc: "2.0",
          id: request.traceId,
          method: "SendMessage",
          params: {
            ...(tenant ? { tenant } : {}),
            message,
            configuration: {
              returnImmediately: false,
              acceptedOutputModes: ["text/plain"],
            },
            metadata: {
              aureaCellId: request.cellId,
              aureaTraceId: request.traceId,
            },
          },
        }
      : {
          ...(tenant ? { tenant } : {}),
          message,
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
      "content-type": protocolBinding === "JSONRPC" ? "application/json" : "application/a2a+json",
      accept: protocolBinding === "JSONRPC" ? "application/json" : "application/a2a+json",
      "a2a-version": "1.0",
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  let body: A2AMessageResponse;
  try {
    const raw = (await response.json()) as A2AMessageResponse | A2AJsonRpcResponse;
    if (protocolBinding === "JSONRPC") {
      const rpc = raw as A2AJsonRpcResponse;
      if (rpc.error) {
        return blockedResult(request, `A2A_JSONRPC_ERROR:${rpc.error.code ?? "UNKNOWN"}`, [
          `A2A_HTTP:${response.status}`,
          `A2A_ENDPOINT:${endpoint.toString()}`,
        ]);
      }
      body = rpc.result ?? {};
    } else {
      body = raw as A2AMessageResponse;
    }
  } catch {
    return blockedResult(request, "A2A_RESPONSE_MALFORMED_JSON", [
      `A2A_HTTP:${response.status}`,
      `A2A_ENDPOINT:${endpoint.toString()}`,
    ]);
  }

  if (!response.ok) {
    return blockedResult(
      request,
      `A2A_HTTP_ERROR:${response.status}`,
      [`A2A_HTTP:${response.status}`, `A2A_ENDPOINT:${endpoint.toString()}`],
    );
  }

  if (body.error) {
    return blockedResult(
      request,
      `A2A_ERROR:${body.error.code ?? "UNKNOWN"}`,
      [`A2A_ENDPOINT:${endpoint.toString()}`],
    );
  }

  const hasTask = Boolean(body.task);
  const hasMessage = Boolean(body.message);
  if (hasTask === hasMessage) {
    return blockedResult(request, "A2A_RESPONSE_SHAPE_INVALID", [
      `A2A_HTTP:${response.status}`,
      `A2A_ENDPOINT:${endpoint.toString()}`,
    ]);
  }

  const task = body.task;
  const responseMessage = body.message;
  if (task) {
    const state = task.status?.state;
    if (!state || !TERMINAL_TASK_STATES.has(state)) {
      return blockedResult(request, "A2A_TASK_NON_TERMINAL", [
        `A2A_HTTP:${response.status}`,
        `A2A_ENDPOINT:${endpoint.toString()}`,
        ...(task.id ? [`A2A_TASK:${task.id}`] : []),
        ...(state ? [`A2A_STATE:${state}`] : []),
      ]);
    }
    if (state !== "TASK_STATE_COMPLETED") {
      return blockedResult(request, `A2A_TASK_${state.replace("TASK_STATE_", "")}`, [
        `A2A_HTTP:${response.status}`,
        `A2A_ENDPOINT:${endpoint.toString()}`,
        ...(task.id ? [`A2A_TASK:${task.id}`] : []),
        `A2A_STATE:${state}`,
      ]);
    }
  }

  const output = extractOutput(responseMessage, task);
  if (!output) {
    return blockedResult(request, "A2A_RESULT_EMPTY", [
      `A2A_HTTP:${response.status}`,
      `A2A_ENDPOINT:${endpoint.toString()}`,
      ...(task?.id ? [`A2A_TASK:${task.id}`] : []),
    ]);
  }

  const evidence = [
    `A2A_HTTP:${response.status}`,
    `A2A_ENDPOINT:${endpoint.toString()}`,
    "A2A_VERSION:1.0",
    `A2A_BINDING:${protocolBinding}`,
    ...(tenant ? [`A2A_TENANT:${tenant}`] : []),
    ...(task?.id ? [`A2A_TASK:${task.id}`] : []),
    ...(responseMessage?.messageId ? [`A2A_MESSAGE:${responseMessage.messageId}`] : []),
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
      "External execution evidence must include endpoint, protocol version, binding and remote task/message identity without exposing credentials.",
    ],
  };
}

function extractOutput(
  message: A2AMessageResponse["message"],
  task: A2AMessageResponse["task"],
): string {
  const parts = [
    ...(message?.parts ?? []),
    ...(task?.status?.message?.parts ?? []),
    ...(task?.artifacts?.flatMap((artifact) => artifact.parts ?? []) ?? []),
  ];

  return parts
    .map((part) => {
      if (typeof part.text === "string") return part.text;
      if (part.data === undefined) return "";
      return typeof part.data === "string" ? part.data : JSON.stringify(part.data);
    })
    .filter(Boolean)
    .join("\n")
    .trim();
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
