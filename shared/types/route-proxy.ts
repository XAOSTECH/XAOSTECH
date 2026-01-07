/**
 * Shared route proxy for Astro / generic Workers
 * Maps path prefixes (e.g., /portfolio) to target origin (https://portfolio.xaostech.io)
 */

export const ROUTE_MAP: Record<string, string> = {
  '/portfolio': 'https://portfolio.xaostech.io',
  '/account': 'https://account.xaostech.io',
  '/data': 'https://data.xaostech.io',
  '/lingua': 'https://lingua.xaostech.io',
  '/payments': 'https://payments.xaostech.io',
};

export const proxyRequest = async (request: Request, env: any, map: Record<string, string> = ROUTE_MAP) => {
  const url = new URL(request.url);
  for (const prefix of Object.keys(map)) {
    if (url.pathname === prefix || url.pathname.startsWith(prefix + '/')) {
      const targetOrigin = map[prefix];
      const rest = url.pathname.substring(prefix.length) || '/';
      const proxiedUrl = new URL(rest + url.search, targetOrigin);

      // Build outgoing headers: avoid hop-by-hop headers
      const headers = new Headers();
      for (const [k, v] of request.headers) {
        const lk = k.toLowerCase();
        if (['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'keep-alive'].includes(lk)) continue;
        headers.set(k, v);
      }

      // Attach CF Access headers if available and target looks like data/api
      const clientId = env?.CF_ACCESS_CLIENT_ID || (env?.bindings && env.bindings.CF_ACCESS_CLIENT_ID);
      const clientSecret = env?.CF_ACCESS_CLIENT_SECRET || (env?.bindings && env.bindings.CF_ACCESS_CLIENT_SECRET);

      if (clientId && clientSecret) {
        headers.set('CF-Access-Client-Id', clientId);
        headers.set('CF-Access-Client-Secret', clientSecret);
        headers.set('X-Proxy-CF-Injected', 'true');
      }

      // Mark target for diagnostics
      headers.set('X-Proxy-Target', targetOrigin);

      const proxiedReq = new Request(proxiedUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });

      const res = await fetch(proxiedReq);
      // If response is HTML and seems like an Access login, bubble that up
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 200 && contentType.includes('text/html')) {
        const txt = await res.text();
        if (txt.includes('Cloudflare') || txt.includes('Sign in') || txt.includes('Access')) {
          return new Response(JSON.stringify({ error: 'Blocked by Cloudflare Access' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }
        // Otherwise return HTML as-is
        return new Response(txt, { status: res.status, headers: res.headers });
      }

      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: new Headers(res.headers) });
    }
  }
  return null;
};
