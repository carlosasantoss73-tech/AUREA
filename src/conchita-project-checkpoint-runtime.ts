import type { ConchitaMode, ConchitaSession } from './conchita-personal-v0-contract.js';
import type { ConchitaMessageResponse } from './conchita-personal-v0-contract.js';
import type { ProjectCheckpoint, ProjectCheckpointStore } from './context/durable-context-store.js';

export const CONCHITA_PILOT_PROJECT_ID = 'CONCHITA-PILOT' as const;

export interface CheckpointedConchitaRequest {
  session: ConchitaSession;
  message: string;
  mode: ConchitaMode;
  traceId: string;
  /** Recovered server-side work state; never accepted from the client. */
  checkpoint?: ProjectCheckpoint;
}

export interface ConchitaCheckpointRuntimeHandler {
  handle(request: CheckpointedConchitaRequest): Promise<Pick<ConchitaMessageResponse, 'status' | 'response' | 'evidence' | 'blockers'>>;
}

// Only stable runtime identifiers are eligible for checkpoint metadata. Free-form text,
// provider output, user input, and document excerpts are deliberately excluded.
const SAFE_RUNTIME_REF = /^[A-Z][A-Z0-9_.:-]{0,79}$/;

function safeRuntimeRefs(values: readonly string[]): string[] {
  return [...new Set(values.filter(value => SAFE_RUNTIME_REF.test(value)))].slice(0, 10);
}

/**
 * Checkpoint lifecycle at the authenticated runtime boundary.
 * The project ID is read only from the server-loaded session record and must match
 * the single-project pilot contract. Only status and bounded runtime identifiers are saved;
 * messages, provider output, and institutional source documents are never persisted.
 */
export class ConchitaProjectCheckpointRuntime implements ConchitaCheckpointRuntimeHandler {
  constructor(
    private readonly handler: ConchitaCheckpointRuntimeHandler,
    private readonly checkpoints: ProjectCheckpointStore,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async handle(request: CheckpointedConchitaRequest): Promise<Pick<ConchitaMessageResponse, 'status' | 'response' | 'evidence' | 'blockers'>> {
    const projectId = request.session.projectId;
    if (projectId !== CONCHITA_PILOT_PROJECT_ID) {
      return { status: 'BLOCKED', evidence: ['CONCHITA_PROJECT_SCOPE_GATE'], blockers: ['CONCHITA_PROJECT_SCOPE_MISMATCH'] };
    }

    try {
      // Explicit allow-list remains server-owned; no client request field participates.
      const recovered = await this.checkpoints.load(CONCHITA_PILOT_PROJECT_ID);
      const result = await this.handler.handle({ ...request, checkpoint: recovered ?? undefined });

      // Construct state only from the runtime's typed status and allow-listed identifiers.
      // Never copy result.response, request.message, provider outputs, or source documents.
      const blockers = result.status === 'BLOCKED'
        ? safeRuntimeRefs(result.blockers).slice(0, 10)
        : [];
      const evidenceRefs = safeRuntimeRefs(result.evidence);
      const completed = result.status === 'COMPLETED' ? ['RUNTIME_REQUEST_COMPLETED'] : [];
      const nextAction = result.status === 'BLOCKED'
        ? (blockers.length ? `Resolve runtime blocker(s): ${blockers.join(', ')}` : 'Inspect runtime gate evidence before retrying.')
        : 'Continue from the completed Conchita pilot checkpoint.';

      const next: ProjectCheckpoint = {
        schemaVersion: 1,
        projectId: CONCHITA_PILOT_PROJECT_ID,
        updatedAt: this.now(),
        summary: result.status === 'COMPLETED'
          ? 'Authenticated Conchita runtime request completed.'
          : 'Authenticated Conchita runtime request blocked.',
        completed,
        blockers,
        nextAction,
        evidenceRefs,
      };
      await this.checkpoints.save(next);
      return {
        ...result,
        evidence: [...new Set([...result.evidence, recovered ? 'PROJECT_CHECKPOINT_RECOVERED' : 'PROJECT_CHECKPOINT_INITIALIZED', 'PROJECT_CHECKPOINT_SAVED'])],
      };
    } catch {
      // Storage failure blocks execution; do not silently proceed without recovery state.
      return { status: 'BLOCKED', evidence: ['CONCHITA_PROJECT_CHECKPOINT_FAIL_CLOSED'], blockers: ['CONCHITA_PROJECT_CHECKPOINT_UNAVAILABLE'] };
    }
  }
}
