import { LOGO_PATH, CACHE_TTL } from './assets';
import { jsonError } from './errors';
import { createApiProxyRoute } from './api-proxy-hono';

export async function serveFavicon(request: Request, env: any, proxyHandler: any, applySecurityHeaders: (r: Response) => Response): Promise<Response> {
  try {
    const proxied = await proxyHandler({ request: new Request(new URL(LOGO_PATH, request.url).toString()), locals: { runtime: { env } } });

    if (!proxied || !proxied.ok) {
      return applySecurityHeaders(jsonError(404, 'Favicon not found'));
    }

    const blob = await proxied.blob();
    const headers = new Headers(proxied.headers);
    headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    // Ensure a Content-Type is present for clients that expect it
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'image/png');
    return applySecurityHeaders(new Response(blob, { status: proxied.status, headers }));
  } catch (err) {
    try { console.debug && console.debug('[favicon] serveFavicon error', err); } catch (e) { /* ignore */ }
    return applySecurityHeaders(jsonError(500, 'Failed to serve favicon'));
  }
}

/**
 * Hono/Context-friendly helper: fetches favicon via the local /api proxy route
 * which properly injects API_ACCESS credentials before hitting api.xaostech.io.
 * 
 * Usage in Hono workers: app.get('/favicon.ico', serveFaviconHono);
 */
export async function serveFaviconHono(c: any) {
  try {
    // Use the shared Hono proxy to properly inject API_ACCESS headers
    const proxyHandler = createApiProxyRoute();
    
    // Build a synthetic request to /api/data/assets/XAOSTECH_LOGO.png
    const baseUrl = new URL(c.req.url).origin;
    const faviconRequest = new Request(`${baseUrl}${LOGO_PATH}`, {
      method: 'GET',
      headers: c.req.raw.headers,
    });
    
    // Create a mock context for the proxy handler
    const mockContext = {
      req: { raw: faviconRequest },
      env: c.env,
    };
    
    const response = await proxyHandler(mockContext as any);
    
    if (!response.ok) {
      console.debug('[favicon] Proxy returned non-ok', { status: response.status });
      return c.json({ error: 'Favicon not found' }, 404);
    }
    
    const blob = await response.blob();
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('[favicon] serveFaviconHono error', err);
    return c.json({ error: 'Failed to fetch favicon' }, 500);
  }
}
