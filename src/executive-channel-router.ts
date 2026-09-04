/** AUREA executive communication boundary — deterministic identity and routing. */

export type CommunicationRequesterType = "PRESIDENT" | "CEO" | "AGENT" | "CUSTOMER";
export type CommunicationChannelType = "CUSTOMER_SERVICE" | "EXECUTIVE_DIRECT";
export type CommunicationDecision = "ROUTE" | "BLOCK";

export interface CommunicationDirectoryEntry {
  companyId: string;
  customerServiceAgentId: string;
  ceoAgentId: string;
  active: boolean;
}

export interface ExecutiveChannelRequest {
  traceId: string;
  requesterType: CommunicationRequesterType;
  requesterId: string;
  targetCompanyId: string;
  requestedChannel: CommunicationChannelType;
  objective: string;
}

export interface ExecutiveChannelResult {
  decision: CommunicationDecision;
  channel?: CommunicationChannelType;
  targetAgentId?: string;
  companyId: string;
  traceId: string;
  reason?: string;
}

/**
 * Routes communication only. It does not grant business authority and does not
 * bypass the existing Permission Gateway for actions performed after routing.
 */
export class ExecutiveChannelRouter {
  private readonly directory = new Map<string, CommunicationDirectoryEntry>();

  registerCompany(entry: CommunicationDirectoryEntry): void {
    if (!entry.companyId) throw new Error("COMPANY_ID_REQUIRED");
    if (!entry.customerServiceAgentId) throw new Error("CUSTOMER_SERVICE_AGENT_REQUIRED");
    if (!entry.ceoAgentId) throw new Error("CEO_AGENT_REQUIRED");
    if (this.directory.has(entry.companyId)) throw new Error(`COMMUNICATION_DIRECTORY_ALREADY_REGISTERED:${entry.companyId}`);
    this.directory.set(entry.companyId, { ...entry });
  }

  route(request: ExecutiveChannelRequest): ExecutiveChannelResult {
    if (!request.traceId) throw new Error("TRACE_ID_REQUIRED");
    if (!request.requesterId) throw new Error("REQUESTER_ID_REQUIRED");
    if (!request.objective) throw new Error("COMMUNICATION_OBJECTIVE_REQUIRED");

    const entry = this.directory.get(request.targetCompanyId);
    if (!entry || !entry.active) {
      return {
        decision: "BLOCK",
        companyId: request.targetCompanyId,
        traceId: request.traceId,
        reason: "COMPANY_COMMUNICATION_CHANNEL_UNAVAILABLE",
      };
    }

    if (request.requestedChannel === "EXECUTIVE_DIRECT") {
      if (request.requesterType !== "PRESIDENT") {
        return {
          decision: "BLOCK",
          companyId: request.targetCompanyId,
          traceId: request.traceId,
          reason: "EXECUTIVE_DIRECT_CHANNEL_REQUIRES_PRESIDENT",
        };
      }

      return {
        decision: "ROUTE",
        channel: "EXECUTIVE_DIRECT",
        targetAgentId: entry.ceoAgentId,
        companyId: request.targetCompanyId,
        traceId: request.traceId,
      };
    }

    return {
      decision: "ROUTE",
      channel: "CUSTOMER_SERVICE",
      targetAgentId: entry.customerServiceAgentId,
      companyId: request.targetCompanyId,
      traceId: request.traceId,
    };
  }
}
