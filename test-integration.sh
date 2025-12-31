#!/bin/bash

# XAOSTECH Full Webflow Test Suite
# Run this after: npm run dev:all (which starts all workers in parallel)

echo "🚀 XAOSTECH Integration Tests"
echo "================================"

# Port mapping (wrangler assigns ports sequentially)
DATA_PORT=8787
AUTH_PORT=8788
API_PORT=8789
LINGUA_PORT=8790
CHAT_PORT=8791
PAYMENTS_PORT=8792
XAOSTECH_PORT=3000
PORTFOLIO_PORT=3001

echo ""
echo "📍 Service URLs:"
echo "  data.xaostech.io:      http://localhost:$DATA_PORT"
echo "  account.xaostech.io:      http://localhost:$AUTH_PORT"
echo "  api.xaostech.io:       http://localhost:$API_PORT"
echo "  lingua.xaostech.io:    http://localhost:$LINGUA_PORT"
echo "  chat.xaostech.io:      http://localhost:$CHAT_PORT"
echo "  payments.xaostech.io:  http://localhost:$PAYMENTS_PORT"
echo "  xaostech.io (Astro):   http://localhost:$XAOSTECH_PORT"
echo "  portfolio (Astro):     http://localhost:$PORTFOLIO_PORT"

echo ""
echo "1️⃣  Testing Data Worker (Privacy & Cookies)"
echo "─────────────────────────────────────────"
echo "GET privacy policy:"
curl -s http://localhost:$DATA_PORT/ | head -c 100
echo ""
echo ""
echo "POST consent:"
curl -s -X POST http://localhost:$DATA_PORT/api/consent \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","accepted":true,"categories":["analytics"]}' | jq .
echo ""

echo "2️⃣  Testing Account Worker (OAuth & Sessions)"
echo "──────────────────────────────────────────"
echo "GET health:"
curl -s http://localhost:$AUTH_PORT/health | jq .
echo ""
echo "POST callback (mock OAuth):"
curl -s -X POST http://localhost:$AUTH_PORT/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_auth_code_123"}' | jq .
echo ""

echo "3️⃣  Testing API Worker (Tasks CRUD)"
echo "───────────────────────────────────"
echo "GET health:"
curl -s http://localhost:$API_PORT/health | jq .
echo ""
echo "POST task:"
curl -s -X POST http://localhost:$API_PORT/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Build v2","description":"Complete architecture refactor"}' | jq .
echo ""
echo "GET tasks:"
curl -s http://localhost:$API_PORT/tasks | jq . | head -20
echo ""

echo "4️⃣  Testing Lingua Worker (Translation Caching)"
echo "───────────────────────────────────────────────"
echo "POST translate (first call):"
TRANS1=$(curl -s -X POST http://localhost:$LINGUA_PORT/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world","from":"en","to":"fr"}')
echo "$TRANS1" | jq .
CACHE_STATUS1=$(echo "$TRANS1" | jq -r '.headers."X-Cache" // "N/A"')
echo "Cache status: $CACHE_STATUS1"
echo ""
echo "POST translate (same query, should be cached):"
TRANS2=$(curl -s -X POST http://localhost:$LINGUA_PORT/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world","from":"en","to":"fr"}')
echo "$TRANS2" | jq .
CACHE_STATUS2=$(echo "$TRANS2" | jq -r '.headers."X-Cache" // "N/A"')
echo "Cache status: $CACHE_STATUS2"
echo ""

echo "5️⃣  Testing Chat Worker (Messaging)"
echo "────────────────────────────────────"
echo "POST message:"
curl -s -X POST http://localhost:$CHAT_PORT/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","message":"Hello from test"}' | jq .
echo ""
echo "GET messages:"
curl -s http://localhost:$CHAT_PORT/messages/user1 | jq .
echo ""

echo "6️⃣  Testing Payments Worker (Stripe Webhook Stub)"
echo "──────────────────────────────────────────────────"
echo "POST webhook (payment_intent.succeeded):"
curl -s -X POST http://localhost:$PAYMENTS_PORT/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_123"}}}' | jq .
echo ""

echo "7️⃣  Testing Cross-Worker Interaction (Account → Profile)"
echo "──────────────────────────────────────────────────────"
echo "Get session from account, then fetch profile:"
SESSION=$(curl -s -X POST http://localhost:$AUTH_PORT/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test123"}' | jq -r '.session_id')
echo "Session ID: $SESSION"
echo ""
echo "Use session to fetch profile:"
curl -s http://localhost:$AUTH_PORT/profile \
  -H "Authorization: Bearer $SESSION" | jq .
echo ""

echo "✅ Test Suite Complete!"
echo ""
echo "📝 Manual Testing Tips:"
echo "  • Open http://localhost:$XAOSTECH_PORT to view landing page (Astro)"
echo "  • Open http://localhost:$PORTFOLIO_PORT to view portfolio (Astro)"
echo "  • Check browser DevTools → Application → Cookies to inspect cookie headers"
echo "  • Watch terminal output for [wrangler:info] logs from each worker"
echo ""
echo "🔗 To test cookie sharing across workers (production):"
echo "  • Add to /etc/hosts: 127.0.0.1 xaostech.io data.xaostech.io account.xaostech.io"
echo "  • Configure Cloudflare to route subdomains to respective workers"
echo "  • Cookies with Domain=.xaostech.io will share across all subdomains"
