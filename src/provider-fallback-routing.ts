/** AUREA H13 — deterministic provider fallback policy over the existing ProviderRuntime. */
import type { ProviderRuntime, ProviderRuntimeAdapter } from "./provider-runtime.js";

export interface ProviderFallbackRequest {
  requiredCapability: string;
  preferredProviderId?: string;
  orderedProviderIds: string[];
}

export interface ProviderFallbackResult {
  status: "SELECTED" | "BLOCKED";
  provider?: ProviderRuntimeAdapter;
  attempts: string[];
  evidence: string[];
  blockers: string[];
}

/**
 * Fallback is selection-only: it never executes a provider and never bypasses
 * the existing ProviderRuntime eligibility rules.
 */
export class ProviderFallbackRouter {
  constructor(private readonly runtime: ProviderRuntime) {}

  select(request: ProviderFallbackRequest): ProviderFallbackResult {
    const attempts: string[] = [];
    const ordered = request.preferredProviderId
      ? [request.preferredProviderId, ...request.orderedProviderIds.filter(id => id !== request.preferredProviderId)]
      : [...request.orderedProviderIds];

    for (const providerId of ordered) {
      attempts.push(providerId);
      const result = this.runtime.select({
        requiredCapability: request.requiredCapability,
        allowedProviderIds: [providerId],
      });
      if (result.status === "SELECTED" && result.provider) {
        return {
          status: "SELECTED",
          provider: result.provider,
          attempts,
          evidence: [...result.evidence, `FALLBACK_ATTEMPT_ORDER:${attempts.join(",")}`],
          blockers: [],
        };
      }
    }

    return {
      status: "BLOCKED",
      attempts,
      evidence: [`FALLBACK_ATTEMPTS:${attempts.join(",")}`],
      blockers: ["NO_EXECUTABLE_PROVIDER_AFTER_FALLBACK"],
    };
  }
}
