# Deployment Guide

## Overview

XAOSTECH uses **build-time environment variable injection** to support idempotent deployments in ephemeral Cloudflare build containers. This avoids hardcoding resource IDs in git while enabling auto-provisioning to work safely.

## Build Process

### 1. Build Script (`build.sh`)

Located in each worker directory, runs before deploy:

```bash
#!/bin/bash
# Inject build environment variables into wrangler.toml at build time

WRANGLER_FILE="wrangler.toml"

# Replace placeholders with actual IDs from environment
[ -n "$KV_CACHE_ID" ] && sed -i "s|id = \"\${KV_CACHE_ID}\"|id = \"$KV_CACHE_ID\"|g" "$WRANGLER_FILE"
[ -n "$D1_BLOG_DB_ID" ] && sed -i "s|database_id = \"\${D1_BLOG_DB_ID}\"|database_id = \"$D1_BLOG_DB_ID\"|g" "$WRANGLER_FILE"
```

**Before**:
```toml
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "${KV_CACHE_ID}"
```

**After build script**:
```toml
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "78b2e3869a244a588136f524a4cc5fba"
```

### 2. Environment Variables

Set **build environment variables** in Cloudflare dashboard:

**Cloudflare Dashboard → Workers & Pages → [Worker] → Settings → Build & Deploy**

#### Example: blog.xaostech.io

| Variable | Value |
|----------|-------|
| `KV_CACHE_ID` | `78b2e3869a244a588136f524a4cc5fba` |
| `D1_BLOG_DB_ID` | `97a50f2f-ef83-4c1c-bc99-30be9113e7d4` |

#### All Workers' Variables

**account.xaostech.io**:
- `KV_SESSIONS_ID` = `e5eeddc2433d4bd09d01855103f54d61`
- `D1_ACCOUNT_DB_ID` = `a3325401-e1ff-4e4d-9d5a-7f23b2452f40`

**api.xaostech.io**:
- `D1_API_DB_ID` = `64fe567c-28ed-4bd8-a4a1-511d0d4d4466`

**blog.xaostech.io**:
- `KV_CACHE_ID` = `78b2e3869a244a588136f524a4cc5fba`
- `D1_BLOG_DB_ID` = `97a50f2f-ef83-4c1c-bc99-30be9113e7d4`

**chat.xaostech.io**:
- `KV_MESSAGES_ID` = `0876e682c23942f0aba9bf919bc02fce`

**data.xaostech.io**:
- `KV_CONSENT_ID` = `ebb454c2fb3042a4a81b8c11fc482a31`
- `D1_DATA_DB_ID` = `1d278064-7476-4f9a-b2b1-76dc9edab124`

**lingua.xaostech.io**:
- `KV_TRANSLATIONS_ID` = `5411ebdbf5104d4c9cbd8e73088b5ff2`
- `KV_CACHE_ID` = `78b2e3869a244a588136f524a4cc5fba`

**payments.xaostech.io**:
- `D1_PAYMENTS_DB_ID` = `998fda65-ba88-4875-b5e5-6959df9d7e29`

**portfolio.xaostech.io**, **xaostech.io**:
- (No D1/KV bindings, only R2 for assets — no vars needed)

### 3. Build Command

Set in Cloudflare dashboard for **each worker**:

```
bash build.sh && npx wrangler deploy --env production
```

**Character limit**: 512 characters (well under limit at ~50 chars)

### 4. Deployment Flow

```
1. Cloudflare detects git push to main branch
   ↓
2. Pulls repo + installs dependencies (bun install)
   ↓
3. Runs build command: bash build.sh
   ↓
4. build.sh reads env vars from dashboard, injects into wrangler.toml
   ↓
5. npx wrangler deploy --env production executes
   ↓
6. wrangler sees binding IDs already populated
   ↓
7. Auto-provisioning: checks if resources exist
   ├─ If missing: creates them
   └─ If exists: uses existing (idempotent)
   ↓
8. Worker deployed, bindings active
```

## Idempotency Guarantee

**Why it works**:
- Resource IDs stored in build environment (Cloudflare dashboard, not git)
- Each build injects same IDs → wrangler sees same config
- wrangler's auto-provisioning only creates resources if missing
- Re-deploying same code with same env vars = no changes

**Example**:
1. Deploy blog → `KV_CACHE_ID` injected → creates cache namespace
2. Push empty commit → runs build again → same `KV_CACHE_ID` injected → auto-provisioning sees it exists → skips creation ✓

## Manual Deployment

If you need to deploy locally without Cloudflare CI:

```bash
# Option 1: Set env vars and deploy
cd blog.xaostech.io
export KV_CACHE_ID="78b2e3869a244a588136f524a4cc5fba"
export D1_BLOG_DB_ID="97a50f2f-ef83-4c1c-bc99-30be9113e7d4"
bash ../build.sh
npx wrangler deploy --env production

# Option 2: Edit wrangler.toml directly (not recommended for CI)
# Manually replace placeholders, then deploy
npx wrangler deploy --env production
```

## Troubleshooting

### Build Fails: "Variable not found"
**Cause**: Environment variable not set in dashboard
**Fix**: Add variable to dashboard → Settings → Build & Deploy

### Deploy Fails: "Binding ID is not valid"
**Cause**: Placeholder not replaced (build script didn't run)
**Fix**: Check build command is set correctly: `bash build.sh && npx wrangler deploy --env production`

### Deploy Fails: "Resource already exists"
**Cause**: Auto-provisioning tried to create resource that exists
**Fix**: Rare with v4.54.0+. Ensure build vars match actual resource IDs.

### Favicon/Image 404
**Cause**: IMG binding not configured or R2 bucket doesn't exist
**Fix**: See [R2_SETUP.md](R2_SETUP.md)

## Next Steps

1. ✅ Set build environment variables in Cloudflare dashboard (one per worker)
2. ✅ Set build command in each worker's dashboard: `bash build.sh && npx wrangler deploy --env production`
3. ✅ Push to main branch to trigger first build
4. Monitor logs: Cloudflare Dashboard → Worker → Deployments
