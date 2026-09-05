import { describe, expect, it } from "vitest";
import { HypervelocityMeshWatchdog } from "./aurea-hypervelocity-watchdog";

describe("HypervelocityMeshWatchdog", () => {
  it("intervenes after two consecutive no-progress interactions", () => {
    const watchdog = new HypervelocityMeshWatchdog();
    const pulse = {
      cycleId: "cycle-1",
      interaction: 1,
      objective: "advance E3",
      toolActions: 0,
      codeActions: 0,
      decisions: 0,
      artifactsProduced: 0,
      evidenceProduced: 0,
      cellsClosed: 0,
      blockers: 0,
      nextActionDefined: false,
    };

    expect(watchdog.observe(pulse).status).toBe("HEALTHY");
    expect(watchdog.observe({ ...pulse, interaction: 2 }).status).toBe("DRIFT");
    expect(watchdog.observe({ ...pulse, interaction: 3 }).directive).toContain("RETAKE_CONTROL");
  });

  it("detects execution decay against the first productive pulse", () => {
    const watchdog = new HypervelocityMeshWatchdog({ decayRatio: 0.5 });

    const productive = {
      cycleId: "cycle-2",
      interaction: 1,
      objective: "advance E3",
      toolActions: 4,
      codeActions: 2,
      decisions: 2,
      artifactsProduced: 1,
      evidenceProduced: 1,
      cellsClosed: 0,
      blockers: 0,
      nextActionDefined: true,
    };

    expect(watchdog.observe(productive).status).toBe("HEALTHY");

    const decayed = {
      ...productive,
      interaction: 2,
      toolActions: 0,
      codeActions: 0,
      decisions: 0,
      artifactsProduced: 0,
      evidenceProduced: 0,
      nextActionDefined: true,
    };

    const result = watchdog.observe(decayed);
    expect(result.status).toBe("DRIFT");
    expect(result.reasons).toContain("EXECUTION_SCORE_DECAY");
  });

  it("distinguishes an external blocker from unexplained drift", () => {
    const watchdog = new HypervelocityMeshWatchdog();
    const blocked = {
      cycleId: "cycle-3",
      interaction: 1,
      objective: "execute external agent",
      toolActions: 0,
      codeActions: 0,
      decisions: 1,
      artifactsProduced: 0,
      evidenceProduced: 0,
      cellsClosed: 0,
      blockers: 1,
      nextActionDefined: false,
    };

    expect(watchdog.observe(blocked).status).toBe("BLOCKED_EXTERNAL");
    expect(watchdog.observe(blocked).directive).toContain("BLOCKED_EXTERNAL");
  });
});
