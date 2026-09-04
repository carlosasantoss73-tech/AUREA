/** AUREA durable Work Cell snapshot/history adapter. */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { WorkCell } from "./work-cell.js";
import type { WorkCellTransition } from "./work-cell-registry.js";

export interface WorkCellPersistenceState {
  cells: Record<string, WorkCell>;
  transitions: WorkCellTransition[];
}

const emptyState = (): WorkCellPersistenceState => ({ cells: {}, transitions: [] });

/**
 * Durable storage adapter kept separate from the in-process WorkCellRegistry.
 * It provides snapshot/recovery primitives without changing the registry API.
 */
export class WorkCellFileStore {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<WorkCellPersistenceState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<WorkCellPersistenceState>;
      return {
        cells: parsed.cells ?? {},
        transitions: parsed.transitions ?? [],
      };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code === "ENOENT") return emptyState();
      throw error;
    }
  }

  private async save(state: WorkCellPersistenceState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
    await rename(tempPath, this.filePath);
  }

  async saveSnapshot(cell: WorkCell): Promise<void> {
    const state = await this.load();
    state.cells[cell.workCellId] = structuredClone(cell);
    await this.save(state);
  }

  async saveTransition(transition: WorkCellTransition): Promise<void> {
    const state = await this.load();
    state.transitions.push(structuredClone(transition));
    await this.save(state);
  }

  async getSnapshot(workCellId: string): Promise<WorkCell | undefined> {
    const state = await this.load();
    const cell = state.cells[workCellId];
    return cell ? structuredClone(cell) : undefined;
  }

  async getTransitions(workCellId?: string): Promise<WorkCellTransition[]> {
    const state = await this.load();
    return state.transitions
      .filter(item => !workCellId || item.workCellId === workCellId)
      .map(item => structuredClone(item));
  }

  async recover(workCellId: string): Promise<WorkCell | undefined> {
    return this.getSnapshot(workCellId);
  }
}
