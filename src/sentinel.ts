/** AUREA Sentinel — P0 detection/containment kernel. */

import { HealthLedger, HealthRecord, HealthSeverity, HealthDomain } from "./health-ledger.js";

export type SentinelAction = "OBSERVE" | "DETECT" | "DIAGNOSE" | "CLASSIFY" | "CONTAIN" | "ESCALATE" | "VERIFY" | "LEARN";

export interface SentinelSignal {
  signalId: string;
  traceId: string;
  domain: HealthDomain;
  component: string;
  symptom: string;
  severity: HealthSeverity;
  evidence: string[];
  projectId?: string;
  workCellId?: string;
}

export class AureaSentinel {
  constructor(private readonly ledger: HealthLedger) {}

  observe(signal: SentinelSignal): HealthRecord {
    const record: HealthRecord = {
      healthRecordId: `HR-${signal.signalId}`,
      timestamp: new Date().toISOString(),
      severity: signal.severity,
      domain: signal.domain,
      component: signal.component,
      projectId: signal.projectId,
      workCellId: signal.workCellId,
      traceId: signal.traceId,
      symptom: signal.symptom,
      evidence: [...signal.evidence],
      status: "OPEN",
    };
    this.ledger.append(record);
    return record;
  }

  contain(record: HealthRecord, reason: string): HealthRecord {
    const updated = { ...record, containment: reason, status: "CONTAINED" as const };
    this.ledger.append({ ...updated, healthRecordId: `${record.healthRecordId}-C` });
    return updated;
  }
}
