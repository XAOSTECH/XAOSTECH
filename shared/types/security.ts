// Shared security headers and utilities

// CSP Policies
export const CSP_STRICT = "frame-ancestors 'none'; default-src 'self'; connect-src 'self' https: wss:; img-src 'self' data:; style-src 'self' https:; script-src 'self' https:; object-src 'none'";
export const CSP_RELAXED = "frame-ancestors 'none'; default-src 'self'; connect-src 'self' https: wss:; img-src 'self' data: https:; style-src 'self' https: 'unsafe-inline'; script-src 'self' https:; object-src 'none'";

// Default to strict CSP
export const CSP = CSP_STRICT;

export function getSecurityHeaders(cspPolicy: string = CSP_STRICT) {
  return {
    'Content-Security-Policy': cspPolicy,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), usb=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), magnetometer=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  } as Record<string, string>;
}

export function applySecurityHeaders(response: Response, cspPolicy: string = CSP_STRICT) {
  const headers = new Headers(response.headers || {});
  const sec = getSecurityHeaders(cspPolicy);
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
