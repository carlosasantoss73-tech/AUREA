/**
 * Durable continuity slice for the AUREA Technology Radar.
 *
 * These are historical candidates, not integrated capabilities. The registry
 * intentionally preserves the distinction documented in B11 so a future agent
 * does not confuse discovery with integration.
 */
export type RadarState = "DISCOVERED" | "SCREENED" | "VERIFIED" | "TESTING" | "APPROVED" | "INTEGRATED" | "RETIRED";

export interface TechnologyCandidate {
  name: string;
  function: string;
  state: RadarState;
  evidence: string;
  notes: string;
}

export const TECHNOLOGY_RADAR_B11: TechnologyCandidate[] = [
  {
    name: "MoneyPrinterTurbo",
    function: "generación de video automatizada, especialmente multimedia/marketing",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Candidato; verificar runtime, licencia y calidad antes de integrar.",
  },
  {
    name: "OmniVoice / OmniVoice Studio",
    function: "TTS/STT y voz",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Candidato; verificar licencia, API, seguridad y runtime antes de integrar.",
  },
  {
    name: "Hermes Agent",
    function: "agentes con herramientas, skills y aprendizaje",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Candidato/patrón; no declarar integrado sin evidencia.",
  },
  {
    name: "Agent-Reach",
    function: "ampliar acceso de agentes a fuentes web/social/GitHub",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Evaluar seguridad, términos de uso y estabilidad.",
  },
  {
    name: "Creati.ai",
    function: "descubrimiento/directorio de herramientas",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Es fuente de descubrimiento/directorio; NO es componente del Core.",
  },
  {
    name: "Created.ai / CreatAI.io",
    function: "automatización de contenido/marketing",
    state: "DISCOVERED",
    evidence: "AUREA Documento Maestro/Prompt B11, bloque Technology Radar",
    notes: "Candidatos para estudiar y comparar antes de adoptar.",
  },
];
