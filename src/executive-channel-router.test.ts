import { describe, expect, it } from "vitest";
import { ExecutiveChannelRouter } from "./executive-channel-router.js";

const makeRouter = () => {
  const router = new ExecutiveChannelRouter();
  router.registerCompany({
    companyId: "company-a",
    customerServiceAgentId: "cs-company-a",
    ceoAgentId: "ceo-company-a",
    active: true,
  });
  return router;
};

describe("ExecutiveChannelRouter", () => {
  it("routes the President directly to the selected company CEO", () => {
    const result = makeRouter().route({
      traceId: "trace-president-1",
      requesterType: "PRESIDENT",
      requesterId: "president-1",
      targetCompanyId: "company-a",
      requestedChannel: "EXECUTIVE_DIRECT",
      objective: "Review the company's current priorities",
    });

    expect(result).toEqual({
      decision: "ROUTE",
      channel: "EXECUTIVE_DIRECT",
      targetAgentId: "ceo-company-a",
      companyId: "company-a",
      traceId: "trace-president-1",
    });
  });

  it("routes customer communication to the company's Customer Service Agent", () => {
    const result = makeRouter().route({
      traceId: "trace-customer-1",
      requesterType: "CUSTOMER",
      requesterId: "customer-1",
      targetCompanyId: "company-a",
      requestedChannel: "CUSTOMER_SERVICE",
      objective: "Request product information",
    });

    expect(result.targetAgentId).toBe("cs-company-a");
    expect(result.channel).toBe("CUSTOMER_SERVICE");
    expect(result.decision).toBe("ROUTE");
  });

  it("blocks non-President attempts to open the direct executive channel", () => {
    const result = makeRouter().route({
      traceId: "trace-agent-1",
      requesterType: "AGENT",
      requesterId: "agent-1",
      targetCompanyId: "company-a",
      requestedChannel: "EXECUTIVE_DIRECT",
      objective: "Ask for an executive decision",
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reason).toBe("EXECUTIVE_DIRECT_CHANNEL_REQUIRES_PRESIDENT");
    expect(result.targetAgentId).toBeUndefined();
  });

  it("fails closed when the target company channel is unavailable", () => {
    const result = makeRouter().route({
      traceId: "trace-missing-company",
      requesterType: "PRESIDENT",
      requesterId: "president-1",
      targetCompanyId: "company-missing",
      requestedChannel: "EXECUTIVE_DIRECT",
      objective: "Contact the CEO",
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reason).toBe("COMPANY_COMMUNICATION_CHANNEL_UNAVAILABLE");
  });
});
