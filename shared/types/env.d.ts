// Shared runtime environment types for XAOSTECH workers

/**
 * Recommended runtime secrets:
 * - API_ACCESS_CLIENT_ID / API_ACCESS_CLIENT_SECRET  -> used by frontends/proxies to authenticate to `api.xaostech.io`
 * - DATA_ACCESS_CLIENT_ID / DATA_ACCESS_CLIENT_SECRET  -> used by `api.xaostech.io` to authenticate to `data.xaostech.io`
 *
 * Backwards-compatibility: existing 'CF_ACCESS_CLIENT_ID' / 'CF_ACCESS_CLIENT_SECRET' are also accepted.
 * For scaling/multi-service patterns consider using SERVICE_{NAME}_ACCESS_CLIENT_ID / _SECRET patterns.
 */
export interface ProxyEnv {
  // Backward compatible names
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;

  // New, prefer these for clarity
  API_ACCESS_CLIENT_ID?: string;
  API_ACCESS_CLIENT_SECRET?: string;

  DATA_ACCESS_CLIENT_ID?: string;
  DATA_ACCESS_CLIENT_SECRET?: string;

  [key: string]: any;
}

// Optional: helpers for Astro Pages runtime typing (kept minimal)
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CF_ACCESS_CLIENT_ID?: string;
      CF_ACCESS_CLIENT_SECRET?: string;
      API_ACCESS_CLIENT_ID?: string;
      API_ACCESS_CLIENT_SECRET?: string;
      DATA_ACCESS_CLIENT_ID?: string;
      DATA_ACCESS_CLIENT_SECRET?: string;
    }
  }
}

export {};
