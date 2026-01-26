/**
 * Shared API proxy handler for Astro API routes
 * Proxies requests to api.xaostech.io with CF_ACCESS authentication
 */

import type { APIRoute } from 'astro';
import type { ProxyEnv } from './env';

export const createProxyHandler = (): APIRoute => {
  return async (context) => {
    const { request, locals } = context;
    const url = new URL(request.url);

    // Extract the path after /api/
    const pathname = url.pathname.substring(4) || '/';

    try {
      console.log('[api-proxy] Proxying request to api.xaostech.io:', pathname);

      // Access runtime secrets from Cloudflare adapter context
      // In @astrojs/cloudflare, secrets are available at locals.runtime.env
      const env = (locals as any).runtime?.env || {};
      const clientId = env.API_ACCESS_CLIENT_ID;
      const clientSecret = env.API_ACCESS_CLIENT_SECRET;


      // Build proxied URL
      const proxiedUrl = new URL(pathname + url.search, 'https://api.xaostech.io');

      // Build outgoing headers: avoid copying hop-by-hop headers like Host
      const headers = new Headers();
      for (const [k, v] of request.headers) {
        const lk = k.toLowerCase();
        if (['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'keep-alive'].includes(lk)) continue;
        headers.set(k, v);
      }

      // Add a proxy source header for tracing in data worker logs and a short random trace id
      headers.set('X-Proxy-Source', 'api-proxy');
      const traceId = Math.random().toString(16).slice(2, 10);
      headers.set('X-Trace-Id', traceId);

      const safeLog = {
        traceId,
        hasCfAccessId: !!clientId,
        hasCfAccessSecret: !!clientSecret,
        proxiedPath: pathname
      };
      console.debug('[api-proxy] Outgoing header presence:', safeLog);

      if (clientId && clientSecret) {
        // Send Cloudflare-compatible headers upstream (do NOT log secrets)
        headers.set('CF-Access-Client-Id', clientId);
        headers.set('CF-Access-Client-Secret', clientSecret);
      } else {
        console.warn('[api-proxy] Missing API_ACCESS_CLIENT_ID/SECRET; forwarding without auth', { traceId });
      }

      // Proxy the request - don't follow redirects, pass them through to client
      const proxiedRequest = new Request(proxiedUrl, {
        method: request.method,
        headers,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? await request.text()
            : undefined,
        redirect: 'manual',
      });

      console.log('[api-proxy] Fetching from:', proxiedUrl.toString());
      const response = await fetch(proxiedRequest);

      console.log('[api-proxy] Response status:', response.status, 'type:', response.type);

      // Return the response with all headers (including Set-Cookie for redirects)
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

// Export named functions for Astro API route handlers
export const GET = createProxyHandler();
export const POST = createProxyHandler();
export const PUT = createProxyHandler();
export const DELETE = createProxyHandler();
export const PATCH = createProxyHandler();
export const HEAD = createProxyHandler();
export const OPTIONS = createProxyHandler();
