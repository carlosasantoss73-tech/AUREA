export type ConversationalSignal = "NEED" | "INTENT" | "OBJECTION" | "UNCERTAINTY" | "PREFERENCE" | "EMOTION" | "QUESTION" | "BUYING_SIGNAL" | "HANDOFF_SIGNAL";
export type ConversationAction = "ASK" | "CLARIFY" | "EDUCATE" | "RECOMMEND" | "HANDLE_OBJECTION" | "FOLLOW_UP" | "HANDOFF" | "CLOSE";

export interface ConversationInput { message: string; history?: string[]; knownFacts?: string[]; objective: string; }
export interface ListeningAssessment { explicitMessage: string; inferredNeeds: string[]; signals: ConversationalSignal[]; uncertainties: string[]; contradictions: string[]; confidence: number; }
export interface SalesDecision { action: ConversationAction; rationale: string; nextQuestion?: string; responseGuidance: string; escalate: boolean; }
export interface SalesMindResult { listening: ListeningAssessment; decision: SalesDecision; }

/** Deterministic listening/decision layer; facts and inference remain separate. */
export function assessListening(input: ConversationInput): ListeningAssessment {
  const message = input.message.trim();
  const lower = message.toLowerCase();
  const signals: ConversationalSignal[] = [];
  const inferredNeeds: string[] = [];
  const uncertainties: string[] = [];
  const contradictions: string[] = [];
  if (!message) uncertainties.push("No message was provided.");
  if (/\b(cu[aá]nto|precio|valor|costo|cuesta)\b/.test(lower)) signals.push("QUESTION");
  if (/\b(no|pero|sin embargo|dif[ií]cil|caro|duda|dudas|problema)\b/.test(lower)) signals.push("OBJECTION");
  if (/\b(quiero|busco|necesito|me interesa|quisiera)\b/.test(lower)) signals.push("NEED");
  if (/\b(comprar|reservar|contratar|agendar|avanzar|listo)\b/.test(lower)) signals.push("BUYING_SIGNAL");
  if (/\b(no s[eé]|no estoy seguro|tal vez|quiz[aá]s)\b/.test(lower)) signals.push("UNCERTAINTY");
  if (/\b(hablar con|asesor|persona|humano)\b/.test(lower)) signals.push("HANDOFF_SIGNAL");
  if (signals.includes("NEED")) inferredNeeds.push("Necesidad explícita; falta determinar prioridad y contexto.");
  if (signals.includes("OBJECTION")) inferredNeeds.push("Posible barrera que debe comprenderse antes de intentar cerrar.");
  if (signals.includes("UNCERTAINTY")) uncertainties.push("La intención o preferencia todavía no está suficientemente definida.");
  if (signals.includes("BUYING_SIGNAL")) inferredNeeds.push("Señal compatible con intención de avanzar; debe confirmarse sin asumir compra.");
  const uniqueSignals = [...new Set(signals)];
  const confidence = message ? Math.min(0.95, 0.45 + uniqueSignals.length * 0.08) : 0;
  return { explicitMessage: message, inferredNeeds, signals: uniqueSignals, uncertainties, contradictions, confidence };
}

export function decideSalesAction(listening: ListeningAssessment, objective: string): SalesDecision {
  if (listening.signals.includes("HANDOFF_SIGNAL")) return { action: "HANDOFF", rationale: "La persona solicita interacción humana o un asesor.", responseGuidance: "Facilitar el traspaso y conservar el contexto relevante.", escalate: true };
  if (listening.signals.includes("OBJECTION")) return { action: "HANDLE_OBJECTION", rationale: "Primero debe comprenderse y atenderse la barrera expresada.", nextQuestion: "¿Qué es lo que más te preocupa o qué necesitarías aclarar para tomar una decisión?", responseGuidance: "Validar la preocupación, aclarar con hechos autorizados y comprobar comprensión antes de avanzar.", escalate: false };
  if (listening.uncertainties.length > 0 || listening.confidence < 0.6) return { action: "CLARIFY", rationale: "No hay información suficiente para determinar con seguridad la necesidad principal.", nextQuestion: "Para orientarte bien, ¿qué es lo más importante para ti en este momento?", responseGuidance: "Hacer una pregunta breve y abierta; no inventar necesidades ni presuponer intención.", escalate: false };
  if (listening.signals.includes("QUESTION")) return { action: "EDUCATE", rationale: `Responder la pregunta aporta información para el objetivo comercial: ${objective}.`, responseGuidance: "Responder con información verificable y comprobar qué criterio importa más.", escalate: false };
  if (listening.signals.includes("BUYING_SIGNAL")) return { action: "CLOSE", rationale: "Existe una señal de avance que debe convertirse en un siguiente paso concreto y voluntario.", responseGuidance: "Proponer un siguiente paso claro, confirmar interés y evitar presión indebida.", escalate: false };
  return { action: "ASK", rationale: "Falta contexto suficiente para recomendar responsablemente.", nextQuestion: "¿Qué resultado quieres conseguir y qué sería una buena solución para ti?", responseGuidance: "Explorar necesidad, contexto y criterio de decisión antes de recomendar.", escalate: false };
}

export function runSalesMind(input: ConversationInput): SalesMindResult {
  const listening = assessListening(input);
  return { listening, decision: decideSalesAction(listening, input.objective) };
}
