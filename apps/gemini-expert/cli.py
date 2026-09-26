"""CLI entry point for the independent Gemini Expert pilot."""
from __future__ import annotations
import json
import sys
from expert import diagnose

def main() -> int:
    prompt = " ".join(sys.argv[1:]).strip()
    if not prompt:
        print(json.dumps({"error": "prompt_required"}, ensure_ascii=False))
        return 2
    try:
        print(json.dumps(diagnose(prompt), ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "blocked", "error": type(exc).__name__, "detail": str(exc)}, ensure_ascii=False))
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
