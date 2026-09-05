/**
 * Minimal A2A v1 Agent Card discovery for AUREA external cells.
 *
 * Scope: discover an HTTPS HTTP+JSON v1.0 interface from the public
 * well-known Agent Card. Authentication and long-running task orchestration
 * remain execution-layer concerns.
 */

type A2AFetch = typeof fetch;

export interface A2AAgentInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
}

export interface A2AAgentCard {
  name?: string;
  description?: string;
  version?: string;
  supportedInterfaces?: A2AAgentInterface[];
  capabilities?: Record<string, unknown>;
  skills?: unknown[];
  securitySchemes?: Record<string, unknown>;
}

export interface A2ADiscoveredAgent {
  agentCardUrl: string;
  agentName?: string;
  agentVersion?: string;
  endpoint: string;
  protocolBinding: "HTTP+JSON";
  protocolVersion: "1.0";
  capabilities: Record<string, unknown>;
  skills: unknown[];
  securitySchemes: Record<string, unknown>;
}

export async function discoverA2AAgent(
  agentUrl: string,
  fetchImpl: A2AFetch = fetch,
): Promise<A2ADiscoveredAgent> {
  const base = new URL(agentUrl);
  if (base.protocol !== "https:") {
    throw new Error("A2A_DISCOVERY_HTTPS_REQUIRED");
  }

  const cardUrl = new URL("/.well-known/agent-card.json", base.origin);
  const response = await fetchImpl(cardUrl, {
    method: "GET",
    headers: {
      accept: "application/a2a+json, application/json",
      "a2a-version": "1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`A2A_DISCOVERY_HTTP_ERROR:${response.status}`);
  }

  let card: A2AAgentCard;
  try {
    card = (await response.json()) as A2AAgentCard;
  } catch {
    throw new Error("A2A_DISCOVERY_MALFORMED_JSON");
  }

  if (!card || typeof card !== "object" || !Array.isArray(card.supportedInterfaces)) {
    throw new Error("A2A_DISCOVERY_CARD_INVALID");
  }

  const supported = card.supportedInterfaces.find(
    (item) =>
      item &&
      item.protocolBinding === "HTTP+JSON" &&
      item.protocolVersion === "1.0" &&
      typeof item.url === "string",
  );

  if (!supported) {
    throw new Error("A2A_DISCOVERY_HTTP_JSON_V1_UNSUPPORTED");
  }

  const endpoint = new URL(supported.url);
  if (endpoint.protocol !== "https:") {
    throw new Error("A2A_DISCOVERY_ENDPOINT_HTTPS_REQUIRED");
  }

  return {
    agentCardUrl: cardUrl.toString(),
    agentName: card.name,
    agentVersion: card.version,
    endpoint: endpoint.toString(),
    protocolBinding: "HTTP+JSON",
    protocolVersion: "1.0",
    capabilities: card.capabilities ?? {},
    skills: card.skills ?? [],
    securitySchemes: card.securitySchemes ?? {},
  };
}
