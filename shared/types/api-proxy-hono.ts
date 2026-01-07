/**
 * Shared API proxy handler for Hono workers
 * Proxies /api/* requests to api.xaostech.io with CF_ACCESS authentication
 */

import type { HonoRequest, Context } from 'hono';

export interface ProxyEnv {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  [key: string]: any;
}

export const createApiProxyRoute = () => {
  return async (c: Context) => {
    try {
      const request = c.req.raw;
      const url = new URL(request.url);

      // Extract the path after /api/
      const pathname = url.pathname.substring(4) || '/';

      console.log('[api-proxy] Proxying request to api.xaostech.io:', pathname);

      // Get environment variables for CF_ACCESS authentication
      const env = c.env as ProxyEnv;
      const processEnv = (globalThis as any)?.process?.env;
      const clientId = env.CF_ACCESS_CLIENT_ID || (processEnv && processEnv.CF_ACCESS_CLIENT_ID);
      const clientSecret = env.CF_ACCESS_CLIENT_SECRET || (processEnv && processEnv.CF_ACCESS_CLIENT_SECRET);

      console.log('[api-proxy] c.env has CF_ACCESS_CLIENT_ID:', !!env.CF_ACCESS_CLIENT_ID);
      console.log('[api-proxy] process.env has CF_ACCESS_CLIENT_ID:', !!(processEnv && processEnv.CF_ACCESS_CLIENT_ID));

      // Build proxied URL
      const proxiedUrl = new URL(
        pathname + url.search,
        'https://api.xaostech.io'
      );

      // Build outgoing headers and avoid hop-by-hop headers like Host
      const headers = new Headers();
      for (const [k, v] of request.headers) {
        const lk = k.toLowerCase();
        if (['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'keep-alive'].includes(lk)) continue;
        headers.set(k, v);
      }

      if (clientId && clientSecret) {
        // Use canonical header names as in Cloudflare docs
        headers.set('CF-Access-Client-Id', clientId);
        headers.set('CF-Access-Client-Secret', clientSecret);
        // Add a non-sensitive diagnostic header so the upstream API can detect injection
        headers.set('X-Proxy-CF-Injected', 'true');
        console.log('[api-proxy] Added CF_ACCESS authentication headers');
      } else {
        console.warn('[api-proxy] Missing CF_ACCESS credentials - request may fail');
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
