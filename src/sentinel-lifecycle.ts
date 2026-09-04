import { HealthLedger, HealthRecord } from "./health-ledger.js";
import { AureaSentinel, SentinelSignal } from "./sentinel.js";
import { SentinelController, SentinelDecision } from "./sentinel-controller.js";

export interface SentinelLifecycleResult {
  record: HealthRecord;
  decision: SentinelDecision;
}

/**
 * Extends the existing Sentinel observe/contain kernel into an auditable
 * diagnose → classify → verify → learn loop. It never changes architecture
 * or policy; those remain governance decisions.
 */
export class SentinelLifecycle {
  private readonly sentinel: AureaSentinel;

  constructor(
    private readonly ledger: HealthLedger,
    private readonly controller: SentinelController = new SentinelController(),
  ) {
    this.sentinel = new AureaSentinel(ledger);
  }

  process(signal: SentinelSignal): SentinelLifecycleResult {
    const record = this.sentinel.observe(signal);
    const decision = this.controller.decide(signal);
    if (decision.disposition === "CONTAIN") {
      const contained = this.sentinel.contain(record, decision.rationale);
      return { record: contained, decision };
    }
    if (decision.disposition === "ESCALATE") {
      const escalated = this.append(record, "ESCALATED", {
        result: decision.rationale,
        actionTaken: "ESCALATED_TO_HUMAN_GOVERNANCE",
      });
      return { record: escalated, decision };
    }
    return { record, decision };
  }

  diagnose(record: HealthRecord, diagnosis: string, rootCause?: string, impact?: string): HealthRecord {
    if (!diagnosis) throw new Error("SENTINEL_DIAGNOSIS_REQUIRED");
    return this.append(record, "INVESTIGATING", { diagnosis, rootCause, impact });
  }

  classify(record: HealthRecord, classification: string, recommendedAction?: string): HealthRecord {
    if (!classification) throw new Error("SENTINEL_CLASSIFICATION_REQUIRED");
    return this.append(record, "REMEDIATING", { result: `CLASSIFICATION:${classification}`, recommendedAction });
  }

  verify(record: HealthRecord, verification: string, resolved = false): HealthRecord {
    if (!verification) throw new Error("SENTINEL_VERIFICATION_REQUIRED");
    return this.append(record, resolved ? "RESOLVED" : "VERIFYING", { verification });
  }

  learn(record: HealthRecord, learning: string, preventiveRule?: string): HealthRecord {
    if (!learning) throw new Error("SENTINEL_LEARNING_REQUIRED");
    return this.append(record, "RESOLVED", { learning, preventiveRule });
  }

  private append(
    record: HealthRecord,
    status: HealthRecord["status"],
    fields: Partial<Pick<HealthRecord, "diagnosis" | "rootCause" | "impact" | "recommendedAction" | "actionTaken" | "verification" | "result" | "learning" | "preventiveRule">>,
  ): HealthRecord {
    const next: HealthRecord = {
      ...record,
      ...fields,
      status,
      healthRecordId: `${record.healthRecordId}-${status}`,
      evidence: [...record.evidence, `SENTINEL_STATUS:${status}`],
      timestamp: new Date().toISOString(),
    };
    this.ledger.append(next);
    return next;
  }
}
