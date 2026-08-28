import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonContextStore } from "./persistent-context-store";

describe("JsonContextStore", () => {
  it("persists knowledge across store instances", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-memory-"));
    const file = join(dir, "knowledge.json");
    const first = new JsonContextStore(file);
    await first.upsert({ id: "r1", projectId: "aurea", title: "video", text: "Krea candidate", sourceId: "source-1", version: 1, tags: ["video"] });
    const second = new JsonContextStore(file);
    await second.initialize();
    expect(second.search("aurea", "video")[0].text).toBe("Krea candidate");
    await rm(dir, { recursive: true, force: true });
  });

  it("rejects non-increasing versions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-memory-"));
    const file = join(dir, "knowledge.json");
    const store = new JsonContextStore(file);
    await store.upsert({ id: "r1", projectId: "aurea", title: "x", text: "v1", sourceId: "s", version: 1 });
    await expect(store.upsert({ id: "r1", projectId: "aurea", title: "x", text: "bad", sourceId: "s", version: 1 })).rejects.toThrow("CONTEXT_VERSION_MUST_INCREASE");
    await rm(dir, { recursive: true, force: true });
  });
});
