import { describe, expect, it } from "vitest";
import { createGoogleDriveInstitutionalContextProvider } from "./google-drive-institutional-context-provider";
import type { InstitutionalAuthorityReader } from "./institutional-authority";

function readerFixture(): InstitutionalAuthorityReader {
  return {
    async readCurrentIndex() {
      return { fileId: "index-v011", version: 11, state: "VIGENTE" };
    },
    async readIndex() {
      return { fileId: "index-v011", version: 11, state: "VIGENTE" };
    },
    async readRecords() {
      return [{
        id: "record-1",
        projectId: "aurea",
        title: "AUREA institucional",
        text: "Registro institucional real boundary fixture.",
        sourceId: "knowledge-os:record-1",
        version: 1,
        state: "VIGENTE",
      }];
    },
  };
}

describe("Google Drive institutional context provider", () => {
  it("returns institutional provenance through the existing provider boundary", async () => {
    const provider = createGoogleDriveInstitutionalContextProvider(readerFixture());
    const result = await provider.retrieve({
      projectId: "aurea",
      query: "institucional",
      traceId: "trace-drive-1",
    });

    expect(result.facts).toEqual(["Registro institucional real boundary fixture."]);
    expect(result.citations).toMatchObject([{
      sourceId: "knowledge-os:record-1",
      documentId: "record-1",
      version: 1,
      provenance: "INSTITUTIONAL",
    }]);
  });
});
