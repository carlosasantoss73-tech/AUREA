import { describe, expect, it } from "vitest";
import worker from "./ecp-cloudflare-worker.js";

describe("ECP Cloudflare Worker readiness", () => {
  it("returns 503 from /ready when intake is available but institutional context is blocked", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/ready"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "pilot-team",
      ECP_ACCESS_AUD: "pilot-audience",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "REPLACE_WITH_VERIFIED_CURRENT_INDEX_ID",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "",
      ANTHROPIC_API_KEY: "configured-key-placeholder",
      ECP_ANTHROPIC_MODEL: "configured-model",
    } as never);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "NOT_READY",
      runtimeReady: true,
      institutionalContextConfigured: false,
      analysisReady: false,
    });
  });

  it("returns 200 from /ready only when runtime, context and provider configuration are present", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/ready"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_EXECUTION_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "pilot-team",
      ECP_ACCESS_AUD: "pilot-audience",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "verified-index-id",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "configured-token-placeholder",
      ANTHROPIC_API_KEY: "configured-key-placeholder",
      ECP_ANTHROPIC_MODEL: "configured-model",
    } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "READY",
      runtimeReady: true,
      institutionalContextConfigured: true,
      analysisReady: true,
    });
  });

  it("fails closed and does not serve the pilot UI without a valid Access assertion", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "REPLACE_WITH_CLOUDFLARE_ACCESS_TEAM_NAME",
      ECP_ACCESS_AUD: "REPLACE_WITH_CLOUDFLARE_ACCESS_APPLICATION_AUD",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "REPLACE_WITH_VERIFIED_CURRENT_INDEX_ID",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "",
    } as never);
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" });
  });

  it("allows intake readiness while keeping analysis blocked without institutional credentials", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/health"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "pilot-team",
      ECP_ACCESS_AUD: "pilot-audience",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "REPLACE_WITH_VERIFIED_CURRENT_INDEX_ID",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "",
    } as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; runtimeReady: boolean; institutionalContextReady: boolean };
    expect(body.status).toBe("INTAKE_READY_CONTEXT_BLOCKED");
    expect(body.runtimeReady).toBe(true);
    expect(body.institutionalContextReady).toBe(false);
  });

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
  it("does not report HEALTHY when institutional context exists but analysis provider configuration is missing", async () => {
    const response = await worker.fetch(new Request("https://ecp.example.test/health"), {
      ECP_EXPEDIENT_STATE: {} as never,
      ECP_ACCESS_TEAM_DOMAIN: "pilot-team",
      ECP_ACCESS_AUD: "pilot-audience",
      ECP_ACCESS_ACTOR_ROLE: "ANALYST",
      ECP_INSTITUTIONAL_INDEX_FILE_ID: "verified-index-id",
      ECP_GOOGLE_DRIVE_ACCESS_TOKEN: "configured-token-placeholder",
      ANTHROPIC_API_KEY: "",
      ECP_ANTHROPIC_MODEL: "REPLACE_WITH_MODEL",
    } as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; institutionalContextReady: boolean; analysisReady: boolean; analysisMissing: string[] };
    expect(body.status).toBe("INTAKE_READY_ANALYSIS_BLOCKED");
    expect(body.institutionalContextReady).toBe(true);
    expect(body.analysisReady).toBe(false);
    expect(body.analysisMissing).toContain("ANTHROPIC_API_KEY");
    expect(body.analysisMissing).toContain("ECP_ANTHROPIC_MODEL");
    expect(body.analysisMissing).toContain("ECP_EXECUTION_STATE");
  });

});
