import { describe, expect, it } from "vitest";
import { GoogleDriveInstitutionalReader } from "./google-drive-institutional-reader";

const token = process.env.AUREA_LIVE_DRIVE_TOKEN;
const indexFileId = process.env.AUREA_KNOWLEDGE_OS_INDEX_ID;
const projectId = process.env.AUREA_LIVE_PROJECT_ID;

describe("LIVE Bibliotecario / Knowledge OS reader", () => {
  it.skipIf(!token || !indexFileId || !projectId)(
    "reads the real current V011 through the concrete institutional reader",
    async () => {

    const reader = new GoogleDriveInstitutionalReader({
      indexFileId,
      accessToken: token,
    });

    const current = await reader.readCurrentIndex("live-bib-08");
    expect(current.state).toBe("VIGENTE");
    expect(current.fileId).toBe(indexFileId);

    const records = await reader.readRecords(indexFileId, {
      projectId,
      query: "",
      traceId: "live-bib-08",
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.projectId === projectId)).toBe(true);
    expect(records.every((record) => record.state === "VIGENTE" || record.state === "APROBADO")).toBe(true);

    console.log(JSON.stringify({
      LIVE_READER: "PASS",
      CURRENT_INDEX_VERSION: current.version,
      INDEX_CHAIN_PREVIOUS_PRESENT: Boolean(current.previousIndexFileId),
      RECORDS_RETRIEVED: records.length,
      PROJECT_SCOPE: projectId,
      PROVENANCE_BOUNDARY: "INSTITUTIONAL_CONTEXT_PROVIDER_REQUIRED",
    }));
  });
});
