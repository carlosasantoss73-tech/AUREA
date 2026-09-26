"""Minimal independent HTTP runtime for the Gemini Expert pilot."""
from __future__ import annotations
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from expert import diagnose

class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send(200, {"status": "ok", "agent_id": "AUREA-GEMINI-EXPERT-V1"})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path != "/diagnose":
            self._send(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
            prompt = str(data.get("prompt", "")).strip()
            if not prompt:
                self._send(400, {"error": "prompt_required"})
                return
            self._send(200, diagnose(prompt))
        except Exception as exc:
            self._send(503, {"status": "blocked", "error": type(exc).__name__})

def main() -> None:
    port = int(os.getenv("PORT", "8091"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()

if __name__ == "__main__":
    main()
