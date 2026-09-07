"""Minimal HTTP runtime for the AUREA publication agent."""
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from agent import run_agent


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send(200, {"status": "ok", "agent": "publication-agent"})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/run":
            self._send(404, {"error": "not_found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            instruction = str(data.get("instruction", "")).strip()
            if not instruction:
                self._send(400, {"error": "instruction_required"})
                return
            import asyncio
            output = asyncio.run(run_agent(instruction))
            self._send(200, {"output": output})
        except Exception as exc:  # pragma: no cover - runtime boundary
            self._send(500, {"error": type(exc).__name__})


def main() -> None:
    port = int(os.getenv("PORT", "8080"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"AUREA publication-agent listening on :{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
