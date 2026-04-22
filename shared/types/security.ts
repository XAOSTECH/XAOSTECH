// Shared security headers and utilities.
//
// CSP design (April 2026 reset):
//
// We tried Astro's `security.csp` integration (auto-hashed inline scripts/
// styles). It is **fundamentally incompatible** with this codebase:
//
//   1. Inline `style="..."` attributes (used heavily across pages) cannot be
//      hashed — only `<style>` blocks can. Once any hash is added to style-src,
//      browsers IGNORE `'unsafe-inline'` per spec, so every inline attribute
//      gets blocked.
//   2. `require-trusted-types-for 'script'` blocks every `innerHTML=` write,
//      which `shared/scripts/bubble.js` and several pages depend on.
//   3. `frame-ancestors` is silently ignored when delivered via `<meta>`
//      (Astro's static-site emission path), so it has to come from a header.
//
// Decision: emit CSP from middleware (single source of truth, header-only).
// Accept `'unsafe-inline'` for script-src and style-src. Tighten later
// per-page with nonces if/when inline-style attributes are refactored to
// classes and innerHTML is replaced with safe DOM APIs.
//
// `ambient-light-sensor` was dropped from Permissions-Policy: deprecated by
// all browsers, emitting it produces a console warning.

export const CSP = [
  "default-src 'self' https:",
  "script-src 'self' https: 'unsafe-inline'",
  "style-src 'self' https: 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), usb=(), gyroscope=(), accelerometer=(), magnetometer=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  };
}

export function applySecurityHeaders(response: Response): Response {
  const sec = getSecurityHeaders();
  try {
    for (const k of Object.keys(sec)) {
      response.headers.set(k, sec[k]);
    }
    return response;
  } catch {
    const headers = new Headers(response.headers);
    for (const k of Object.keys(sec)) {
      headers.set(k, sec[k]);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
