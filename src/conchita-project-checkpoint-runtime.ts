import type { ConchitaMode, ConchitaSession } from './conchita-personal-v0-contract.js';
import type { ConchitaMessageResponse } from './conchita-personal-v0-contract.js';
import type { ProjectCheckpoint, ProjectCheckpointStore } from './context/durable-context-store.js';

export const CONCHITA_PILOT_PROJECT_ID = 'CONCHITA-PILOT' as const;

export interface CheckpointedConchitaRequest {
  session: ConchitaSession;
  message: string;
  mode: ConchitaMode;
  traceId: string;
  /** Recovered server-side checkpoint; never accepted from the client. */
  checkpoint?: ProjectCheckpoint;
}

export interface ConchitaCheckpointRuntimeHandler {
  handle(request: CheckpointedConchitaRequest): Promise<Pick<ConchitaMessageResponse, 'status' | 'response' | 'evidence' | 'blockers'>>;
}

/**
 * Checkpoint lifecycle at the authenticated runtime boundary.
 * The project ID is read only from the server-loaded session record and must match
 * the single-project pilot contract. The message and provider output are never persisted.
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

      // Persist only operational metadata, never user messages, provider outputs, or source documents.
      const next: ProjectCheckpoint = {
        schemaVersion: 1,
        projectId: CONCHITA_PILOT_PROJECT_ID,
        updatedAt: this.now(),
        summary: recovered ? 'Conchita pilot runtime checkpoint refreshed.' : 'Conchita pilot runtime checkpoint initialized.',
        completed: result.status === 'COMPLETED' ? ['AUTHENTICATED_RUNTIME_REQUEST_COMPLETED'] : [],
        blockers: result.status === 'BLOCKED' ? result.blockers.slice(0, 10) : [],
        nextAction: result.status === 'BLOCKED' ? 'Resolve runtime blockers before the next request.' : 'Continue the authenticated Conchita pilot.',
        evidenceRefs: ['CONCHITA_PILOT_RUNTIME'],
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
