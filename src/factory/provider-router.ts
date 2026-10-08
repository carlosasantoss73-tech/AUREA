export interface ModelRequirements {
  task: string;
  capabilities: string[];
  maxCost?: number;
  maxLatencyMs?: number;
  modality?: string;
}

export interface ProviderCandidate {
  providerId: string;
  modelId: string;
  capabilities: string[];
  executable: boolean;
  estimatedCost?: number;
  estimatedLatencyMs?: number;
}

export interface ProviderSelection {
  selected?: ProviderCandidate;
  attempts: string[];
  blockers: string[];
}

export class ProviderNeutralRouter {
  select(
    requirements: ModelRequirements,
    candidates: ProviderCandidate[],
    preferredProvider?: string,
  ): ProviderSelection {
    const ordered = [...candidates].sort((a, b) => {
      if (preferredProvider) {
        if (a.providerId === preferredProvider && b.providerId !== preferredProvider) return -1;
        if (b.providerId === preferredProvider && a.providerId !== preferredProvider) return 1;
      }
      return (a.estimatedCost ?? Number.POSITIVE_INFINITY) -
        (b.estimatedCost ?? Number.POSITIVE_INFINITY);
    });

    const attempts: string[] = [];
    for (const candidate of ordered) {
      attempts.push(`${candidate.providerId}/${candidate.modelId}`);
      if (!candidate.executable) continue;
      if (!requirements.capabilities.every(c => candidate.capabilities.includes(c))) continue;
      if (requirements.maxCost !== undefined &&
          candidate.estimatedCost !== undefined &&
          candidate.estimatedCost > requirements.maxCost) continue;
      if (requirements.maxLatencyMs !== undefined &&
          candidate.estimatedLatencyMs !== undefined &&
          candidate.estimatedLatencyMs > requirements.maxLatencyMs) continue;
      return { selected: candidate, attempts, blockers: [] };
    }

    return {
      attempts,
      blockers: ["NO_EXECUTABLE_PROVIDER_MATCH"],
    };
  }
}
