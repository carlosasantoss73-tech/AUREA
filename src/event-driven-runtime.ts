export type RuntimeEventType =
  | "OBJECTIVE_RECEIVED"
  | "PLAN_READY"
  | "EXECUTION_AUTHORIZED"
  | "EXECUTION_FINISHED"
  | "QA_PASS"
  | "QA_FAIL"
  | "LEARNING_RECORDED"
  | "BLOCKED"
  | "RESUME_REQUESTED";

export interface RuntimeEvent<TPayload = unknown> {
  eventId: string;
  eventType: RuntimeEventType;
  traceId: string;
  projectId: string;
  workCellId?: string;
  occurredAt: string;
  payload: TPayload;
}

export interface EventStore {
  append(event: RuntimeEvent): void;
  has(eventId: string): boolean;
  list(traceId?: string): RuntimeEvent[];
}

export class InMemoryEventStore implements EventStore {
  private readonly events = new Map<string, RuntimeEvent>();

  append(event: RuntimeEvent): void {
    if (this.events.has(event.eventId)) {
      throw new Error(`EVENT_ID_ALREADY_EXISTS:${event.eventId}`);
    }
    this.events.set(event.eventId, event);
  }

  has(eventId: string): boolean {
    return this.events.has(eventId);
  }

  list(traceId?: string): RuntimeEvent[] {
    const events = [...this.events.values()];
    return traceId ? events.filter((event) => event.traceId === traceId) : events;
  }
}

export type EventHandler = (event: RuntimeEvent) => void;

export interface EventDispatchResult {
  accepted: boolean;
  duplicate: boolean;
  handled: boolean;
  event: RuntimeEvent;
  error?: string;
}

/**
 * Deterministic event boundary for long-running AUREA workflows.
 * It persists the event before dispatching and treats eventId as the
 * idempotency key. It does not execute tools, bypass permissions, or
 * claim durable persistence beyond the supplied EventStore.
 */
export class EventDrivenRuntime {
  private readonly handlers = new Map<RuntimeEventType, EventHandler[]>();

  constructor(private readonly store: EventStore) {}

  subscribe(eventType: RuntimeEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  publish(event: RuntimeEvent): EventDispatchResult {
    if (this.store.has(event.eventId)) {
      return { accepted: false, duplicate: true, handled: false, event };
    }

    this.store.append(event);
    const handlers = this.handlers.get(event.eventType) ?? [];

    try {
      for (const handler of handlers) handler(event);
      return { accepted: true, duplicate: false, handled: handlers.length > 0, event };
    } catch (error) {
      return {
        accepted: true,
        duplicate: false,
        handled: false,
        event,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  replay(traceId: string): RuntimeEvent[] {
    return this.store.list(traceId);
  }
}
