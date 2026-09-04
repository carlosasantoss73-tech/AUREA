import { describe, expect, it, vi } from "vitest";
import { EventDrivenRuntime, InMemoryEventStore, RuntimeEvent } from "./event-driven-runtime";

const event = (eventId = "evt-1"): RuntimeEvent => ({
  eventId,
  eventType: "OBJECTIVE_RECEIVED",
  traceId: "trace-1",
  projectId: "project-1",
  occurredAt: "2026-09-04T00:00:00.000Z",
  payload: { objective: "advance AUREA" },
});

describe("EventDrivenRuntime", () => {
  it("persists before dispatch and handles an event once", () => {
    const store = new InMemoryEventStore();
    const runtime = new EventDrivenRuntime(store);
    const handler = vi.fn();
    runtime.subscribe("OBJECTIVE_RECEIVED", handler);

    const first = runtime.publish(event());
    const second = runtime.publish(event());

    expect(first.accepted).toBe(true);
    expect(first.handled).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(runtime.replay("trace-1")).toHaveLength(1);
  });

  it("retains the event when a handler fails", () => {
    const store = new InMemoryEventStore();
    const runtime = new EventDrivenRuntime(store);
    runtime.subscribe("BLOCKED", () => {
      throw new Error("handler failed");
    });

    const result = runtime.publish({ ...event("evt-2"), eventType: "BLOCKED" });

    expect(result.accepted).toBe(true);
    expect(result.handled).toBe(false);
    expect(result.error).toBe("handler failed");
    expect(store.list("trace-1")).toHaveLength(1);
  });

  it("keeps traces isolated during replay", () => {
    const store = new InMemoryEventStore();
    const runtime = new EventDrivenRuntime(store);

    runtime.publish(event("evt-3"));
    runtime.publish({ ...event("evt-4"), traceId: "trace-2" });

    expect(runtime.replay("trace-1").map((item) => item.eventId)).toEqual(["evt-3"]);
  });
});
