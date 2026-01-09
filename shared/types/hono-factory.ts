/**
 * Shared Hono application factory and base configuration
 * Provides consistent patterns across all XAOSTECH workers
 */

import { Hono, Context, Next } from 'hono';
import { applySecurityHeaders } from './security';
import { createApiProxyRoute } from './api-proxy-hono';
import { serveFaviconHono } from './favicon';

// Base environment interface - extend in each worker
export interface BaseEnv {
  // API Access (for calling api.xaostech.io)
  API_ACCESS_CLIENT_ID?: string;
  API_ACCESS_CLIENT_SECRET?: string;
  
  // Deprecated aliases (backwards compatibility)
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

// Common worker environment extensions
export interface WithD1 {
  DB: D1Database;
}

export interface WithKV {
  CACHE: KVNamespace;
}

export interface WithR2 {
  BUCKET: R2Bucket;
}

export interface WithAI {
  AI: Ai;
}

/**
 * Security headers middleware
 */
export function securityMiddleware() {
  return async (c: Context, next: Next) => {
    await next();
    return applySecurityHeaders(c.res);
  };
}

/**
 * Request logging middleware
 */
export function loggingMiddleware(serviceName: string) {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    try {
      await next();
      const duration = Date.now() - start;
      const status = c.res.status;
      
      console.log(`[${serviceName}] ${method} ${path} ${status} ${duration}ms`);
    } catch (err: any) {
      const duration = Date.now() - start;
      console.error(`[${serviceName}] ${method} ${path} ERROR ${duration}ms`, err.message);
      throw err;
    }
  };
}

/**
 * Create a base Hono app with standard configuration
 * 
 * @param serviceName - Name of the service for logging
 * @param options - Configuration options
 */
export function createBaseApp<E extends BaseEnv>(
  serviceName: string,
  options: {
    enableLogging?: boolean;
    enableApiProxy?: boolean;
    enableFavicon?: boolean;
  } = {}
) {
  const {
    enableLogging = true,
    enableApiProxy = true,
    enableFavicon = true,
  } = options;

  const app = new Hono<{ Bindings: E }>();

  // Security headers (always enabled)
  app.use('*', securityMiddleware());

  // Optional logging
  if (enableLogging) {
    app.use('*', loggingMiddleware(serviceName));
  }

  // Standard health check
  app.get('/health', (c) => c.json({ 
    status: 'ok', 
    service: serviceName,
    timestamp: new Date().toISOString(),
  }));

  // API proxy for /api/* routes
  if (enableApiProxy) {
    app.all('/api/*', createApiProxyRoute());
  }

  // Favicon serving
  if (enableFavicon) {
    app.get('/favicon.ico', serveFaviconHono);
  }

  return app;
}

/**
 * Standard error handlers
 */
export function applyErrorHandlers(app: Hono<any>, serviceName: string) {
  app.notFound((c) => c.json({ 
    error: 'Not found', 
    path: c.req.path,
    service: serviceName,
  }, 404));

  app.onError((err, c) => {
    console.error(`[${serviceName}] Error:`, err);
    return c.json({ 
      error: 'Internal server error',
      message: err.message,
      service: serviceName,
    }, 500);
  });
}

/**
 * Type helper for Hono context with specific env
 */
export type AppContext<E extends BaseEnv = BaseEnv> = Context<{ Bindings: E }>;

/**
 * Auth context interface (set by auth middleware)
 */
export interface AuthContext {
  userId?: string;
  sessionId?: string;
  isAdmin?: boolean;
  email?: string;
  scope?: string[];
  error?: string;
}

/**
 * Get typed auth context from Hono context
 */
export function getAuthContext(c: Context): AuthContext | undefined {
  return c.get('auth') as AuthContext | undefined;
}

/**
 * User headers commonly passed to downstream services
 */
export function getUserHeaders(c: Context): Record<string, string> {
  const auth = getAuthContext(c);
  
  return {
    'X-User-ID': auth?.userId || c.req.header('X-User-ID') || '',
    'X-User-Role': auth?.isAdmin ? 'admin' : 'user',
    'X-User-Email': auth?.email || c.req.header('X-User-Email') || '',
    'X-Session-ID': auth?.sessionId || '',
  };
}
