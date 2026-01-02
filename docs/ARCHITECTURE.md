# XAOSTECH Architecture

## Overview

XAOSTECH is a **distributed microservices platform** built on Cloudflare Workers, D1, KV, and R2. Nine specialized workers provide distinct capabilities, unified by shared infrastructure and type-safe bindings.

## Workers Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge (Global)                 │
├─────────────────────────────────────────────────────────────┤
│  xaostech.io      │ portfolio.xaostech.io                   │
│  (Webfront)       │ (Project Showcase)                      │
│  + AnimatedMenu   │ + PortfolioCollection                   │
└────────┬──────────┴──────────────────────────────────────────┘
         │
    ┌────┴────────────────────────────────────────────────────┐
    │                    API Gateway                           │
    │        (Routing, rate limiting, auth checks)            │
    └────┬───────────────────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────────────────────────┐
    │                  9 Microservices                        │
    ├──────┬────────┬────────┬─────────┬─────────┬──────────┤
    │Blog  │ Chat   │ Data   │ Account │ Lingua  │ Payments │
    │      │        │        │         │         │          │
    │D1    │ KV     │ D1     │ D1      │ KV+KV   │ D1       │
    │KV    │ -      │ KV     │ KV      │ -       │ -        │
    │R2    │ -      │ -      │ -       │ -       │ -        │
    └──────┴────────┴────────┴─────────┴─────────┴──────────┘
```

## Worker Responsibilities

| Worker | Purpose | Storage | Authentication |
|--------|---------|---------|---|
| **account** | OAuth 2.0, Sessions, User management | D1, KV (sessions) | Core auth provider |
| **api** | RESTful gateway, Rate limiting | D1 | Validates JWT from account |
| **blog** | Content CMS, Media hosting | D1, KV (cache), R2 (media) | Admin role check |
| **chat** | Real-time messaging, WebSocket | KV (messages) | Session validation |
| **data** | Privacy compliance, Consent mgmt | D1, KV (consent) | GDPR enforcement |
| **lingua** | Translation, Language processing | KV (translations), KV (cache) | API key validation |
| **payments** | Billing, Stripe integration | D1 | Account + webhook secret |
| **portfolio** | Project showcase, Collections | Static assets only | None (public) |
| **xaostech** | Main website, Navigation hub | R2 (img) | None (public) |

## Shared Resources

### KV Namespaces
- **sessions** (account.xaostech.io) - User session tokens
- **messages** (chat.xaostech.io) - Chat message history
- **consent** (data.xaostech.io) - User consent tracking
- **translations** (lingua.xaostech.io) - Cached translations
- **cache** (blog.xaostech.io, lingua.xaostech.io) - General-purpose cache
- **blog-media** - R2 bucket for blog attachments

### D1 Databases
- **account-db** - Users, sessions, OAuth providers
- **api-db** - API logs, rate limit counters
- **blog-db** - Posts, comments, metadata
- **data-db** - Consent records, privacy audit logs
- **payments-db** - Invoices, subscriptions, transactions

### R2 Buckets
- **img** - XAOSTECH_LOGO.png, shared assets (all workers)
- **blog-media** - Blog media: images, PDFs, attachments

## Inter-Worker Communication

### Pattern 1: Direct Fetch (Authenticated)
Workers call each other via internal routes. All requests are authenticated under XAOSTECH account:

```typescript
// In chat.xaostech.io worker
const sessionValid = await fetch('https://account.xaostech.io/validate-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Internal-Request': 'true'
  },
  body: JSON.stringify({ sessionId })
});
```

**Efficiency**: Workers are co-located on Cloudflare edge, request latency is sub-millisecond.

### Pattern 2: Shared KV (For Caching)
Workers share KV namespaces for loose coupling:

```typescript
// In chat.xaostech.io
const userConsent = await env.CONSENT_KV?.get(`user:${userId}:consent`);
```

**Efficiency**: Same-account KV reads are cached at edge, no cold starts.

### Pattern 3: Database Queries (Centralized)
Workers use their own D1 for isolated data. Cross-DB queries go through API gateway:

```typescript
// In blog worker
const userData = await fetch('https://api.xaostech.io/users/{id}');
```

**Rationale**: Each worker owns its data model; prevents cascading failures.

## Type Safety

All workers import from `src/types/common.ts`:

```typescript
import { BlogEnv, ApiResponse, ErrorResponse } from '../../../src/types/common';

export default {
  async fetch(request: Request, env: BlogEnv, ctx: ExecutionContext): Promise<Response> {
    // env.DB, env.CACHE_KV, env.BLOG_MEDIA fully typed
    const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?1').bind(postId).first();
    return new Response(JSON.stringify({ success: true, data: post }));
  }
};
```

**Benefits**:
- Catch binding errors at build time, not runtime
- IDE autocomplete for all workers
- Refactoring bindings updates all uses atomically

## Deployment Model

1. **Build** (`build.sh`): Injects environment variable IDs into placeholders
2. **Auto-provisioning**: wrangler v4.54.0+ creates resources if missing
3. **Bindings**: All IDs resolved at runtime from environment
4. **Idempotent**: Can redeploy without manual intervention

See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

## Security Boundaries

- **Public**: portfolio, xaostech (no auth needed)
- **Authenticated**: All API workers validate JWT or session
- **Internal**: Workers trust other workers (same account)
- **Secrets**: Stripe key, OAuth secrets in Cloudflare vault (not in code)

## Future Patterns

- **Durable Objects**: For stateful services (presence, locking)
- **Analytics Engine**: Custom metrics via Workers Analytics
- **Queue**: Async job processing (email, webhooks)
- **Submodules**: Shared code in separate Git repo if helpers grow
