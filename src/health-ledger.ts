/** AUREA Health Ledger — P0 evidence-backed operational health record. */

export type HealthSeverity = "S0" | "S1" | "S2" | "S3" | "S4";
export type HealthDomain = "KNOWLEDGE" | "EXECUTION" | "PROVIDER" | "SECURITY" | "QA" | "WORK_CELL" | "GOVERNANCE";
export type HealthStatus = "OPEN" | "INVESTIGATING" | "CONTAINED" | "REMEDIATING" | "VERIFYING" | "RESOLVED" | "ESCALATED" | "ACCEPTED_RISK";

export interface HealthRecord {
  healthRecordId: string;
  timestamp: string;
  severity: HealthSeverity;
  domain: HealthDomain;
  component: string;
  projectId?: string;
  workCellId?: string;
  traceId: string;
  symptom: string;
  evidence: string[];
  diagnosis?: string;
  rootCause?: string;
  impact?: string;
  containment?: string;
  recommendedAction?: string;
  actionTaken?: string;
  verification?: string;
  result?: string;
  learning?: string;
  preventiveRule?: string;
  status: HealthStatus;
}

export class HealthLedger {
  private records: HealthRecord[] = [];

  append(record: HealthRecord): void {
    if (!record.healthRecordId || !record.traceId || record.evidence.length === 0) {
      throw new Error("HEALTH_RECORD_REQUIRES_ID_TRACE_AND_EVIDENCE");
    }
    this.records.push({ ...record, evidence: [...record.evidence] });
  }

  list(): HealthRecord[] {
    return this.records.map(record => ({ ...record, evidence: [...record.evidence] }));
  }

  unresolved(): HealthRecord[] {
    return this.list().filter(record => !["RESOLVED", "ACCEPTED_RISK"].includes(record.status));
  }
}
