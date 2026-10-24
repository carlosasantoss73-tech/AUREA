export interface PdfDocumentReference {
  title: string;
  url: string;
}

export interface PdfRetrievalResult<T extends PdfDocumentReference = PdfDocumentReference> {
  doc: T;
  retrieved: boolean;
  status: string;
}

export function summarizePdfRetrieval<T extends PdfDocumentReference>(
  results: ReadonlyArray<PdfRetrievalResult<T>>
) {
  const retrievedDocs = results.filter(result => result.retrieved).map(result => result.doc);
  const unavailablePdfs = results
    .filter(result => !result.retrieved)
    .map(result => ({ title: result.doc.title, status: result.status }));
  const pdfStatus = unavailablePdfs.length === 0
    ? "complete"
    : retrievedDocs.length > 0 ? "partial" : "unavailable";
  return { retrievedDocs, unavailablePdfs, pdfStatus };
}
