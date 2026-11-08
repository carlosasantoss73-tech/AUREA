import { extractPdfPages } from "./pdf-extraction-probe.js";

// Isolated validation entry point. This Worker is only bundled by CI with --dry-run;
// it is not the production SP EXÁMENES Worker and must never be deployed.
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length > 15_000_000) return Response.json({ error: "PDF exceeds 15 MB probe limit" }, { status: 413 });
    try {
      const pages = await extractPdfPages(bytes);
      return Response.json({
        pageCount: pages.length,
        pages: pages.map(page => ({ pageNumber: page.pageNumber, textLength: page.text.length, text: page.text }))
      });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "PDF extraction failed" }, { status: 422 });
    }
  }
};
