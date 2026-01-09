// Shared runtime environment types for XAOSTECH workers

/**
 * Runtime secrets naming convention:
 * - API_ACCESS_CLIENT_ID / API_ACCESS_CLIENT_SECRET  -> used by frontends/proxies to authenticate to `api.xaostech.io`
 * - DATA_ACCESS_CLIENT_ID / DATA_ACCESS_CLIENT_SECRET  -> used by `api.xaostech.io` to authenticate to `data.xaostech.io`
 *
 * For multi-service patterns consider using SERVICE_{NAME}_ACCESS_CLIENT_ID / _SECRET patterns.
 */

// Cloudflare Service Binding interface
interface Fetcher {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

export interface ProxyEnv {
  // API worker credentials
  API_ACCESS_CLIENT_ID?: string;
  API_ACCESS_CLIENT_SECRET?: string;

  // Data worker credentials  
  DATA_ACCESS_CLIENT_ID?: string;
  DATA_ACCESS_CLIENT_SECRET?: string;

  // Service bindings (worker-to-worker)
  DATA?: Fetcher;

  [key: string]: any;
}

// Optional: helpers for Astro Pages runtime typing (kept minimal)
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_ACCESS_CLIENT_ID?: string;
      API_ACCESS_CLIENT_SECRET?: string;
      DATA_ACCESS_CLIENT_ID?: string;
      DATA_ACCESS_CLIENT_SECRET?: string;
    }
  }
}

export {};
