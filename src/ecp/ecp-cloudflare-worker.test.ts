import { describe, expect, it } from "vitest";
import worker from "./ecp-cloudflare-worker.js";

describe("ECP Cloudflare Worker readiness", () => {
  it("blocks service readiness until real Access, institutional index and Drive credentials are configured", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/health"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "REPLACE_WITH_CLOUDFLARE_ACCESS_TEAM_NAME",
      ECP_ACCESS_AUD: "REPLACE_WITH_CLOUDFLARE_ACCESS_APPLICATION_AUD",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "REPLACE_WITH_VERIFIED_CURRENT_INDEX_ID",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "",
    } as never);
    expect(response.status).toBe(503);
    const body = await response.json() as { status: string; missing: string[] };
    expect(body.status).toBe("BLOCKED");
    expect(body.missing).toContain("ECP_ACCESS_TEAM_DOMAIN");
    expect(body.missing).toContain("ECP_ACCESS_AUD");
    expect(body.missing).toContain("ECP_INSTITUTIONAL_INDEX_FILE_ID");
    expect(body.missing).toContain("ECP_GOOGLE_DRIVE_ACCESS_TOKEN");
  });
});
