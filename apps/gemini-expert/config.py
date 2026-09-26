"""Configuration and fail-closed runtime settings for the Gemini Expert pilot."""
from __future__ import annotations
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    model: str = "gemini-3.8-flash"
    api_key_env: str = "GEMINI_API_KEY"
    knowledge_path: str = "docs/AUREA-GEMINI-EXPERT-KNOWLEDGE-PACK-V2.md"
    audit_path: str = "runtime/gemini-expert-audit.jsonl"
    max_output_chars: int = 12000

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            model=os.getenv("AUREA_GEMINI_MODEL", cls.model),
            api_key_env=os.getenv("AUREA_GEMINI_API_KEY_ENV", cls.api_key_env),
            knowledge_path=os.getenv("AUREA_GEMINI_KNOWLEDGE_PATH", cls.knowledge_path),
            audit_path=os.getenv("AUREA_GEMINI_AUDIT_PATH", cls.audit_path),
        )

    def require_api_key(self) -> str:
        value = os.getenv(self.api_key_env, "").strip()
        if not value:
            raise RuntimeError(f"missing_secret:{self.api_key_env}")
        return value
