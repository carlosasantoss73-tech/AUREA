import {
  ingestEcpDocument,
  type EcpDocumentIngestionInput,
  type EcpDocumentIngestionOptions,
  type EcpDocumentIngestionResult,
} from "./document-ingestion.js";

/**
 * The explicit role of an uploaded original. This is intake metadata only: it
 * does not assert that the document is authentic, complete, or applicable.
 */
export type EcpExpedientDocumentRole = "PROCEDURE" | "OFFER";

export interface EcpExpedientMetadata {
  procedureCode: string;
  contractingEntity: string;
  objectDescription: string;
  sourceUrl?: string;
}

export interface EcpExpedientDocumentInput extends EcpDocumentIngestionInput {
  role: EcpExpedientDocumentRole;
  /** Required for an offer; preserved as supplied, never inferred from a file. */
  offeror?: string;
}

export interface EcpExpedientIntakeInput {
  metadata: EcpExpedientMetadata;
  documents: EcpExpedientDocumentInput[];
}

export interface EcpExpedientIntakeOptions {
  documentIngestion?: EcpDocumentIngestionOptions;
}

export type EcpExpedientReadiness = "READY_FOR_EVIDENCE_REVIEW" | "BLOCKED";

export interface EcpIntakeDocumentRecord {
  role: EcpExpedientDocumentRole;
  offeror?: string;
  ingestion: EcpDocumentIngestionResult;
}

export interface EcpExpedientIntakeResult {
  projectId: "ecp";
  metadata: Required<EcpExpedientMetadata>;
  readiness: EcpExpedientReadiness;
  blockers: string[];
  warnings: string[];
  documents: EcpIntakeDocumentRecord[];
  offerors: string[];
  totalChunks: number;
}

function required(value: string | undefined, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value.trim();
}

function normalizeOfferor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return required(value, "ECP_INTAKE_OFFEROR_REQUIRED");
}

/**
 * Converts caller-provided originals into a traceable, non-persistent intake
 * manifest. It deliberately stops before legal classification or model calls.
 * A caller must separately satisfy the institutional-context gate before
 * sending this evidence to an execution provider.
 */
export async function intakeEcpExpedient(
  input: EcpExpedientIntakeInput,
  options: EcpExpedientIntakeOptions = {},
): Promise<EcpExpedientIntakeResult> {
  const procedureCode = required(input.metadata?.procedureCode, "ECP_INTAKE_PROCEDURE_CODE_REQUIRED");
  const contractingEntity = required(input.metadata?.contractingEntity, "ECP_INTAKE_CONTRACTING_ENTITY_REQUIRED");
  const objectDescription = required(input.metadata?.objectDescription, "ECP_INTAKE_OBJECT_DESCRIPTION_REQUIRED");
  const sourceUrl = required(input.metadata?.sourceUrl ?? "uploaded://local-expedient", "ECP_INTAKE_SOURCE_URL_REQUIRED");

  if (!Array.isArray(input.documents) || input.documents.length === 0) {
    throw new Error("ECP_INTAKE_DOCUMENTS_REQUIRED");
  }

  const documentIds = new Set<string>();
  const records: EcpIntakeDocumentRecord[] = [];
  for (const document of input.documents) {
    if (document.projectId.trim().toLowerCase() !== "ecp") {
      throw new Error("ECP_INTAKE_PROJECT_SCOPE_MISMATCH");
    }
    if (document.role !== "PROCEDURE" && document.role !== "OFFER") {
      throw new Error("ECP_INTAKE_DOCUMENT_ROLE_INVALID");
    }
    const documentId = required(document.documentId, "ECP_INTAKE_DOCUMENT_ID_REQUIRED");
    if (documentIds.has(documentId)) throw new Error(`ECP_INTAKE_DUPLICATE_DOCUMENT_ID:${documentId}`);
    documentIds.add(documentId);

    const offeror = normalizeOfferor(document.offeror);
    if (document.role === "OFFER" && !offeror) throw new Error("ECP_INTAKE_OFFEROR_REQUIRED");
    if (document.role === "PROCEDURE" && offeror) throw new Error("ECP_INTAKE_PROCEDURE_DOCUMENT_CANNOT_HAVE_OFFEROR");

    const ingestion = await ingestEcpDocument(document, options.documentIngestion);
    records.push({ role: document.role, ...(offeror ? { offeror } : {}), ingestion });
  }

  const procedureDocuments = records.filter((record) => record.role === "PROCEDURE");
  const offerDocuments = records.filter((record) => record.role === "OFFER");
  const offerors = [...new Set(offerDocuments.map((record) => record.offeror as string))].sort();
  const blockers: string[] = [];
  if (procedureDocuments.length === 0) blockers.push("ECP_INTAKE_PROCEDURE_DOCUMENT_REQUIRED");
  if (offerDocuments.length === 0) blockers.push("ECP_INTAKE_OFFER_DOCUMENT_REQUIRED");
  if (offerors.length === 0) blockers.push("ECP_INTAKE_OFFEROR_REQUIRED");

  const warnings = records.flatMap((record) =>
    record.ingestion.warnings.map((warning) => `${record.ingestion.documentId}:${warning}`),
  );

  return {
    projectId: "ecp",
    metadata: { procedureCode, contractingEntity, objectDescription, sourceUrl },
    readiness: blockers.length === 0 ? "READY_FOR_EVIDENCE_REVIEW" : "BLOCKED",
    blockers,
    warnings,
    documents: records,
    offerors,
    totalChunks: records.reduce((total, record) => total + record.ingestion.chunks.length, 0),
  };
}

/** Adds another batch of originals to an existing expediente without losing
 * the prior evidence manifest. This supports splitting a large expediente
 * across multiple HTTP requests while preserving one readiness decision. */
export async function appendEcpExpedientIntake(
  existing: EcpExpedientIntakeResult,
  documents: EcpExpedientDocumentInput[],
  options: EcpExpedientIntakeOptions = {},
): Promise<EcpExpedientIntakeResult> {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("ECP_INTAKE_DOCUMENTS_REQUIRED");
  }
  const knownIds = new Set(existing.documents.map((record) => record.ingestion.documentId));
  for (const document of documents) {
    const id = required(document.documentId, "ECP_INTAKE_DOCUMENT_ID_REQUIRED");
    if (knownIds.has(id)) throw new Error(`ECP_INTAKE_DUPLICATE_DOCUMENT_ID:${id}`);
    knownIds.add(id);
  }

  const incoming = await intakeEcpExpedient({
    metadata: existing.metadata,
    documents,
  }, options);
  const allDocuments = [...existing.documents, ...incoming.documents];
  const procedureCount = allDocuments.filter((record) => record.role === "PROCEDURE").length;
  const offerDocuments = allDocuments.filter((record) => record.role === "OFFER");
  const offerors = [...new Set(offerDocuments.map((record) => record.offeror).filter((value): value is string => Boolean(value)))].sort();
  const blockers: string[] = [];
  if (procedureCount === 0) blockers.push("ECP_INTAKE_PROCEDURE_DOCUMENT_REQUIRED");
  if (offerDocuments.length === 0) blockers.push("ECP_INTAKE_OFFER_DOCUMENT_REQUIRED");
  if (offerors.length === 0) blockers.push("ECP_INTAKE_OFFEROR_REQUIRED");

  return {
    projectId: "ecp",
    metadata: existing.metadata,
    readiness: blockers.length === 0 ? "READY_FOR_EVIDENCE_REVIEW" : "BLOCKED",
    blockers,
    warnings: allDocuments.flatMap((record) =>
      record.ingestion.warnings.map((warning) => `${record.ingestion.documentId}:${warning}`),
    ),
    documents: allDocuments,
    offerors,
    totalChunks: allDocuments.reduce((total, record) => total + record.ingestion.chunks.length, 0),
  };
}
