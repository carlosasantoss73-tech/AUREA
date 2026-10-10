export type IntegrationKind = "CONNECTOR" | "PROVIDER";
export type IntegrationStatus = "DESIGNED" | "CONFIGURED" | "VERIFIED" | "DISABLED";

export interface IntegrationContext {
  projectId: string;
  actorId: string;
  actorRole: string;
  allowedCapabilities: string[];
  allowedTools: string[];
}

export interface IntegrationResult<T = unknown> {
  status: "SUCCEEDED" | "FAILED";
  integrationId: string;
  operation: string;
  output?: T;
  errorCode?: string;
  traceId?: string;
}

export interface AureaIntegration<TInput = unknown, TOutput = unknown> {
  id: string;
  kind: IntegrationKind;
  version: number;
  status: IntegrationStatus;
  capabilities: string[];
  execute(input: TInput, context: IntegrationContext): Promise<IntegrationResult<TOutput>>;
}

/**
 * Integration contracts deliberately stop at the adapter boundary.
 * Credentials, external network calls and side effects remain outside this P0 contract.
 */
export function assertIntegrationUsable(integration: AureaIntegration, context: IntegrationContext): void {
  if (integration.status !== "VERIFIED") throw new Error("INTEGRATION_NOT_VERIFIED");
  if (!integration.id.trim()) throw new Error("INTEGRATION_ID_REQUIRED");
  if (!context.projectId.trim()) throw new Error("PROJECT_ID_REQUIRED");
  if (!context.actorId.trim()) throw new Error("ACTOR_ID_REQUIRED");
  if (!context.allowedCapabilities.some((capability) => integration.capabilities.includes(capability))) {
    throw new Error("INTEGRATION_CAPABILITY_NOT_ALLOWED");
  }
}

export type MediaOperation = "IMAGE" | "VIDEO" | "VOICE" | "AVATAR" | "AUDIO" | "SUBTITLE";

export interface MediaRequest {
  operation: MediaOperation;
  prompt: string;
  inputAssetIds?: string[];
  outputFormat?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaResult {
  assetId: string;
  providerId: string;
  operation: MediaOperation;
  uri: string;
  metadata?: Record<string, unknown>;
}
