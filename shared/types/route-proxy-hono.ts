import type { Context } from 'hono';
import { proxyRequest, ROUTE_MAP } from './route-proxy';

export const createRouteProxyRoute = (map: Record<string, string> = ROUTE_MAP) => {
  return async (c: Context) => {
    const proxied = await proxyRequest(c.req.raw, c.env, map);
    if (proxied) return proxied;
    return c.next();
  };
};
