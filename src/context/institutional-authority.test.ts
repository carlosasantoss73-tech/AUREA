import { describe, expect, it } from "vitest";
import { resolveInstitutionalAuthority } from "./institutional-authority";

describe("institutional authority resolution", () => {
  it("resolves the current index chain and scopes records by project", async () => {
    const reader = {
      async readCurrentIndex() {
        return { fileId: "v011", version: 11, state: "VIGENTE" as const, previousIndexFileId: "v010" };
      },
      async readIndex(fileId: string) {
        return { fileId, version: 10, state: "REEMPLAZADO" as const };
      },
      async readRecords() {
        return [
          { id: "tcl-1", projectId: "tcl", title: "TCL", text: "institutional", sourceId: "KS", version: 11, state: "VIGENTE" as const },
          { id: "other-1", projectId: "other", title: "Other", text: "must not leak", sourceId: "KS", version: 11, state: "VIGENTE" as const },
          { id: "draft-1", projectId: "tcl", title: "Draft", text: "must not promote", sourceId: "QA", version: 11, state: "INFERENCIA" as const },
        ];
      },
    };

    const result = await resolveInstitutionalAuthority(reader, {
      projectId: "tcl",
      query: "continuar",
      traceId: "trace-1",
    });

    expect(result.traversedIndexFileIds).toEqual(["v011", "v010"]);
    expect(result.records.map((r) => r.id)).toEqual(["tcl-1"]);
  });

  it("fails closed if the current index is not authoritative", async () => {
    const reader = {
      async readCurrentIndex() {
        return { fileId: "v010", version: 10, state: "REEMPLAZADO" as const };
      },
      async readIndex() {
        throw new Error("must not traverse");
      },
      async readRecords() {
        throw new Error("must not read records");
      },
    };

    await expect(
      resolveInstitutionalAuthority(reader, {
        projectId: "tcl",
        query: "continuar",
        traceId: "trace-2",
      }),
    ).rejects.toThrow("INSTITUTIONAL_CURRENT_INDEX_NOT_VIGENTE");
  });
});
