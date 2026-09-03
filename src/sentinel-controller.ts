import { HealthSeverity } from "./health-ledger";
import { SentinelSignal } from "./sentinel";

export type SentinelDisposition = "CONTINUE" | "CONTAIN" | "ESCALATE";

export interface SentinelDecision {
  disposition: SentinelDisposition;
  severity: HealthSeverity;
  rationale: string;
  evidence: string[];
}

/** C5 Sentinel controller: containment is explicit; architectural changes escalate. */
export class SentinelController {
  decide(signal: SentinelSignal): SentinelDecision {
    if (signal.severity === "S4") {
      return {
        disposition: "ESCALATE",
        severity: signal.severity,
        rationale: "HOLDING_CRITICAL_REQUIRES_HUMAN_GOVERNANCE",
        evidence: [...signal.evidence],
      };
    }

    if (signal.severity === "S3") {
      return {
        disposition: "CONTAIN",
        severity: signal.severity,
        rationale: "CRITICAL_INCIDENT_REQUIRES_CONTAINMENT",
        evidence: [...signal.evidence],
      };
    }

    if (signal.severity === "S2") {
      return {
        disposition: "CONTAIN",
        severity: signal.severity,
        rationale: "MAJOR_INCIDENT_REQUIRES_CONTROLLED_CONTAINMENT",
        evidence: [...signal.evidence],
      };
    }

    return {
      disposition: "CONTINUE",
      severity: signal.severity,
      rationale: "NO_CONTAINMENT_REQUIRED",
      evidence: [...signal.evidence],
    };
  }
}
