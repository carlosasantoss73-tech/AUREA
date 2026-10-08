import { describe, expect, it } from "vitest";
import {
  AUREA_PROCUREMENT_DOMAIN_PACKAGE,
  AUREA_PROCUREMENT_DOMAIN_READINESS,
} from "./aurea-procurement-domain.js";

describe("AUREA Procurement domain package", () => {
  it("uses the Factory domain contract without rebuilding universal infrastructure", () => {
    expect(AUREA_PROCUREMENT_DOMAIN_PACKAGE.agentId).toBe("aurea-procurement");
    expect(AUREA_PROCUREMENT_DOMAIN_READINESS).toEqual({
      status: "READY",
      blockers: [],
    });
  });
});
