import { describe, expect, it } from "vitest";
import { validateConchitaPrincipal } from "./conchita-authenticated-principal.js";

describe("Conchita authenticated principal", () => {
  it("requires a server-established principal", () => {
    expect(validateConchitaPrincipal(undefined)).toEqual(["AUTHENTICATED_PRINCIPAL_REQUIRED"]);
  });

  it("requires an authentication method", () => {
    expect(validateConchitaPrincipal({ userId: "u1", authenticationMethod: "" })).toEqual([
      "AUTHENTICATION_METHOD_REQUIRED",
    ]);
  });

  it("accepts a complete authenticated principal", () => {
    expect(validateConchitaPrincipal({ userId: "u1", authenticationMethod: "session-cookie" })).toEqual([]);
  });
});
