import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { appendEcpExpedientIntake, intakeEcpExpedient, type EcpExpedientDocumentInput, type EcpExpedientMetadata } from "./expedient-intake.js";

function makePdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\\nstream\\n${stream}\\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\\n${objects[i]}\\nendobj\\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\\n0 ${objects.length + 1}\\n0000000000 65535 f \\n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \\n`;
  pdf += `trailer\\n<< /Size ${objects.length + 1} /Root 1 0 R >>\\nstartxref\\n${xrefOffset}\\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

const metadata: EcpExpedientMetadata = {
  procedureCode: "SERCOP-TEST-001",
  contractingEntity: "Entidad de prueba",
  objectDescription: "Servicio técnico para validar la carga por lotes",
};

function document(id: string, role: EcpExpedientDocumentInput["role"], text: string, offeror?: string): EcpExpedientDocumentInput {
  return {
    projectId: "ecp",
    documentId: id,
    title: id + ".pdf",
    sourceUri: "uploaded://test/" + id,
    mediaType: "application/pdf",
    bytes: makePdf(text),
    role,
    ...(offeror ? { offeror } : {}),
  };
}

describe("ECP expediente intake batches", () => {
  it("keeps a partial expediente blocked and becomes ready after a later offer batch", async () => {
    const first = await intakeEcpExpedient({
      metadata,
      documents: [document("PLIEGO-001", "PROCEDURE", "Condiciones del procedimiento")],
    });
    expect(first.readiness).toBe("BLOCKED");
    expect(first.blockers).toContain("ECP_INTAKE_OFFER_DOCUMENT_REQUIRED");

    const updated = await appendEcpExpedientIntake(first, [
      document("OFERTA-001", "OFFER", "Oferta económica del proveedor", "Proveedor A"),
    ]);
    expect(updated.readiness).toBe("READY_FOR_EVIDENCE_REVIEW");
    expect(updated.documents).toHaveLength(2);
    expect(updated.offerors).toEqual(["Proveedor A"]);
    expect(updated.totalChunks).toBeGreaterThan(first.totalChunks);
  });

  it("rejects a document ID already present in an earlier batch", async () => {
    const first = await intakeEcpExpedient({
      metadata,
      documents: [document("PLIEGO-001", "PROCEDURE", "Condiciones del procedimiento")],
    });
    await expect(appendEcpExpedientIntake(first, [
      document("PLIEGO-001", "OFFER", "Otra oferta", "Proveedor A"),
    ])).rejects.toThrow("ECP_INTAKE_DUPLICATE_DOCUMENT_ID");
  });
});
