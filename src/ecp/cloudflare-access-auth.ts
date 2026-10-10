export interface CloudflareAccessPrincipal { email: string; subject: string; }
export interface CloudflareAccessValidationConfig {
  teamDomain: string;
  audience: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function parseJson<T>(value: string): T { return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T; }

/** Verifies the signed Cloudflare Access assertion. Browser-controlled identity
 * headers are intentionally not accepted as authentication evidence. */
export async function verifyCloudflareAccessJwt(
  assertion: string | null,
  config: CloudflareAccessValidationConfig,
): Promise<CloudflareAccessPrincipal | null> {
  if (!assertion || !config.teamDomain || !config.audience) return null;
  const parts = assertion.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = parseJson<{ alg?: string; kid?: string }>(parts[0]);
    const payload = parseJson<{ aud?: unknown; email?: unknown; sub?: unknown; exp?: unknown; iss?: unknown }>(parts[1]);
    if (header.alg !== "RS256" || !header.kid || typeof payload.email !== "string" || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    const issuer = `https://${config.teamDomain}.cloudflareaccess.com`;
    if (payload.iss !== issuer || payload.exp * 1000 <= (config.now?.() ?? new Date()).getTime()) return null;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(config.audience)) return null;
    const endpoint = `${issuer}/cdn-cgi/access/certs`;
    const response = await (config.fetchImpl ?? fetch)(endpoint);
    if (!response.ok) return null;
    const jwks = await response.json() as { keys?: Jwk[] };
    const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signature = decodeBase64Url(parts[2]) as unknown as BufferSource;
    const signedPayload = new TextEncoder().encode(`${parts[0]}.${parts[1]}`) as unknown as BufferSource;
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedPayload);
    return valid ? { email: payload.email.trim().toLowerCase(), subject: payload.sub } : null;
  } catch { return null; }
}