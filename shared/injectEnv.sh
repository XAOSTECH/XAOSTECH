#!/bin/bash
# Inject build environment variables into wrangler.toml at build time

set -e

# Get the worker directory (current directory when called from Cloudflare)
WRANGLER_FILE="wrangler.toml"

if [ ! -f "$WRANGLER_FILE" ]; then
  echo "⚠️  wrangler.toml not found in $PWD"
  exit 0
fi

echo "Injecting environment variables..."

# Replace ${VAR} with value from build environment
sed -i "s/\${KV_SESSIONS_ID}/${KV_SESSIONS_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${KV_MESSAGES_ID}/${KV_MESSAGES_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${KV_CONSENT_ID}/${KV_CONSENT_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${KV_TRANSLATIONS_ID}/${KV_TRANSLATIONS_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${KV_CACHE_ID}/${KV_CACHE_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${KV_BLOG_MEDIA_ID}/${KV_BLOG_MEDIA_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${D1_ACCOUNT_DB_ID}/${D1_ACCOUNT_DB_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${D1_API_DB_ID}/${D1_API_DB_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${D1_BLOG_DB_ID}/${D1_BLOG_DB_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${D1_DATA_DB_ID}/${D1_DATA_DB_ID}/g" "$WRANGLER_FILE"
sed -i "s/\${D1_PAYMENTS_DB_ID}/${D1_PAYMENTS_DB_ID}/g" "$WRANGLER_FILE"

echo "✓ Build secrets loaded"