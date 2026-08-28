import { createStoreContextProvider, InMemoryContextStore, ContextRecord } from "./durable-context-store";

/**
 * Seeded continuity source created from the consolidated AUREA handoff.
 * This is intentionally explicit evidence, not model memory.
 */
export const AUREA_CONTINUITY_RECORDS: readonly ContextRecord[] = [
  {
    id: "continuity-b11-video-tools",
    projectId: "aurea",
    title: "B11 — herramientas de video y descubrimiento — esta semana",
    text: "En el Technology Radar B11 se registraron MoneyPrinterTurbo como candidato de generación de video automatizada; Creati.ai como fuente/directorio de descubrimiento; y Created.ai / CreatAI.io como candidato de automatización de contenido/marketing. Todos quedaron en estado DISCOVERED, no INTEGRATED.",
    sourceId: "AUREA_B11_TECHNOLOGY_RADAR",
    version: 1,
    tags: ["B11", "video", "herramientas", "esta semana", "Technology Radar", "Creati.ai", "MoneyPrinterTurbo"],
  },
  {
    id: "continuity-b11-voice-tools",
    projectId: "aurea",
    title: "B11 — herramientas de voz — esta semana",
    text: "En el Technology Radar B11 se registró OmniVoice / OmniVoice Studio como candidato de TTS/STT y voz. Quedó en estado DISCOVERED y no INTEGRATED.",
    sourceId: "AUREA_B11_TECHNOLOGY_RADAR",
    version: 1,
    tags: ["B11", "voz", "TTS", "STT", "esta semana", "OmniVoice"],
  },
  {
    id: "continuity-b14-problem",
    projectId: "aurea",
    title: "B14 — corrección del fallo de continuidad",
    text: "B14 existe para impedir que una solicitud histórica se responda usando memoria local como fuente suficiente. Las señales de continuidad activan Context Retrieval Gate; la recuperación se gobierna como READ; con evidencia se construye Context Pack; sin evidencia se bloquea con CONTEXT_REQUIRED_BUT_NOT_FOUND.",
    sourceId: "AUREA_B14_CONTEXT_RETRIEVAL",
    version: 1,
    tags: ["B14", "continuidad", "memoria", "Context Retrieval", "histórico", "antes", "anteriormente"],
  },
];

export const defaultContextProvider = createStoreContextProvider(new InMemoryContextStore(AUREA_CONTINUITY_RECORDS));
