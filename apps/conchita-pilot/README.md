# Conchita Personal V0 — One-Click Pilot

This is the lightweight mobile client shell. The phone contains only the client UI and local PWA shell; Conchita/XOLAR/AUREA execution remains cloud-side.

## Pilot flow

1. Publish this directory as a secure HTTPS site (GitHub Pages or another static host).
2. Give the user the single HTTPS activation link.
3. On the phone, open the link and choose **Add to Home Screen / Install**.
4. The PWA opens as **Conchita** without requiring developer configuration.
5. The only remaining runtime dependency is the secure Conchita Gateway endpoint.

## Security boundary

Do not place provider API keys, XOLAR master credentials, AUREA administrative credentials, or unrestricted execution authority in this client.

## Runtime integration

Set the server-side API origin before production. The client expects:

- `POST /conchita/v1/message`
- HTTPS
- authenticated session/cookie or equivalent secure session established by the Gateway

The current UI deliberately fails closed when the cloud Gateway is not configured.
