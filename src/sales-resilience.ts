import type { ConversationAction, SalesMindResult } from "./sales-mind";

export type ResilienceAction = "CONTINUE" | "CLARIFY_AGAIN" | "CHANGE_APPROACH" | "PAUSE_AND_FOLLOW_UP" | "HANDOFF";

export interface SalesConversationState {
  turnsSinceProgress: number;
  objectionAttempts: number;
  clarificationAttempts: number;
  lastAction?: ConversationAction;
  unresolvedIssue?: string;
}

export interface ResilienceDecision {
  action: ResilienceAction;
  rationale: string;
  nextAction: ConversationAction;
  escalate: boolean;
}

/**
 * Resilient conversation policy: recover from friction without becoming repetitive
 * or coercive. It uses observable conversation state only; it does not claim to
 * infer hidden mental states.
 */
export function decideResilience(
  result: SalesMindResult,
  state: SalesConversationState,
): ResilienceDecision {
  const { listening, decision } = result;

  if (decision.action === "HANDOFF" || listening.signals.includes("HANDOFF_SIGNAL")) {
    return {
      action: "HANDOFF",
      rationale: "La persona pidió atención humana; preservar el contexto es preferible a insistir.",
      nextAction: "HANDOFF",
      escalate: true,
    };
  }

  if (state.objectionAttempts >= 2 && listening.signals.includes("OBJECTION")) {
    return {
      action: "HANDOFF",
      rationale: "La barrera persiste después de intentos limitados; evitar presión y escalar.",
      nextAction: "HANDOFF",
      escalate: true,
    };
  }

  if (state.clarificationAttempts >= 2 && (decision.action === "CLARIFY" || listening.uncertainties.length > 0)) {
    return {
      action: "CHANGE_APPROACH",
      rationale: "La aclaración repetida no resolvió la incertidumbre; cambiar la forma de explorar el problema.",
      nextAction: "EDUCATE",
      escalate: false,
    };
  }

  if (state.turnsSinceProgress >= 3 && decision.action !== "CLOSE") {
    return {
      action: "PAUSE_AND_FOLLOW_UP",
      rationale: "No se observa progreso suficiente; una pausa evita conversaciones circulares.",
      nextAction: "FOLLOW_UP",
      escalate: false,
    };
  }

  if (decision.action === "HANDLE_OBJECTION" && state.objectionAttempts > 0) {
    return {
      action: "CHANGE_APPROACH",
      rationale: "La objeción reaparece; explorar otro ángulo basado en la información observable.",
      nextAction: "ASK",
      escalate: false,
    };
  }

  if (decision.action === "CLARIFY") {
    return {
      action: "CLARIFY_AGAIN",
      rationale: "Todavía falta información para recomendar responsablemente.",
      nextAction: "CLARIFY",
      escalate: false,
    };
  }

  return {
    action: "CONTINUE",
    rationale: "La conversación puede avanzar sin señales de bloqueo o repetición excesiva.",
    nextAction: decision.action,
    escalate: decision.escalate,
  };
}
