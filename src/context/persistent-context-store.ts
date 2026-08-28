import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { ContextRecord, ContextStore, createStoreContextProvider } from "./durable-context-store";
import { ContextProvider, RetrievedContext } from "./context-retrieval-gate";

/** File-backed store for deployments that do not yet have a database adapter. */
export class JsonContextStore implements ContextStore {
  private cache: ContextRecord[] = [];
  private loaded = false;
  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("CONTEXT_STORE_INVALID_FORMAT");
      this.cache = parsed as ContextRecord[];
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      this.cache = [];
    }
    this.loaded = true;
  }

  get records(): readonly ContextRecord[] { return this.cache; }

  search(projectId: string, query: string): ContextRecord[] {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const terms = normalize(query).split(/\s+/).filter(term => term.length >= 3);
    return this.cache.filter(record => record.projectId === projectId)
      .map(record => ({ record, score: terms.reduce((score, term) => score + (normalize(`${record.title} ${record.text} ${(record.tags ?? []).join(" ")}`).includes(term) ? 1 : 0), 0) }))
      .filter(item => item.score > 0).sort((a,b) => b.score-a.score || a.record.id.localeCompare(b.record.id)).map(item => item.record);
  }

  async initialize(): Promise<void> { await this.ensureLoaded(); }

  async upsert(record: ContextRecord): Promise<void> {
    await this.ensureLoaded();
    const index = this.cache.findIndex(item => item.id === record.id);
    if (index >= 0) {
      if (record.version <= this.cache[index].version) throw new Error("CONTEXT_VERSION_MUST_INCREASE");
      this.cache[index] = record;
    } else this.cache.push(record);
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), "utf8");
  }
}

export async function createPersistentContextProvider(filePath: string, seed: readonly ContextRecord[] = []): Promise<{ store: JsonContextStore; provider: ContextProvider }> {
  const store = new JsonContextStore(filePath);
  await store.initialize();
  for (const record of seed) {
    if (!store.records.some(existing => existing.id === record.id)) await store.upsert(record);
  }
  return { store, provider: createStoreContextProvider(store) };
}
