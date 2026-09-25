# BIB-08 — Live v011 Reader Probe

## Status
IMPLEMENTATION PROBE — not a claim that authenticated Google access is currently configured.

## Purpose
Obtain the exact live bytes and top-level shape of the institutional v011 index before implementing a parser.

## Fixed institutional identifiers
- Knowledge OS root: `1LII_NQoow-zcR_iGECRiA6cVS4VOBXLm`
- Current documented index: `1kIzswJSMKzQOpf8z6j8iDvfxhq26ZvXa`
- Previous documented index: `19YHMHdlpD-yKA1HK-zyUszVzDhNldkHx`

## Safety rules
1. Read-only access only.
2. Authenticate through GitHub Actions OIDC → Google Workload Identity Federation.
3. Do not write to Google Drive.
4. Do not infer undocumented v011 fields.
5. Do not implement a parser until the live payload has been observed.
6. If authentication or scope verification fails, stop and report the exact gate failure.

## Next implementation gate
Live v011 bytes + verified metadata → define exact parser contract → unit tests against the observed shape → authenticated reader → ContextProvider → Runtime E2E.

## Non-claims
The workflow file prepares the probe. It does not prove that Google authentication, Drive access, or live v011 reading has succeeded until a real workflow run produces evidence.
