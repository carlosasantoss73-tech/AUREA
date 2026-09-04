import { describe, expect, it } from "vitest";
import { classifyReservationFailure } from "./execution-reservation-error.js";

describe("classifyReservationFailure", () => {
  it("distinguishes an existing reservation", () => {
    expect(classifyReservationFailure(new Error("RESERVATION_EXISTS:trace-1"))).toBe("RESERVATION_EXISTS");
  });

  it("fails closed as store unavailable for unknown errors", () => {
    expect(classifyReservationFailure(new Error("database unavailable"))).toBe("RESULT_STORE_UNAVAILABLE");
    expect(classifyReservationFailure("unexpected")).toBe("RESULT_STORE_UNAVAILABLE");
  });
});
