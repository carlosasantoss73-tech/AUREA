# B15 — Memory Ingestion Layer

## Purpose
Close the remaining memory gap by providing a governed path from real evidence into AUREA's durable Context Store.

## Contract
`ingestEvidence()` accepts only caller-supplied evidence: project, source, title and text. It does not generate facts or infer historical events.

The ingestion layer:
- creates a stable record id;
- is idempotent for unchanged evidence;
- increments versions when evidence changes;
- preserves sourceId and projectId;
- stores tags for retrieval;
- writes through the existing durable ContextStore adapter.

## Architecture
Source -> Ingestor -> ContextStore -> Context Retrieval Gate -> Runtime.

## Critical boundary
B15 is an ingestion CONTRACT, not a magical connector to ChatGPT history. A real conversation/document connector must call `ingestEvidence()` with authentic source content. Until such a connector exists, AUREA must not claim automatic ingestion of every ChatGPT conversation.

## Acceptance test
1. Ingest a real source record.
2. Restart/recreate the persistent store.
3. Ask a continuity-sensitive question without saying “recover memory”.
4. Verify the retrieved Context Pack contains the sourceId, document id, version and evidence.
5. Change the source and verify version increments.
6. Supply no evidence and verify AUREA returns/blocks as NO EVIDENCE rather than inventing.
