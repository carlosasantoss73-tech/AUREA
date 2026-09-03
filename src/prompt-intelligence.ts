export type PromptModality = "RESEARCH" | "IMAGE" | "VIDEO" | "AUDIO" | "CODE" | "GENERAL";
export type PromptLanguageStrategy = "SOURCE" | "ENGLISH" | "PROVIDER_NATIVE" | "BILINGUAL";

export interface PromptRequest {
  modality: PromptModality;
  userRequest: string;
  objective?: string;
  context?: string;
  deliverable?: string;
  constraints?: string[];
  qualityCriteria?: string[];
  sourceRequirements?: string[];
  audience?: string;
  targetLanguage?: string;
  targetProvider?: string;
}

export interface CompiledPrompt {
  languageStrategy: PromptLanguageStrategy;
  targetLanguage: string;
  sections: Record<string, string>;
  prompt: string;
  qualityGates: string[];
}

const commonGates = [
  "Separate facts, inferences and assumptions.",
  "Do not invent missing information; state uncertainty explicitly.",
  "Follow the requested output format exactly.",
];

function inferStrategy(request: PromptRequest): PromptLanguageStrategy {
  if (request.targetProvider && ["qwen", "kimi", "deepseek"].includes(request.targetProvider.toLowerCase())) {
    return request.targetLanguage && /^es/i.test(request.targetLanguage) ? "SOURCE" : "PROVIDER_NATIVE";
  }
  if (request.modality === "RESEARCH" && request.targetProvider && /gemini|claude|gpt/i.test(request.targetProvider)) {
    return "ENGLISH";
  }
  if (request.modality === "IMAGE" || request.modality === "VIDEO" || request.modality === "AUDIO") {
    return request.targetLanguage && !/^es/i.test(request.targetLanguage) ? "PROVIDER_NATIVE" : "ENGLISH";
  }
  return "SOURCE";
}

function modalitySections(request: PromptRequest): Record<string, string> {
  const base = {
    ROLE: "Act as a senior specialist appropriate to the requested task.",
    OBJECTIVE: request.objective ?? request.userRequest,
    CONTEXT: request.context ?? "Use only the context supplied by the orchestrator and approved sources.",
    DELIVERABLE: request.deliverable ?? "Return a decision-ready result with concise evidence.",
    CONSTRAINTS: (request.constraints ?? []).join("; ") || "Respect all safety, factual, brand and project constraints.",
    QUALITY_CRITERIA: (request.qualityCriteria ?? []).join("; ") || "Accuracy, relevance, completeness, traceability and clarity.",
  };

  if (request.modality === "RESEARCH") return {
    ...base,
    RESEARCH_METHOD: "State the central question, decompose it into subquestions, prioritize authoritative/current sources, cross-check material claims, and label uncertainty.",
    SOURCE_REQUIREMENTS: (request.sourceRequirements ?? []).join("; ") || "Prefer primary and current sources; cite evidence for material claims.",
    OUTPUT_SCHEMA: "Executive finding; evidence; contradictions; implications; recommendation; limitations.",
  };

  if (request.modality === "IMAGE") return {
    ...base,
    VISUAL_SPEC: "Specify subject, scene, composition, camera/lens, lighting, materials, realism, mood, brand elements and text treatment.",
    NEGATIVE_CONSTRAINTS: "Avoid fabricated infrastructure, distorted anatomy, unreadable text, false locations or unsupported factual elements.",
    OUTPUT_SCHEMA: "Image specification ready for generation, with aspect ratio and production constraints.",
  };

  if (request.modality === "VIDEO") return {
    ...base,
    VISUAL_SPEC: "Define duration, aspect ratio, sequence of scenes, shots, camera movement, action, location, lighting, transitions, pacing and brand identity.",
    AUDIO_SPEC: "Define narration, voice profile, language/accent, emotional direction, music, ambience, sound effects, pauses and mix priorities.",
    NEGATIVE_CONSTRAINTS: "Do not invent factual project attributes, locations, infrastructure, prices or guarantees not present in approved sources.",
    OUTPUT_SCHEMA: "Shot-by-shot storyboard plus narration, on-screen text, audio direction, CTA and generation prompt.",
  };

  if (request.modality === "AUDIO") return {
    ...base,
    VOICE_SPEC: "Define language, accent, voice profile, emotion, energy, pace, pauses, emphasis, pronunciation and conversational intent.",
    OUTPUT_SCHEMA: "Production-ready script and voice-direction specification.",
  };

  return { ...base, OUTPUT_SCHEMA: request.deliverable ?? "Structured, decision-ready result." };
}

export function compilePrompt(request: PromptRequest): CompiledPrompt {
  const strategy = inferStrategy(request);
  const targetLanguage = strategy === "ENGLISH" ? "English" : request.targetLanguage ?? "Spanish";
  const sections = modalitySections(request);
  const qualityGates = [...commonGates, ...(request.modality === "RESEARCH" ? ["Prefer primary/current evidence and cross-check material claims."] : [])];
  const ordered = Object.entries(sections).map(([key, value]) => `${key}: ${value}`).join("\n\n");
  const languageInstruction = strategy === "ENGLISH"
    ? "Respond in English internally. Preserve source meaning and return the final user-facing answer in the orchestrator's requested language."
    : strategy === "BILINGUAL"
      ? "Reason using the selected bilingual representation; preserve technical terms where translation would reduce precision."
      : "Use the requested language naturally; do not translate if doing so would reduce domain fidelity.";

  return {
    languageStrategy: strategy,
    targetLanguage,
    sections,
    prompt: `${ordered}\n\nLANGUAGE: ${languageInstruction}\n\nQUALITY_GATES:\n- ${qualityGates.join("\n- ")}`,
    qualityGates,
  };
}
