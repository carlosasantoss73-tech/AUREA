import { describe, expect, it } from "vitest";
import { AureaAgentFactory } from "./agent-factory.js";
import { AUREA_SURVEYS_MANIFEST, defaultAureaSurveysTenant } from "../agents/aurea-surveys.js";

describe("AUREA Agent Factory", () => {
  it("accepts a valid agent package", () => {
    const factory = new AureaAgentFactory();
    const result = factory.validatePackage({
      manifest: AUREA_SURVEYS_MANIFEST,
      tenant: defaultAureaSurveysTenant,
    });
    expect(result.status).toBe("READY");
  });

  it("blocks an incomplete manifest", () => {
    const factory = new AureaAgentFactory();
    const result = factory.validatePackage({
      manifest: { ...AUREA_SURVEYS_MANIFEST, mission: "" },
      tenant: defaultAureaSurveysTenant,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("MANIFEST_MISSING:mission");
  });
});
