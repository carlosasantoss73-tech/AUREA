/** AUREA execution observability — evidence-bound telemetry without coupling to a vendor. */

export interface ExecutionTelemetryRecord {
  traceId: string;
  projectId?: string;
  workCellId?: string;
  providerId?: string;
  modelId?: string;
  status: "STARTED" | "SUCCEEDED" | "FAILED" | "BLOCKED" | "REPLAYED";
  startedAt: string;
  completedAt?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  qaStatus?: "PASS" | "FAIL" | "PENDING";
  evidence: string[];
}

export interface ExecutionTelemetrySink {
  append(record: ExecutionTelemetryRecord): void | Promise<void>;
  list(traceId?: string): ExecutionTelemetryRecord[] | Promise<ExecutionTelemetryRecord[]>;
}

/** In-memory sink for tests and local operation; production storage remains an adapter concern. */
export class InMemoryExecutionTelemetry implements ExecutionTelemetrySink {
  private readonly records: ExecutionTelemetryRecord[] = [];

  append(record: ExecutionTelemetryRecord): void {
    this.records.push({ ...record, evidence: [...record.evidence] });
  }

  list(traceId?: string): ExecutionTelemetryRecord[] {
    return this.records
      .filter(record => traceId === undefined || record.traceId === traceId)
      .map(record => ({ ...record, evidence: [...record.evidence] }));
  }
}

/**
 * Computes a completed execution record from explicit timestamps and result metadata.
 * It does not infer cost or token usage: absent measurements remain absent.
 */
export function completeExecutionTelemetry(
  started: ExecutionTelemetryRecord,
  completion: Pick<ExecutionTelemetryRecord, "status" | "completedAt" | "providerId" | "modelId" | "qaStatus" | "inputTokens" | "outputTokens" | "estimatedCost" | "evidence">,
): ExecutionTelemetryRecord {
  const completedAt = completion.completedAt ?? new Date().toISOString();
  const latencyMs = Math.max(0, new Date(completedAt).getTime() - new Date(started.startedAt).getTime());
  return {
    ...started,
    ...completion,
    completedAt,
    latencyMs,
    evidence: [...new Set([...started.evidence, ...completion.evidence])],
  };
}
