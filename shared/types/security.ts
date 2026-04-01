// Shared security headers and utilities

// Content Security Policy - comprehensive policy with font-src for Google Fonts and self-hosted fonts
// 'unsafe-inline' intentionally omitted to avoid allowing inline scripts/styles.
// To allow specific inline resources, use nonces or hashes per response instead of 'unsafe-inline'.
export const CSP = "frame-ancestors 'none'; default-src 'self' https:; connect-src 'self' https: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; script-src 'self' https:; object-src 'none'";

export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), usb=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), magnetometer=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  } as Record<string, string>;
}

export function applySecurityHeaders(response: Response): Response {
  const sec = getSecurityHeaders();
  try {
    // Prefer in-place mutation (works in Cloudflare Workers / Astro middleware)
    for (const k of Object.keys(sec)) {
      response.headers.set(k, sec[k]);
    }
    return response;
  } catch {
    // Fallback: clone into a new Response if headers are immutable
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
