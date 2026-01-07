import { LOGO_PATH, CACHE_TTL } from './assets';
import { jsonError } from './errors';

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

// Hono/Context-friendly helper: fetches via local /api route which injects API access credentials
export async function serveFaviconHono(c: any) {
  try {
    const response = await fetch(LOGO_PATH);
    if (!response.ok) return c.json({ error: 'Favicon not found' }, 404);
    const blob = await response.blob();
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    try { console.debug && console.debug('[favicon] serveFaviconHono error', err); } catch (e) { /* ignore */ }
    return c.json({ error: 'Failed to fetch favicon' }, 500);
  }
}
