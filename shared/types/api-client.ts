/**
 * Server-side API client for SSR pages and worker-internal calls.
 *
 * Counterpart to api-proxy.ts (which handles incoming /api/* routing).
 * Use this from .astro frontmatter, API route handlers, or any worker code that
 * needs to talk to api.xaostech.io with proper CF-Access auth and cookie forwarding.
 *
 * Pattern:
 *   import { apiFetch, apiJson } from '@shared/types/api-client';
 *   const { keys } = await apiJson<{ keys: ApiKey[] }>('/account/keys', { request });
 */

import { env as cfEnv } from 'cloudflare:workers';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Astro/worker Request — used to forward cookies + trace headers. */
  request?: Request;
  /** Body. Objects are JSON-stringified automatically. */
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  /** Override base URL (defaults to https://api.xaostech.io). */
  baseUrl?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'upgrade',
  'keep-alive',
]);

/**
 * Low-level fetch — returns the raw Response. Caller handles parsing.
 */
export async function apiFetch(path: string, opts: ApiFetchOptions = {}): Promise<Response> {
  const env = cfEnv as Record<string, string | undefined>;
  const clientId = env.API_ACCESS_CLIENT_ID;
  const clientSecret = env.API_ACCESS_CLIENT_SECRET;
  const baseUrl = opts.baseUrl ?? 'https://api.xaostech.io';

  const headers = new Headers();

  // Forward inbound headers (cookies, user-agent, content-type) where present
  if (opts.request) {
    for (const [k, v] of opts.request.headers) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      headers.set(k, v);
    }
    const url = new URL(opts.request.url);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  }

  // Caller-supplied headers win
  if (opts.headers) {
    new Headers(opts.headers).forEach((v, k) => headers.set(k, v));
  }

  // CF Access auth (no fallbacks — fail loud if missing)
  if (clientId && clientSecret) {
    headers.set('CF-Access-Client-Id', clientId);
    headers.set('CF-Access-Client-Secret', clientSecret);
  } else {
    console.warn('[api-client] Missing API_ACCESS_CLIENT_ID/SECRET; calling without auth');
  }

  // Body normalisation
  let body: BodyInit | null | undefined;
  if (opts.body == null) {
    body = undefined;
  } else if (
    typeof opts.body === 'string' ||
    opts.body instanceof ArrayBuffer ||
    opts.body instanceof Uint8Array ||
    opts.body instanceof FormData ||
    opts.body instanceof URLSearchParams ||
    opts.body instanceof Blob ||
    opts.body instanceof ReadableStream
  ) {
    body = opts.body as BodyInit;
  } else {
    body = JSON.stringify(opts.body);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  return fetch(url, {
    method: opts.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
    redirect: opts.redirect ?? 'manual',
  });
}

/**
 * Convenience: parse JSON, throw ApiError on non-2xx.
 */
export async function apiJson<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // leave as text
    }
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText, parsed);
  return parsed as T;
}

/**
 * Convenience: try JSON, return { ok, status, data } — no throw.
 * Useful in SSR where you want to render an error state instead of 500.
 */
export async function apiTry<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null; error: unknown }> {
  try {
    const data = await apiJson<T>(path, opts);
    return { ok: true, status: 200, data, error: null };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, status: err.status, data: null, error: err.body };
    }
    return { ok: false, status: 0, data: null, error: err };
  }
}
