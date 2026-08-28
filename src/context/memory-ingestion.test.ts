import { describe, expect, it } from "vitest";
import { InMemoryContextStore } from "./durable-context-store";
import { ingestEvidence } from "./memory-ingestion";

describe("AUREA memory ingestion", () => {
  it("creates evidence and can be retrieved", async () => {
    const records: any[] = [];
    const store = { records, search: () => [], upsert: async (record: any): Promise<void> => { records.push(record); } };
    const result = await ingestEvidence(store, { projectId: "aurea", sourceId: "conversation:1", title: "Krea evaluation", text: "Krea is a candidate for creative video production.", tags: ["krea", "video"] });
    expect(result.action).toBe("CREATED");
    expect(records).toHaveLength(1);
    const readStore = new InMemoryContextStore(records);
    const found = readStore.search("aurea", "Krea video");
    expect(found[0].text).toContain("creative video");
  });

  it("is idempotent for the same evidence", async () => {
    const records: any[] = [];
    const store = { records, search: () => [], upsert: async (record: any): Promise<void> => { const i = records.findIndex(r => r.id === record.id); if (i >= 0) records[i] = record; else records.push(record); } };
    const input = { projectId: "aurea", sourceId: "conversation:2", title: "Decision", text: "Use evidence first." };
    expect((await ingestEvidence(store, input)).action).toBe("CREATED");
    expect((await ingestEvidence(store, input)).action).toBe("UNCHANGED");
    expect(records).toHaveLength(1);
  });

  it("creates a new version when evidence changes", async () => {
    const records: any[] = [];
    const store = { records, search: () => [], upsert: async (record: any): Promise<void> => { const i = records.findIndex(r => r.id === record.id); if (i >= 0) records[i] = record; else records.push(record); } };
    const base = { projectId: "aurea", sourceId: "conversation:3", title: "Decision", text: "v1" };
    expect((await ingestEvidence(store, base)).record.version).toBe(1);
    expect((await ingestEvidence(store, { ...base, text: "v2" })).record.version).toBe(2);
  });
});
