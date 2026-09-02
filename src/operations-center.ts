export type OperationsProjectState = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface OperationsCheckpoint {
  id: string;
  projectId: string;
  sessionId: string;
  state: OperationsProjectState;
  objective: string;
  workDone: string[];
  decisions: string[];
  pending: string[];
  nextAction: string;
  evidence: string[];
  updatedAt: string;
}

export interface OperationsProject {
  projectId: string;
  name: string;
  objective: string;
  state: OperationsProjectState;
  activeSessionId?: string;
  lastCheckpointId?: string;
}

export interface OperationsStore {
  saveProject(project: OperationsProject): Promise<void>;
  getProject(projectId: string): Promise<OperationsProject | undefined>;
  saveCheckpoint(checkpoint: OperationsCheckpoint): Promise<void>;
  getLatestCheckpoint(projectId: string): Promise<OperationsCheckpoint | undefined>;
}

export class InMemoryOperationsStore implements OperationsStore {
  private readonly projects = new Map<string, OperationsProject>();
  private readonly checkpoints = new Map<string, OperationsCheckpoint>();

  async saveProject(project: OperationsProject): Promise<void> {
    this.projects.set(project.projectId, structuredClone(project));
  }

  async getProject(projectId: string): Promise<OperationsProject | undefined> {
    const project = this.projects.get(projectId);
    return project ? structuredClone(project) : undefined;
  }

  async saveCheckpoint(checkpoint: OperationsCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, structuredClone(checkpoint));
    const project = this.projects.get(checkpoint.projectId);
    if (project) {
      project.state = checkpoint.state;
      project.activeSessionId = checkpoint.sessionId;
      project.lastCheckpointId = checkpoint.id;
    }
  }

  async getLatestCheckpoint(projectId: string): Promise<OperationsCheckpoint | undefined> {
    const matches = [...this.checkpoints.values()]
      .filter(checkpoint => checkpoint.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return matches[0] ? structuredClone(matches[0]) : undefined;
  }
}

export class OperationsCenter {
  constructor(private readonly store: OperationsStore) {}

  async openProject(project: OperationsProject, sessionId: string): Promise<OperationsCheckpoint | undefined> {
    await this.store.saveProject({ ...project, state: "ACTIVE", activeSessionId: sessionId });
    return this.store.getLatestCheckpoint(project.projectId);
  }

  async checkpoint(input: Omit<OperationsCheckpoint, "updatedAt">, updatedAt = new Date().toISOString()): Promise<OperationsCheckpoint> {
    const checkpoint = { ...input, updatedAt };
    await this.store.saveCheckpoint(checkpoint);
    return checkpoint;
  }

  async resume(projectId: string, sessionId: string): Promise<OperationsCheckpoint | undefined> {
    const project = await this.store.getProject(projectId);
    if (!project) return undefined;
    await this.store.saveProject({ ...project, state: "ACTIVE", activeSessionId: sessionId });
    return this.store.getLatestCheckpoint(projectId);
  }
}
