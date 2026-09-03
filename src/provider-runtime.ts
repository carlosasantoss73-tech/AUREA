export type ProviderRuntimeStatus =
  | "REGISTERED"
  | "CONFIGURED"
  | "CONNECTED"
  | "AVAILABLE"
  | "EXECUTABLE"
  | "BLOCKED";

export interface ProviderRuntimeAdapter {
  providerId: string;
  modelId: string;
  status: ProviderRuntimeStatus;
  capabilities: string[];
  healthEvidence: string[];
}

export interface ProviderSelectionRequest {
  requiredCapability: string;
  preferredProviderId?: string;
  allowedProviderIds?: string[];
}

export interface ProviderSelectionResult {
  status: "SELECTED" | "BLOCKED";
  provider?: ProviderRuntimeAdapter;
  blockers: string[];
  evidence: string[];
}

/**
 * C2 Provider Runtime: separates registration from executable availability.
 * Selection is deterministic and fail-closed; it never invents a provider.
 */
export class ProviderRuntime {
  private readonly providers = new Map<string, ProviderRuntimeAdapter>();

  register(provider: ProviderRuntimeAdapter): void {
    if (this.providers.has(provider.providerId)) {
      throw new Error(`PROVIDER_ALREADY_REGISTERED:${provider.providerId}`);
    }
    this.providers.set(provider.providerId, {
      ...provider,
      capabilities: [...provider.capabilities],
      healthEvidence: [...provider.healthEvidence],
    });
  }

  select(request: ProviderSelectionRequest): ProviderSelectionResult {
    const candidates = [...this.providers.values()]
      .filter((provider) =>
        request.allowedProviderIds
          ? request.allowedProviderIds.includes(provider.providerId)
          : true,
      )
      .filter((provider) => provider.capabilities.includes(request.requiredCapability))
      .filter((provider) => provider.status === "EXECUTABLE");

    const preferred = request.preferredProviderId
      ? candidates.find((provider) => provider.providerId === request.preferredProviderId)
      : undefined;
    const provider = preferred ?? candidates[0];

    if (!provider) {
      return {
        status: "BLOCKED",
        blockers: ["NO_EXECUTABLE_PROVIDER_FOR_CAPABILITY"],
        evidence: [...this.providers.values()].map(
          (item) => `${item.providerId}:${item.status}`,
        ),
      };
    }

    return {
      status: "SELECTED",
      provider: {
        ...provider,
        capabilities: [...provider.capabilities],
        healthEvidence: [...provider.healthEvidence],
      },
      blockers: [],
      evidence: [`${provider.providerId}:${provider.modelId}:${provider.status}`],
    };
  }
}
