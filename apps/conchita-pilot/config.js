// Deployment-owned configuration. Keep this list empty until the real Cloudflare
// Worker origin is known; the PWA will fail closed rather than send the bootstrap
// token to an arbitrary URL.
window.CONCHITA_CONFIG = Object.freeze({
  allowedApiOrigins: [],
});
