import { describe, expect, it } from "vitest";
import { SentinelController } from "./sentinel-controller";
import { SentinelSignal } from "./sentinel";

const signal = (severity: SentinelSignal["severity"]): SentinelSignal => ({
  signalId: `sig-${severity}`,
  traceId: "trace-1",
  domain: "EXECUTION",
  component: "test",
  symptom: "test symptom",
  severity,
  evidence: ["test:evidence"],
});

describe("SentinelController", () => {
  it("contains major and critical incidents", () => {
    const controller = new SentinelController();
    expect(controller.decide(signal("S2")).disposition).toBe("CONTAIN");
    expect(controller.decide(signal("S3")).disposition).toBe("CONTAIN");
  });

  it("escalates holding-critical incidents", () => {
    expect(new SentinelController().decide(signal("S4")).disposition).toBe("ESCALATE");
  });

  it("does not overreact to informational/minor signals", () => {
    expect(new SentinelController().decide(signal("S0")).disposition).toBe("CONTINUE");
    expect(new SentinelController().decide(signal("S1")).disposition).toBe("CONTINUE");
  });
});
