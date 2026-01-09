# XAOSTECH Deployment Checklist

## Phase 1: Create GitHub OAuth App
- [ ] Go to https://github.com/settings/developers
- [ ] Create new OAuth App named "XAOSTECH Account"
- [ ] Set callback to `https://api.xaostech.io/auth/github/callback`
- [ ] Copy **Client ID** (looks like: `Ov23liRxwHybP9coz0vg`)
- [ ] Generate **Client Secret**
- [ ] Keep these safe - you'll need them in Phase 2

## Phase 2: Store Secrets in Cloudflare
```bash
cd /workspaces/PRO/WEB/IO/XAOSTECH/api.xaostech.io

# Set Client ID from GitHub OAuth App
wrangler secret put GITHUB_CLIENT_ID --env production
# [paste Client ID, press Enter]

# Set Client Secret from GitHub OAuth App
wrangler secret put GITHUB_CLIENT_SECRET --env production
# [paste Client Secret, press Enter]

# Verify both secrets are stored
wrangler secret list --env production
```

## Phase 3: Deploy Workers
```bash
cd /workspaces/PRO/WEB/IO/XAOSTECH

# Deploy API worker (now has GitHub OAuth secrets)
cd api.xaostech.io
npx wrangler deploy --env production

# Deploy account worker (simplified, no OAuth logic)
cd ../account.xaostech.io
npx wrangler deploy --env production

# Deploy other workers
cd ../chat.xaostech.io && npx wrangler deploy --env production
cd ../blog.xaostech.io && npx wrangler deploy --env production
cd ../lingua.xaostech.io && npx wrangler deploy --env production
cd ../payments.xaostech.io && npx wrangler deploy --env production
```

## Phase 4: Test OAuth Flow
1. Open https://account.xaostech.io
2. Click "Sign in with GitHub"
3. Authorize the app
4. Should redirect back to account.xaostech.io and show your profile with avatar
5. Test chat: https://chat.xaostech.io should show your avatar in messages
6. Test blog: https://blog.xaostech.io should show your avatar on posts

## Phase 5: Verify Session Behavior
```bash
# In browser console on chat.xaostech.io:
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)

# Should return:
# { authenticated: true, user: { id, username, email, avatar_url } }
```

## Phase 6: Configure SameSite Cookie (Chat OAuth Issue)
If chat shows "redirect loop" on OAuth, you need to change SameSite from Strict to Lax:
1. Go to Cloudflare Zero Trust Dashboard
2. Find chat.xaostech.io policy
3. Change SameSite cookie setting from "Strict" to "Lax"
4. Redeploy

## Rollback Plan (if something breaks)
1. If secrets are wrong: `wrangler secret delete GITHUB_CLIENT_ID --env production`
2. Redeploy API worker without the secrets
3. Users can't log in but app still works for guests
4. Fix and redeploy

## Architecture Summary
- **API worker** (api.xaostech.io): Handles all OAuth and user creation (PROTECTED)
- **Account worker** (account.xaostech.io): Displays user profile (PUBLIC)
- **Other workers**: Display user info from session cookie (PUBLIC)
- **Session cookie**: `session_id` set by API, read by all workers

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagram and philosophy.
