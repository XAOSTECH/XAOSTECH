#!/bin/bash
# Create Cloudflare KV and D1 resources for xaostech.io v2
# ⚠️  ONE-TIME SETUP ONLY - DO NOT RE-RUN ONCE LIVE WITH DATA
# Re-running after going live may overwrite existing databases!
# Requires: wrangler CLI + CF authentication
# Usage: ./create-cf-resources.sh [--soft|--hard|--secrets]
#   --soft (default): Skip existing resources, create and upload secrets
#   --hard: Recreate all resources, create and upload secrets
#   --secrets: Only fetch IDs and upload secrets (no resource creation)

set -e

MODE="${1:-soft}"
# Strip leading dashes
MODE="${MODE#--}"
MODE="${MODE#-}"

# Disable Cloudflare telemetry and auto-respond to prompts
export WRANGLER_SEND_METRICS=false
export CLOUDFLARE_METRICS_DISABLED=true

if [ "$MODE" != "soft" ] && [ "$MODE" != "hard" ] && [ "$MODE" != "secrets" ]; then
  echo "Usage: $0 [--soft|--hard|--secrets]"
  echo "  --soft (default): Skip existing resources, create and upload secrets"
  echo "  --hard: Recreate all resources, create and upload secrets"
  echo "  --secrets: Only fetch IDs and upload secrets (no resource creation)"
  exit 1
fi

echo "🚀 Cloudflare Resources for xaostech.io v2 (MODE: $MODE)"
echo "=========================================================="
echo ""
if [ "$MODE" = "hard" ]; then
  echo "⚠️  WARNING: HARD MODE - Will recreate existing resources!"
  echo "Do NOT use this once you have live data in these databases!"
elif [ "$MODE" = "secrets" ]; then
  echo "✓ SECRETS MODE - Fetching IDs and uploading secrets only"
else
  echo "✓ SOFT MODE - Skipping existing resources"
fi
echo ""

# Check wrangler is available
if ! command -v npx &> /dev/null; then
  echo "❌ npm/npx not found. Please install Node.js"
  exit 1
fi

echo "Checking wrangler..."
npx wrangler --version
echo ""

# Only create resources if not in secrets-only mode
if [ "$MODE" != "secrets" ]; then
  echo "Creating KV Namespaces..."
  echo "─────────────────────────"

  KV_NAMESPACES=(
    "sessions"
    "messages"
    "consent"
    "translations"
    "cache"
    "blog-media"
    "exercises"
    "progress"
  )

  for ns in "${KV_NAMESPACES[@]}"; do
    if [ "$MODE" = "soft" ]; then
      EXISTING=$(npx wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title==\"$ns\") | .id" 2>/dev/null)
      if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
        echo "  ⊘ $ns (already exists)"
        continue
      fi
    fi
    
    echo "  Creating KV: $ns (production)"
    npx wrangler kv namespace create "$ns" 2>/dev/null || true
    echo "  Creating KV: $ns (preview)"
    npx wrangler kv namespace create "$ns" --preview 2>/dev/null || true
  done

  echo ""
  echo "Creating D1 Databases..."
  echo "────────────────────────"

  D1_DBS=(
    "account-db"
    "api-db"
    "blog-db"
    "data-db"
    "payments-db"
    "edu-db"
  )

  for db in "${D1_DBS[@]}"; do
    if [ "$MODE" = "soft" ]; then
      EXISTING=$(npx wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$db\") | .uuid" 2>/dev/null)
      if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
        echo "  ⊘ $db (already exists)"
        continue
      fi
    fi
    
    echo "  Creating D1: $db"
    npx wrangler d1 create "$db" 2>/dev/null || true
  done
  
  echo ""
fi

echo "Fetching KV namespace IDs..."
echo "───────────────────────────"

# Get actual KV namespace IDs from Cloudflare
declare -A KV_IDS

KV_NAMESPACES=(
  "sessions"
  "messages"
  "consent"
  "translations"
  "cache"
  "blog-media"
  "exercises"
  "progress"
)

for ns in "${KV_NAMESPACES[@]}"; do
  ID=$(npx wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title==\"$ns\") | .id" 2>/dev/null)
  if [ -n "$ID" ] && [ "$ID" != "null" ]; then
    KV_IDS["$ns"]="$ID"
    echo "  ✓ $ns: $ID"
  else
    echo "  ✗ $ns: NOT FOUND (may not exist yet)"
  fi
done

echo ""
echo "Fetching D1 database IDs..."
echo "───────────────────────────"

declare -A D1_IDS

D1_DBS=(
  "account-db"
  "api-db"
  "blog-db"
  "data-db"
  "payments-db"
  "edu-db"
)

for db in "${D1_DBS[@]}"; do
  ID=$(npx wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$db\") | .uuid" 2>/dev/null)
  if [ -n "$ID" ] && [ "$ID" != "null" ]; then
    D1_IDS["$db"]="$ID"
    echo "  ✓ $db: $ID"
  else
    echo "  ✗ $db: NOT FOUND (may not exist yet)"
  fi
done

echo ""
echo "✅ Cloudflare Build Environment Variables"
echo "═════════════════════════════════════════════════════"
echo ""
echo "Set these in Cloudflare Dashboard for each Worker:"
echo "Workers & Pages → [Worker Name] → Settings → Build & Deploy → Environment variables"
echo ""
echo "KV Namespace IDs:"
echo "─────────────────"
[ -n "${KV_IDS[sessions]}" ] && echo "  KV_SESSIONS_ID = ${KV_IDS[sessions]}"
[ -n "${KV_IDS[messages]}" ] && echo "  KV_MESSAGES_ID = ${KV_IDS[messages]}"
[ -n "${KV_IDS[consent]}" ] && echo "  KV_CONSENT_ID = ${KV_IDS[consent]}"
[ -n "${KV_IDS[translations]}" ] && echo "  KV_TRANSLATIONS_ID = ${KV_IDS[translations]}"
[ -n "${KV_IDS[cache]}" ] && echo "  KV_CACHE_ID = ${KV_IDS[cache]}"
[ -n "${KV_IDS[blog-media]}" ] && echo "  KV_BLOG_MEDIA_ID = ${KV_IDS[blog-media]}"
[ -n "${KV_IDS[exercises]}" ] && echo "  KV_EXERCISES_ID = ${KV_IDS[exercises]}"
[ -n "${KV_IDS[progress]}" ] && echo "  KV_PROGRESS_ID = ${KV_IDS[progress]}"

echo ""
echo "D1 Database IDs:"
echo "────────────────"
[ -n "${D1_IDS[account-db]}" ] && echo "  D1_ACCOUNT_DB_ID = ${D1_IDS[account-db]}"
[ -n "${D1_IDS[api-db]}" ] && echo "  D1_API_DB_ID = ${D1_IDS[api-db]}"
[ -n "${D1_IDS[blog-db]}" ] && echo "  D1_BLOG_DB_ID = ${D1_IDS[blog-db]}"
[ -n "${D1_IDS[data-db]}" ] && echo "  D1_DATA_DB_ID = ${D1_IDS[data-db]}"
[ -n "${D1_IDS[payments-db]}" ] && echo "  D1_PAYMENTS_DB_ID = ${D1_IDS[payments-db]}"
[ -n "${D1_IDS[edu-db]}" ] && echo "  D1_EDU_DB_ID = ${D1_IDS[edu-db]}"

echo ""
echo "Build script to inject IDs into wrangler.toml:"
echo "──────────────────────────────────────────────"
echo ""
echo "Place in your build command (before deploy):"
echo ""
echo "#!/bin/bash"
echo "# Inject environment variables into wrangler.toml"
echo ""

for ns in "${!KV_IDS[@]}"; do
  upper_ns=$(echo "$ns" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
  echo "sed -i 's|id = \"\${KV_${upper_ns}_ID}\"|id = \"${KV_IDS[$ns]}\"|g' */wrangler.toml"
done

for db in "${!D1_IDS[@]}"; do
  upper_db=$(echo "$db" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
  echo "sed -i 's|database_id = \"\${D1_${upper_db}_ID}\"|database_id = \"${D1_IDS[$db]}\"|g' */wrangler.toml"
done

echo ""
echo "Or update wrangler.toml manually with these IDs:"
echo ""
echo "Example for account worker:"
echo "  [[env.production.kv_namespaces]]"
echo "  binding = \"SESSIONS_KV\""
echo "  id = \"${KV_IDS[sessions]}\""
echo ""
echo "  [[env.production.d1_databases]]"
echo "  binding = \"DB\""
echo "  database_name = \"account-db\""
echo "  database_id = \"${D1_IDS[account-db]}\""
echo ""
if [ "$MODE" != "secrets" ]; then
  echo "⚠️  DO NOT RE-RUN THIS SCRIPT once deployed with live data"
fi
