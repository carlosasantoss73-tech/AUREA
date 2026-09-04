import type { WorkCellFileStore } from "./work-cell-file-store.js";
import type { WorkCellRegistry } from "./work-cell-registry.js";

/** Connects authoritative in-process state with durable snapshot/recovery storage. */
export class WorkCellPersistenceBridge {
  constructor(
    private readonly registry: WorkCellRegistry,
    private readonly store: WorkCellFileStore,
  ) {}

  async persist(): Promise<void> {
    const cells = this.registry.list();
    const transitions = this.registry.history();
    await this.store.saveState({
      cells: Object.fromEntries(cells.map(cell => [cell.workCellId, cell])),
      transitions,
    });
  }

  async recover(): Promise<number> {
    const state = await this.store.loadState();
    const cells = Object.values(state.cells);
    this.registry.restore(cells, state.transitions);
    return cells.length;
  }
}
