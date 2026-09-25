export type ProviderAdapterHealthStatus = "HEALTHY" | "UNHEALTHY" | "BLOCKED";

export interface ProviderAdapterHealth {
  providerId: string;
  modelId: string;
  status: ProviderAdapterHealthStatus;
  checkedAt: string;
  evidence: string[];
  errorCode?: string;
}

export interface ProviderAdapterExecutionRequest {
  capability: string;
  input: string;
  traceId: string;
}

export interface ProviderAdapterExecutionResult {
  providerId: string;
  modelId: string;
  executionId: string;
  output: string;
  evidence: string[];
}

export interface ProviderAdapter {
  readonly providerId: string;
  readonly modelId: string;
  readonly capabilities: readonly string[];

  healthCheck(): Promise<ProviderAdapterHealth>;
  execute(request: ProviderAdapterExecutionRequest): Promise<ProviderAdapterExecutionResult>;
}

/**
 * Connection boundary only. An adapter is considered executable only after a
 * successful health check; registration alone never establishes connectivity.
 *
 * Credentials are intentionally absent from this contract. Implementations
 * resolve them through their approved secret/configuration boundary.
 */
export async function verifyProviderAdapter(
  adapter: ProviderAdapter,
): Promise<ProviderAdapterHealth> {
  const health = await adapter.healthCheck();

  if (health.providerId !== adapter.providerId || health.modelId !== adapter.modelId) {
    throw new Error("PROVIDER_HEALTH_IDENTITY_MISMATCH");
  }

  return {
    ...health,
    evidence: [...health.evidence],
  };
}
