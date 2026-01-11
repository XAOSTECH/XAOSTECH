// Shared security headers and utilities

// Content Security Policy - Restrictive by default, but allows legitimate external resources
// 'unsafe-inline' is NOT used - use nonces or hashes for inline resources instead
// GitHub OAuth redirect (login page) bypasses this via middleware exception
export const CSP = "frame-ancestors 'none'; default-src 'self'; connect-src 'self' https: wss:; img-src 'any' data: https:; style-src 'self' https:; script-src 'self' https:; object-src 'none'";

export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), usb=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), magnetometer=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  } as Record<string, string>;
}

export function applySecurityHeaders(response: Response) {
  const headers = new Headers(response.headers || {});
  const sec = getSecurityHeaders();
  for (const k of Object.keys(sec)) {
    headers.set(k, sec[k]);
  }

  // Some Responses may be a plain object, ensure we return a Response
  return new Response(response.body, {
    status: (response as any).status || 200,
    statusText: (response as any).statusText || undefined,
    headers,
  });
}
