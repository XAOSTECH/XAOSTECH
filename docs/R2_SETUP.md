# R2 Bucket Setup Guide

## Overview

XAOSTECH uses two R2 buckets for asset storage:
- **img**: Shared assets (XAOSTECH_LOGO.png, etc.) — accessible by all workers
- **blog-media**: Blog-specific media (images, PDFs, attachments) — blog worker only

## Bucket Configuration

### Buckets Exist
Both buckets are already created:

```bash
$ npx wrangler r2 bucket list
name:           blog-media
creation_date:  2026-01-01T23:26:10.829Z

name:           img
creation_date:  2025-12-31T19:34:09.943Z
```

### Bindings in wrangler.toml

All 9 workers have R2 bindings configured:

#### All Workers (IMG bucket)
```toml
[[env.production.r2_buckets]]
binding = "IMG"
bucket_name = "img"
```

#### Blog Worker (additional)
```toml
[[env.production.r2_buckets]]
binding = "BLOG_MEDIA"
bucket_name = "blog-media"
```

## Serving Assets

### Favicon (All Workers)

**In HTML layout**:
```html
<link rel="icon" type="image/png" href="/api/assets/XAOSTECH_LOGO.png" />
```

**Architecture**:
- Astro sites (xaostech.io, portfolio.xaostech.io): Request `/api/assets/XAOSTECH_LOGO.png`
- Middleware strips `/api` prefix, proxies to `api.xaostech.io/assets/XAOSTECH_LOGO.png`
- api.xaostech.io proxies to `data.xaostech.io/assets/XAOSTECH_LOGO.png` with service token
- data.xaostech.io serves from R2 IMG bucket

**Worker Route Handler** (example: api.xaostech.io):
```typescript
// In src/index.ts
app.get('/assets/:filename', async (c: any) => {
  const filename = c.req.param('filename');
  
  // Proxy to data worker with service token for inter-worker authentication
  const response = await fetch(`https://data.xaostech.io/assets/${filename}`, { 
        : url.pathname.replace(/^\/img\//, '');
      
      try {
        const object = await env.IMG.get(filename);
        if (object) {
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('Cache-Control', 'public, max-age=604800'); // 1 week
          return new Response(object.body, { headers });
        }
      } catch (err) {
        console.error(`Failed to serve image ${filename}:`, err);
      }
    }
    
    // Fall through to other routes...
  }
};
```

### Blog Media

**In blog worker**:
```typescript
// Serve blog attachments from R2
const mediaPath = '/media/' + filename;
const object = await env.BLOG_MEDIA.get(filename);

if (object) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=2592000'); // 30 days
  return new Response(object.body, { headers });
}
```

## Uploading Assets

### Upload XAOSTECH_LOGO.png to img bucket

```bash
# Using wrangler R2 CLI
npx wrangler r2 object put img/XAOSTECH_LOGO.png --file ./path/to/logo.png

# Using S3 API (AWS SDK, etc.)
aws s3 cp ./logo.png s3://img/XAOSTECH_LOGO.png \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --region auto
```

### Upload Blog Media

```bash
npx wrangler r2 object put blog-media/posts/2026-01-02-intro.pdf --file ./posts/intro.pdf
```

## Using R2 from Workers

### No Public URLs Needed

With bindings, workers serve directly from R2 **without** public bucket URLs:

```typescript
// ✅ GOOD: Use binding
const object = await env.IMG.get('XAOSTECH_LOGO.png');
return new Response(object.body);

// ❌ AVOID: Public URL (adds latency, requires bucket to be public)
const response = await fetch('https://img.example.r2.cloudflarestorage.com/XAOSTECH_LOGO.png');
```

**Efficiency Advantage**:
- Bindings = direct access, no HTTP round-trip
- Sub-millisecond latency (same origin)
- No need to expose bucket publicly
- Automatic authentication (account-level)

### Metadata Access

```typescript
const object = await env.IMG.get('XAOSTECH_LOGO.png');

// Read metadata
const contentType = object?.httpMetadata?.contentType; // 'image/png'
const size = object?.size; // bytes
const uploaded = object?.uploaded; // Date
```

## Cache Headers

Set appropriate cache times to minimize repeat requests:

```typescript
// Static assets: long cache (1 week)
headers.set('Cache-Control', 'public, max-age=604800, immutable');

// Dynamic content: short cache (1 hour)
headers.set('Cache-Control', 'public, max-age=3600');

// User-specific: no cache
headers.set('Cache-Control', 'private, no-cache');
```

## Bucket Limits

- **Storage**: 1 GB free tier (shared across all buckets)
- **Requests**: Unlimited (standard pricing applies)
- **Object size**: Up to 5 GB per object

For >1GB storage, upgrade to paid R2 ($0.015/GB/month).

## Security

### Access Control

- **By binding**: Only configured workers can access
- **account.xaostech.io** cannot access **blog-media** (different binding)
- **Other accounts** cannot access (Cloudflare account boundary)

### No Public URLs

Buckets are **private by default**. Workers serve via bindings:

```
Browser → Worker (public) → R2 (private) → Served via binding
```

Workers authenticate to R2 automatically; no credentials needed in code.

## Troubleshooting

### Image 404
**Cause**: File doesn't exist or worker route not configured
**Fix**: 
1. Verify file in bucket: `npx wrangler r2 object list img`
2. Check worker has IMG binding in wrangler.toml
3. Check route handler matches pathname

### Slow Images
**Cause**: Public URL instead of binding
**Fix**: Use `env.IMG.get()` instead of `fetch(public_url)`

### Permission Denied
**Cause**: Worker account doesn't have R2 permissions
**Fix**: Should not happen if binding is in wrangler.toml. Check worker is authenticated.

## Next Steps

1. Upload XAOSTECH_LOGO.png to **img** bucket
2. Test favicon loading: `xaostech.io` should show icon
3. Upload blog media as needed to **blog-media** bucket
4. Monitor usage: Cloudflare Dashboard → R2 → Buckets
