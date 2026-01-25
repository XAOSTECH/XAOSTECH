/**
 * Shared API proxy handler for Hono workers
 * Proxies /api/* requests to api.xaostech.io with CF_ACCESS authentication
 */

import type { HonoRequest, Context } from 'hono';
import type { ProxyEnv } from './env';

export const createApiProxyRoute = () => {
  return async (c: Context) => {
    try {
      const request = c.req.raw;
      const url = new URL(request.url);

      // Extract the path after /api/
      const pathname = url.pathname.substring(4) || '/';

      console.log('[api-proxy] Proxying request to api.xaostech.io:', pathname);

      // Use API_ACCESS_* from worker env only (no fallbacks)
      const env = c.env as ProxyEnv;
      const clientId = env.API_ACCESS_CLIENT_ID;
      const clientSecret = env.API_ACCESS_CLIENT_SECRET;

      // Build proxied URL
      const proxiedUrl = new URL(pathname + url.search, 'https://api.xaostech.io');

      // Build outgoing headers and avoid hop-by-hop headers like Host
      const headers = new Headers();
      for (const [k, v] of request.headers) {
        const lk = k.toLowerCase();
        if (['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'keep-alive'].includes(lk)) continue;
        headers.set(k, v);
      }

      // Forward original host for OAuth callbacks to redirect correctly
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      if (clientId && clientSecret) {
        // Send Cloudflare-compatible headers upstream
        headers.set('CF-Access-Client-Id', clientId);
        headers.set('CF-Access-Client-Secret', clientSecret);
      } else {
        console.warn('[api-proxy] Missing API_ACCESS_CLIENT_ID/SECRET; forwarding without auth');
      }

      // Proxy the request
      const proxiedRequest = new Request(proxiedUrl, {
        method: request.method,
        headers,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? await request.text()
            : undefined,
      });

      console.log('[api-proxy] Fetching from:', proxiedUrl.toString());
      const response = await fetch(proxiedRequest);

      console.log('[api-proxy] Response status:', response.status);

      // Return the response with appropriate headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
    } catch (error) {
      console.error('[api-proxy] Error:', error);
      console.error('[api-proxy] Error message:', (error as Error).message);
      console.error('[api-proxy] Error stack:', (error as Error).stack);

      return new Response(JSON.stringify({ error: 'Proxy error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
};

// Note: DATA-specific access helpers moved to api.xaostech.io/src/lib/data-proxy.ts
// The shared Hono proxy should remain generic — it only proxies to api.xaostech.io and injects API_ACCESS headers from the worker env.


