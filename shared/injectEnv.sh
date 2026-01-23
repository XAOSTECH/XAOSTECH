#!/usr/bin/env bash
# Inject build environment variables into wrangler.toml at build time
# Add Astro-compatible API proxy path for Astro workers
set -e
echo "Injecting environment variables..."
sed -i "s/\${KV_SESSIONS_ID}/${KV_SESSIONS_ID}/g" "wrangler.toml"
sed -i "s/\${KV_MESSAGES_ID}/${KV_MESSAGES_ID}/g" "wrangler.toml"
sed -i "s/\${KV_CONSENT_ID}/${KV_CONSENT_ID}/g" "wrangler.toml"
sed -i "s/\${KV_TRANSLATIONS_ID}/${KV_TRANSLATIONS_ID}/g" "wrangler.toml"
sed -i "s/\${KV_LEARNED_WORDS_ID/${KV_LEARNED_WORDS_ID}/g" "wrangler.toml"
sed -i "s/\${KV_CACHE_ID}/${KV_CACHE_ID}/g" "wrangler.toml"
sed -i "s/\${KV_BLOG_MEDIA_ID}/${KV_BLOG_MEDIA_ID}/g" "wrangler.toml"
sed -i "s/\${D1_ACCOUNT_DB_ID}/${D1_ACCOUNT_DB_ID}/g" "wrangler.toml"
sed -i "s/\${D1_API_DB_ID}/${D1_API_DB_ID}/g" "wrangler.toml"
sed -i "s/\${D1_BLOG_DB_ID}/${D1_BLOG_DB_ID}/g" "wrangler.toml"
sed -i "s/\${D1_DATA_DB_ID}/${D1_DATA_DB_ID}/g" "wrangler.toml"
sed -i "s/\${D1_PAYMENTS_DB_ID}/${D1_PAYMENTS_DB_ID}/g" "wrangler.toml"
sed -i "s/\${KV_EXERCISES_ID}/${KV_EXERCISES_ID}/g" "wrangler.toml"
sed -i "s/\${KV_PROGRESS_ID}/${KV_PROGRESS_ID}/g" "wrangler.toml"
sed -i "s/\${D1_EDU_DB_ID}/${D1_EDU_DB_ID}/g" "wrangler.toml"
echo "✓ Build secrets loaded"
set -x
if [ -f "astro.config.mjs" ]; then
  echo "Syncing shared pages and routes for Astro workers"
    mkdir -p "src/pages/api"
    mv "shared/pages/api/[...path].ts" "src/pages/api/"
    mv "shared/pages/favicon.ico.ts" "src/pages/" 
fi
rm -r "shared/pages"