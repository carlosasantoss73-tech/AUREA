import { getDocument } from "pdfjs-serverless";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfPages(data: Uint8Array): Promise<ExtractedPdfPage[]> {
  if (data.length < 5 || String.fromCharCode(...data.subarray(0, 5)) !== "%PDF-") {
    throw new Error("El archivo no tiene una cabecera PDF válida.");
  }
  const document = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const pages: ExtractedPdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push({
      pageNumber,
      text: content.items
        .filter((item): item is typeof item & { str: string } => "str" in item)
        .map(item => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    });
  }
  return pages;
}
