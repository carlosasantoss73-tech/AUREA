"""Real Gemini adapter using Google's current Interactions API."""
from __future__ import annotations
from dataclasses import dataclass
from google import genai
from config import Settings

@dataclass(frozen=True)
class GeminiResult:
    interaction_id: str
    output_text: str
    model: str

class GeminiAdapter:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = genai.Client(api_key=settings.require_api_key())

    def execute(self, *, prompt: str, system_instruction: str) -> GeminiResult:
        interaction = self.client.interactions.create(
            model=self.settings.model,
            input=prompt,
            system_instruction=system_instruction,
        )
        output = getattr(interaction, "output_text", None)
        interaction_id = getattr(interaction, "id", None)
        if not isinstance(output, str) or not output.strip():
            raise RuntimeError("gemini_invalid_empty_output")
        if not isinstance(interaction_id, str) or not interaction_id.strip():
            raise RuntimeError("gemini_missing_interaction_id")
        return GeminiResult(interaction_id=interaction_id, output_text=output, model=self.settings.model)
