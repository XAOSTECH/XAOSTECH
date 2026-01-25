# ⚠️ PRIVATE - DO NOT PUBLISH PUBLICLY

# security.xaostech.io

**Private security monitoring worker for XAOSTECH organization.**

This worker monitors and manages security alerts across all XAOSTECH repositories:

- 🔍 **Scans** all repos for Dependabot alerts, CodeQL findings, and secret scanning
- 🧠 **Analyzes** alert applicability (e.g., Deno-only vulns don't affect CF Workers)
- 🤖 **Auto-dismisses** non-applicable alerts with proper reasoning
- 📊 **Tracks** all alerts in D1 database for audit trail
- 🔔 **Notifies** (via webhook) for applicable high/critical alerts

## Hono Vulnerabilities Analysis

Based on our stack (Cloudflare Workers + Hono):

| Alert | Applicable? | Reason |
|-------|-------------|--------|
| JWK/JWT Algorithm Confusion | ❌ No | We use `jose` library, not Hono's JWT middleware |
| JWT HS256 Default | ❌ No | We use `jose` library for JWT validation |
| serveStatic Deno traversal | ❌ No | Deno-specific, we run on CF Workers |
| CSRF No Content-Type | ⚠️ Review | Check if we use CSRF middleware |
| Body Limit Bypass | ❌ No | CF Workers has built-in limits |
| TrieRouter Param Override | ❌ No | Low risk for our API design |
| Vary Header / CORS Bypass | ✅ Yes | Could affect cross-origin security |
| CSRF crafted Content-Type | ⚠️ Review | Check CSRF middleware usage |

## Wrangler Vulnerability

| Alert | Applicable? | Reason |
|-------|-------------|--------|
| Directory Traversal | ❌ No | Development dependency only |

## Zod Vulnerability

| Alert | Applicable? | Reason |
|-------|-------------|--------|
| DoS | ⚠️ Review | Check input validation patterns |

## Setup

### 1. Create GitHub App

1. Go to https://github.com/organizations/XAOSTECH/settings/apps
2. Create new GitHub App:
   - Name: `xaostech-security`
   - Webhook: `https://security.xaostech.io/webhook` (or disable initially)
   - Permissions:
     - Repository permissions:
       - Dependabot alerts: Read and write
       - Contents: Read
       - Pull requests: Read and write
       - Secret scanning alerts: Read and write
       - Code scanning alerts: Read
   - Subscribe to events: `dependabot_alert`, `code_scanning_alert`
3. Generate and download private key
4. Install app on XAOSTECH organization

### 2. Create Resources

```bash
# Create D1 database
wrangler d1 create security-alerts

# Create KV namespace
wrangler kv:namespace create CACHE

# Update wrangler.toml with the IDs
```

### 3. Set Secrets

```bash
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_PRIVATE_KEY  # Paste the PEM content
wrangler secret put GITHUB_INSTALLATION_ID
wrangler secret put ADMIN_API_KEY  # Generate a strong random key
```

### 4. Run Migrations

```bash
wrangler d1 execute security-alerts --file=migrations/0001_init_schema.sql
```

### 5. Deploy

```bash
npm run deploy
```

## API Endpoints

All endpoints (except `/` and `/webhook`) require `X-Admin-Key` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/scan` | Trigger manual scan |
| GET | `/alerts` | List alerts (query: `state`, `applicable`) |
| GET | `/scans` | Scan history |
| GET | `/rules` | List applicability rules |
| POST | `/rules` | Add applicability rule |
| POST | `/alerts/:repo/:alertNumber/dismiss` | Manually dismiss alert |
| GET | `/stats` | Dashboard statistics |
| POST | `/webhook` | GitHub webhook receiver |

## Scheduled Scans

Runs automatically every 6 hours via cron trigger.

## Bot Identity

Actions taken by this worker appear as `xaostech-security[bot]` in GitHub:
- Alert dismissals include `[xaostech-security[bot]]` prefix in comments
- PRs created by the bot show the GitHub App identity

## Security

- **DO NOT** publish this repo publicly
- **DO NOT** commit the GitHub App private key
- The worker should be deployed to a private route or protected by Cloudflare Access
- Admin API key should be strong and rotated regularly
