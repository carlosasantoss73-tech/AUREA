import { describe, expect, it } from "vitest";
import { summarizePdfRetrieval } from "./pdf-retrieval.js";

const law = { title: "LOSNCP", url: "https://example.test/law.pdf" };
const regulation = { title: "Reglamento", url: "https://example.test/regulation.pdf" };

describe("summarizePdfRetrieval", () => {
  it("marks complete only when every selected PDF was retrieved", () => {
    const result = summarizePdfRetrieval([
      { doc: law, retrieved: true, status: "retrieved" },
      { doc: regulation, retrieved: true, status: "retrieved" },
    ]);
    expect(result.pdfStatus).toBe("complete");
    expect(result.retrievedDocs).toEqual([law, regulation]);
    expect(result.unavailablePdfs).toEqual([]);
  });

  it("does not include failed downloads in retrieved sources", () => {
    const result = summarizePdfRetrieval([
      { doc: law, retrieved: true, status: "retrieved" },
      { doc: regulation, retrieved: false, status: "fetch_error" },
    ]);
    expect(result.pdfStatus).toBe("partial");
    expect(result.retrievedDocs).toEqual([law]);
    expect(result.retrievedDocs).not.toContain(regulation);
    expect(result.unavailablePdfs).toEqual([{ title: "Reglamento", status: "fetch_error" }]);
  });

  it("reports unavailable when no PDF was retrieved", () => {
    const result = summarizePdfRetrieval([
      { doc: law, retrieved: false, status: "http_error" },
      { doc: regulation, retrieved: false, status: "invalid_pdf" },
    ]);
    expect(result.pdfStatus).toBe("unavailable");
    expect(result.retrievedDocs).toEqual([]);
    expect(result.unavailablePdfs).toHaveLength(2);
  });

  it("treats an empty selection as complete without inventing unavailable PDFs", () => {
    const result = summarizePdfRetrieval([]);
    expect(result.pdfStatus).toBe("complete");
    expect(result.retrievedDocs).toEqual([]);
    expect(result.unavailablePdfs).toEqual([]);
  });
});
