import { getDocument, version as pdfjsVersion } from "pdfjs-dist/legacy/build/pdf.mjs";

function makeProbePdf(): Uint8Array {
  const stream = "BT /F1 12 Tf 72 720 Td (SP EXAMENES PDFJS WORKER PROBE) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\\nstream\\n${stream}\\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\\n${objects[i]}\\nendobj\\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\\n0 ${objects.length + 1}\\n0000000000 65535 f \\n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \\n`;
  }
  pdf += `trailer\\n<< /Size ${objects.length + 1} /Root 1 0 R >>\\nstartxref\\n${xrefOffset}\\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", probe: "pdfjs-worker-compatibility" });
    }
    if (url.pathname !== "/probe" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    const started = Date.now();
    try {
      const loadingTask = getDocument({
        data: makeProbePdf(),
        disableWorker: true,
        isEvalSupported: false,
        useSystemFonts: false,
        verbosity: 0,
      });
      const document = await loadingTask.promise;
      const page = await document.getPage(1);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str)
        .join(" ");
      await document.destroy();
      return Response.json({
        status: text.includes("SP EXAMENES PDFJS WORKER PROBE") ? "pass" : "fail",
        pdfjsVersion,
        pages: document.numPages,
        extractedText: text,
        elapsedMs: Date.now() - started,
      }, { status: text.includes("SP EXAMENES PDFJS WORKER PROBE") ? 200 : 500 });
    } catch (error) {
      return Response.json({
        status: "error",
        pdfjsVersion,
        error: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - started,
      }, { status: 500 });
    }
  },
};
