import type { ConversationalSignal, ConversationAction, SalesMindResult } from "./sales-mind";
import type { ResilienceAction } from "./sales-resilience";

export interface ConversationFact {
  value: string;
  source: "CUSTOMER" | "BUSINESS" | "SYSTEM";
  confidence: number;
}

export interface ConversationMemory {
  conversationId: string;
  objective: string;
  confirmedFacts: ConversationFact[];
  needs: string[];
  preferences: string[];
  objections: string[];
  openQuestions: string[];
  signals: ConversationalSignal[];
  actionsTaken: ConversationAction[];
  resilienceActions: ResilienceAction[];
  lastDecision?: ConversationAction;
  lastResilienceAction?: ResilienceAction;
  unresolvedIssues: string[];
  turnCount: number;
  progressScore: number;
  updatedAt: string;
}

export interface ConversationTurn {
  message: string;
  confirmedFacts?: ConversationFact[];
  preferences?: string[];
  openQuestions?: string[];
  progressScore?: number;
}

export function createConversationMemory(conversationId: string, objective: string, now = new Date().toISOString()): ConversationMemory {
  return {
    conversationId,
    objective,
    confirmedFacts: [],
    needs: [],
    preferences: [],
    objections: [],
    openQuestions: [],
    signals: [],
    actionsTaken: [],
    resilienceActions: [],
    unresolvedIssues: [],
    turnCount: 0,
    progressScore: 0,
    updatedAt: now,
  };
}

const unique = <T>(items: T[]) => [...new Set(items)];

/** Merge only observable/declared information. Inference is never promoted to fact. */
export function updateConversationMemory(
  memory: ConversationMemory,
  turn: ConversationTurn,
  result: SalesMindResult,
  resilienceAction?: ResilienceAction,
  now = new Date().toISOString(),
): ConversationMemory {
  const confirmedFacts = [...memory.confirmedFacts];
  for (const fact of turn.confirmedFacts ?? []) {
    const existing = confirmedFacts.findIndex(item => item.value === fact.value);
    if (existing >= 0) confirmedFacts[existing] = fact;
    else confirmedFacts.push(fact);
  }

  const unresolvedIssues = unique([
    ...memory.unresolvedIssues,
    ...result.listening.uncertainties,
    ...(result.listening.inferredNeeds.filter(need => need.toLowerCase().includes("barrera"))),
  ]);

  return {
    ...memory,
    confirmedFacts,
    needs: unique([...memory.needs, ...result.listening.inferredNeeds]),
    preferences: unique([...memory.preferences, ...(turn.preferences ?? [])]),
    objections: result.listening.signals.includes("OBJECTION")
      ? unique([...memory.objections, turn.message])
      : memory.objections,
    openQuestions: unique([...memory.openQuestions, ...(turn.openQuestions ?? []), ...(result.decision.nextQuestion ? [result.decision.nextQuestion] : [])]),
    signals: unique([...memory.signals, ...result.listening.signals]),
    actionsTaken: unique([...memory.actionsTaken, result.decision.action]),
    resilienceActions: resilienceAction
      ? unique([...memory.resilienceActions, resilienceAction])
      : memory.resilienceActions,
    lastDecision: result.decision.action,
    lastResilienceAction: resilienceAction ?? memory.lastResilienceAction,
    unresolvedIssues,
    turnCount: memory.turnCount + 1,
    progressScore: turn.progressScore ?? memory.progressScore,
    updatedAt: now,
  };
}

export function recoverConversationContext(memory: ConversationMemory) {
  return {
    conversationId: memory.conversationId,
    objective: memory.objective,
    confirmedFacts: memory.confirmedFacts,
    needs: memory.needs,
    preferences: memory.preferences,
    objections: memory.objections,
    openQuestions: memory.openQuestions,
    unresolvedIssues: memory.unresolvedIssues,
    lastDecision: memory.lastDecision,
    lastResilienceAction: memory.lastResilienceAction,
    turnCount: memory.turnCount,
    progressScore: memory.progressScore,
  };
}
