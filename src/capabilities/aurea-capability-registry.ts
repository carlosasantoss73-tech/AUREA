export type CapabilityKind = "SKILL" | "CONNECTOR" | "PROVIDER";
export type CapabilityStatus = "DRAFT" | "HUMAN_REVIEW" | "ACTIVE" | "RETIRED";

export interface CapabilityDefinition {
  id: string;
  kind: CapabilityKind;
  name: string;
  version: number;
  status: CapabilityStatus;
  description: string;
  tags?: string[];
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CapabilityTransition {
  from: CapabilityStatus;
  to: CapabilityStatus;
}

const ALLOWED_TRANSITIONS: CapabilityTransition[] = [
  { from: "DRAFT", to: "HUMAN_REVIEW" },
  { from: "HUMAN_REVIEW", to: "ACTIVE" },
  { from: "ACTIVE", to: "RETIRED" },
  { from: "RETIRED", to: "HUMAN_REVIEW" },
];

function canTransition(from: CapabilityStatus, to: CapabilityStatus): boolean {
  return ALLOWED_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}

/**
 * Governed metadata registry for reusable AUREA capabilities.
 * This registry does not connect to external systems or execute providers.
 */
export class AureaCapabilityRegistry {
  private readonly entries = new Map<string, CapabilityDefinition>();

  register(definition: CapabilityDefinition): void {
    if (!definition.id.trim()) throw new Error("CAPABILITY_ID_REQUIRED");
    if (definition.version < 1) throw new Error("CAPABILITY_VERSION_INVALID");
    if (this.entries.has(definition.id)) throw new Error("CAPABILITY_ALREADY_REGISTERED");
    this.entries.set(definition.id, { ...definition, tags: definition.tags ? [...definition.tags] : undefined });
  }

  get(id: string): CapabilityDefinition | undefined {
    const entry = this.entries.get(id);
    return entry ? { ...entry, tags: entry.tags ? [...entry.tags] : undefined } : undefined;
  }

  list(kind?: CapabilityKind, status?: CapabilityStatus): CapabilityDefinition[] {
    return [...this.entries.values()]
      .filter((entry) => (!kind || entry.kind === kind) && (!status || entry.status === status))
      .map((entry) => ({ ...entry, tags: entry.tags ? [...entry.tags] : undefined }));
  }

  transition(id: string, nextStatus: CapabilityStatus): CapabilityDefinition {
    const current = this.entries.get(id);
    if (!current) throw new Error("CAPABILITY_NOT_FOUND");
    if (!canTransition(current.status, nextStatus)) {
      throw new Error(`CAPABILITY_INVALID_TRANSITION:${current.status}->${nextStatus}`);
    }
    const updated = { ...current, status: nextStatus };
    this.entries.set(id, updated);
    return { ...updated, tags: updated.tags ? [...updated.tags] : undefined };
  }

  version(id: string, changes: Omit<CapabilityDefinition, "id" | "version" | "status">): CapabilityDefinition {
    const current = this.entries.get(id);
    if (!current) throw new Error("CAPABILITY_NOT_FOUND");
    if (current.status === "ACTIVE") throw new Error("CAPABILITY_ACTIVE_VERSION_IMMUTABLE");
    const updated: CapabilityDefinition = {
      ...changes,
      id,
      version: current.version + 1,
      status: "DRAFT",
      tags: changes.tags ? [...changes.tags] : undefined,
    };
    this.entries.set(id, updated);
    return { ...updated, tags: updated.tags ? [...updated.tags] : undefined };
  }
}
