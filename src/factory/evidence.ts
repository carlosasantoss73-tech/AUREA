import type { EvidenceKind } from "./agent-contract.js";

export interface EvidenceRecord {
  id: string;
  executionId: string;
  kind: EvidenceKind;
  source?: string;
  rule?: string;
  value: unknown;
  timestamp: string;
}

export interface EvidenceChain {
  executionId: string;
  records: EvidenceRecord[];
}

export class EvidenceLedger {
  private readonly chains = new Map<string, EvidenceRecord[]>();

  add(record: EvidenceRecord): void {
    const chain = this.chains.get(record.executionId) ?? [];
    chain.push(record);
    this.chains.set(record.executionId, chain);
  }

  get(executionId: string): EvidenceChain {
    return {
      executionId,
      records: [...(this.chains.get(executionId) ?? [])],
    };
  }
}
