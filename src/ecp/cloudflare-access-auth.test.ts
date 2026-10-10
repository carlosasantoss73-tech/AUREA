import { describe, expect, it } from "vitest";
import { verifyCloudflareAccessJwt } from "./cloudflare-access-auth.js";

describe("Cloudflare Access JWT verification", () => {
  it("fails closed when the assertion or trusted configuration is missing", async () => {
    await expect(verifyCloudflareAccessJwt(null, { teamDomain: "team", audience: "aud" })).resolves.toBeNull();
    await expect(verifyCloudflareAccessJwt("header.payload.signature", { teamDomain: "", audience: "aud" })).resolves.toBeNull();
    await expect(verifyCloudflareAccessJwt("not-a-jwt", { teamDomain: "team", audience: "aud" })).resolves.toBeNull();
  });

  it("rejects malformed tokens without calling the remote key endpoint", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ keys: [] }), { status: 200 });
    };
    await expect(verifyCloudflareAccessJwt("x.y.z", { teamDomain: "team", audience: "aud", fetchImpl })).resolves.toBeNull();
    expect(calls).toBe(0);
  });
});
