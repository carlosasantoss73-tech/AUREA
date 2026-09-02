import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { OperationsCheckpoint, OperationsProject, OperationsStore } from "./operations-center";

interface OperationsFileState {
  projects: Record<string, OperationsProject>;
  checkpoints: Record<string, OperationsCheckpoint>;
}

const emptyState = (): OperationsFileState => ({ projects: {}, checkpoints: {} });

/** Durable adapter for the Operations Center. The domain layer remains storage-agnostic. */
export class FileOperationsStore implements OperationsStore {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<OperationsFileState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<OperationsFileState>;
      return {
        projects: parsed.projects ?? {},
        checkpoints: parsed.checkpoints ?? {},
      };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code === "ENOENT") return emptyState();
      throw error;
    }
  }

  private async save(state: OperationsFileState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, this.filePath);
  }

  async saveProject(project: OperationsProject): Promise<void> {
    const state = await this.load();
    state.projects[project.projectId] = structuredClone(project);
    await this.save(state);
  }

  async getProject(projectId: string): Promise<OperationsProject | undefined> {
    const state = await this.load();
    const project = state.projects[projectId];
    return project ? structuredClone(project) : undefined;
  }

  async saveCheckpoint(checkpoint: OperationsCheckpoint): Promise<void> {
    const state = await this.load();
    state.checkpoints[checkpoint.id] = structuredClone(checkpoint);
    const project = state.projects[checkpoint.projectId];
    if (project) {
      project.state = checkpoint.state;
      project.activeSessionId = checkpoint.sessionId;
      project.lastCheckpointId = checkpoint.id;
    }
    await this.save(state);
  }

  async getLatestCheckpoint(projectId: string): Promise<OperationsCheckpoint | undefined> {
    const state = await this.load();
    const matches = Object.values(state.checkpoints)
      .filter(checkpoint => checkpoint.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return matches[0] ? structuredClone(matches[0]) : undefined;
  }
}
