import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inventory = JSON.parse(
  readFileSync(new URL("./test-data/historical-exam-inventory.json", import.meta.url), "utf8"),
);

describe("SP EXÁMENES historical exam inventory integrity", () => {
  it("preserves all 25 expected identifiers without inventing question text", () => {
    expect(inventory.records).toHaveLength(25);
    expect(inventory.records.map((record: { id: string }) => record.id)).toEqual(
      Array.from({ length: 25 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`),
    );
    expect(inventory.records.every((record: { question_text_available: boolean; options_available: boolean }) =>
      record.question_text_available === false && record.options_available === false)).toBe(true);
  });

  it("keeps P05 ambiguous and P16 incomplete", () => {
    const p05 = inventory.records.find((record: { id: string }) => record.id === "P05");
    const p16 = inventory.records.find((record: { id: string }) => record.id === "P16");
    expect(p05.verification_status).toBe("ambiguous_historical_summary");
    expect(p05.historical_answer).toBeNull();
    expect(p05.historical_candidates).toEqual(["A", "C"]);
    expect(p16.verification_status).toBe("incomplete_low_confidence");
    expect(p16.historical_answer).toBe("B");
    expect(p16.legal_reference_summary).toBeNull();
  });

  it("marks P17–P25 as missing rather than fabricating records", () => {
    const missing = inventory.records.filter((record: { verification_status: string }) =>
      record.verification_status === "missing_record");
    expect(missing.map((record: { id: string }) => record.id)).toEqual(
      Array.from({ length: 9 }, (_, index) => `P${String(index + 17).padStart(2, "0")}`),
    );
    expect(missing.every((record: { historical_answer: unknown; topic: unknown }) =>
      record.historical_answer === null && record.topic === null)).toBe(true);
  });

  it("does not represent historical summaries as verified legal answers", () => {
    expect(inventory.provenance.original_exam_file_available).toBe(false);
    expect(inventory.provenance.legal_answers_independently_verified).toBe(false);
    expect(inventory.records.filter((record: { verification_status: string }) =>
      record.verification_status === "unverified_summary").length).toBe(14);
  });

  it("retains the reported duplicate/equivalence notes", () => {
    expect(inventory.duplicate_relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({ record: "P19", relationship: "equivalent_to", related_record: "P07" }),
      expect.objectContaining({ record: "P22", relationship: "repeated_question", related_record: "P09" }),
    ]));
  });
});
