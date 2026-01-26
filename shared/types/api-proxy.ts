/**
 * Shared API proxy handler for Astro API routes
 * Proxies requests to api.xaostech.io with CF_ACCESS authentication
 */

import type { APIRoute } from 'astro';

export const createProxyHandler = (): APIRoute => {
  return async (context) => {
    const { request, locals } = context;
    const url = new URL(request.url);

    // Extract the path after /api/
    const pathname = url.pathname.substring(4) || '/';

    try {
      console.log('[api-proxy] Proxying request to api.xaostech.io:', pathname);

      // Access Cloudflare environment via locals.runtime.env
      // In Cloudflare Pages with Astro, secrets are available here during runtime
      const cfContext = (locals as any).cf;
      const runtime = (locals as any).runtime;
      
      console.log('[api-proxy] Available context keys:', Object.keys(locals || {}));
      console.log('[api-proxy] Runtime available:', !!runtime);
      console.log('[api-proxy] CF context available:', !!cfContext);

      // Get environment from runtime binding
      const env = runtime?.env || {};
      
      const clientId = env.CF_ACCESS_CLIENT_ID;
      const clientSecret = env.CF_ACCESS_CLIENT_SECRET;

      console.log(
        '[api-proxy] CF_ACCESS_CLIENT_ID available:',
        !!clientId,
        'length:',
        clientId?.length || 0
      );
      console.log(
        '[api-proxy] CF_ACCESS_CLIENT_SECRET available:',
        !!clientSecret,
        'length:',
        clientSecret?.length || 0
      );
      console.log('[api-proxy] Full env keys:', Object.keys(env));

      // Build proxied URL
      const proxiedUrl = new URL(
        pathname + url.search,
        'https://api.xaostech.io'
      );

      // Copy headers and add service token auth
      const headers = new Headers(request.headers);
      headers.set('Host', 'api.xaostech.io');

      if (clientId && clientSecret) {
        headers.set('Cf-Access-Client-Id', clientId);
        headers.set('Cf-Access-Client-Secret', clientSecret);
        console.log('[api-proxy] Added CF_ACCESS authentication headers');
      } else {
        console.warn(
          '[api-proxy] Missing CF_ACCESS credentials - request may fail'
        );
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
      console.log(
        '[api-proxy] Response content-type:',
        response.headers.get('content-type')
      );

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

// Export named functions for Astro API route handlers
export const GET = createProxyHandler();
export const POST = createProxyHandler();
export const PUT = createProxyHandler();
export const DELETE = createProxyHandler();
export const PATCH = createProxyHandler();
export const HEAD = createProxyHandler();
export const OPTIONS = createProxyHandler();
