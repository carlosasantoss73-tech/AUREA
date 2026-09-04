import { describe, expect, it } from "vitest";
import { validateConchitaMessage } from "./conchita-personal-v0-contract.js";

describe("Conchita Personal V0 contract", () => {
  it("accepts a valid message envelope", () => {
    expect(validateConchitaMessage({
      sessionId: "sess-1",
      userId: "owner-1",
      message: "Hola Conchita",
      clientRequestId: "req-1",
    })).toEqual([]);
  });

  it("fails closed when required identity or message fields are missing", () => {
    expect(validateConchitaMessage({
      sessionId: "",
      userId: "",
      message: "",
      clientRequestId: "",
    })).toEqual([
      "SESSION_REQUIRED",
      "USER_REQUIRED",
      "CLIENT_REQUEST_ID_REQUIRED",
      "MESSAGE_REQUIRED",
    ]);
  });
});
