# XAOSTECH Architecture: Unified API-Centric OAuth

## Philosophy

All API logic (except proprietary payment logic) is centralized in the **API worker**, which is protected by Cloudflare Access Policy. This enables:
- **Future public API access** for automation and building
- **Programmatic account creation** for authorized users
- **Security** by keeping secrets behind access policy
- **Cleaner separation of concerns** - each worker has one responsibility

## Architecture Diagram

```
Public Internet
      ↓
   GitHub OAuth
      ↓
api.xaostech.io (PROTECTED BY CLOUDFLARE ACCESS POLICY)
├─ /api/auth/github/login          ← Start OAuth flow
├─ /api/auth/github/callback       ← Receive GitHub code
├─ /api/auth/me                    ← Get current user
├─ /api/auth/logout                ← Clear session
├─ GITHUB_CLIENT_ID (SECRET)       ← Encrypted in Cloudflare
├─ GITHUB_CLIENT_SECRET (SECRET)   ← Encrypted in Cloudflare
├─ SESSION KV (stores session_id)  ← Sets session_id cookie
└─ D1 Database (users table)        ← Stores user profiles
      ↓
   Redirects to account.xaostech.io with session_id cookie
      ↓
account.xaostech.io (NOT PROTECTED - PUBLIC)
├─ GET /                  ← Display dashboard
├─ GET /me                ← Read session, return user data
├─ POST /verify           ← Validate session (called by API)
├─ GET /profile           ← User profile page
└─ No secrets stored here ← Only reads session cookies
      ↓
Other workers (chat, blog, etc.)
├─ Read session_id cookie
├─ Call /api/auth/me to get user info
├─ Display avatar, username, etc.
└─ No direct DB access
```

## Session Flow

### 1. Login
```
1. User clicks "Sign in with GitHub" on account.xaostech.io
2. account.xaostech.io links to /api/auth/github/login
3. API worker (protected) starts OAuth:
   - Generates state token
   - Redirects to GitHub authorization
   - Sets gh_oauth_state cookie
4. User grants permission on GitHub.com
5. GitHub redirects to /api/auth/github/callback with code
6. API worker exchanges code for access token
7. API worker fetches user profile from GitHub API
8. API worker creates/updates user in D1 database
9. API worker creates session_id and stores in SESSION KV
10. API worker sets session_id cookie and redirects to account.xaostech.io
11. account.xaostech.io reads session_id cookie
12. User sees their profile with avatar
```

### 2. Authenticated Requests
```
Frontend (chat, blog, etc.)
    ↓
Fetch /api/auth/me (browser sends session_id cookie automatically)
    ↓
API worker reads session_id from cookie
    ↓
API worker fetches user from D1 database
    ↓
Returns { authenticated: true, user: { id, username, email, avatar_url } }
    ↓
Frontend displays user avatar and username
```

## Worker Responsibilities

| Worker | Responsibility | Secrets | Access Policy |
|--------|---|---|---|
| **api.xaostech.io** | OAuth flow, user creation, session management, API logic | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | ✅ Protected |
| **account.xaostech.io** | Display user profile, account settings | None | ❌ Public |
| **chat.xaostech.io** | Real-time chat UI | None | ❌ Public |
| **blog.xaostech.io** | Blog posts, comments | None | ❌ Public |
| **data.xaostech.io** | Media storage, R2 access | R2 credentials | ✅ Protected |

## Security Benefits

### Why API handles OAuth (not account worker):

1. **Secrets protected by access policy** - GITHUB_CLIENT_SECRET never exposed
2. **Centralized sensitive operations** - user creation, session generation in one place
3. **Audit trail** - all auth events logged in protected worker
4. **Scalable future API** - can add rate limiting, admin controls, public access tiers
5. **Account worker stays simple** - just displays, doesn't process secrets

### Session Security

- **session_id cookie**: `HttpOnly` (JS can't steal it), `Secure` (HTTPS only), `SameSite=Lax` (prevents CSRF)
- **State tokens**: Short-lived, validated before token exchange
- **HTTPS only**: All cookies require secure transport
- **Session expiration**: 7-day TTL in KV with automatic cleanup

## Deployment: Set GitHub OAuth Secrets

Once you create your GitHub OAuth App (see instructions below):

```bash
cd /workspaces/PRO/WEB/IO/XAOSTECH/api.xaostech.io

# Store your GitHub OAuth App credentials securely in Cloudflare
wrangler secret put GITHUB_CLIENT_ID --env production
# Paste your Client ID (starts with "Ov23...")

wrangler secret put GITHUB_CLIENT_SECRET --env production
# Paste your Client Secret

# Verify secrets are stored
wrangler secret list --env production

# Deploy API worker with secrets
wrangler deploy --env production
```

## GitHub OAuth App Setup

1. Go to: https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `XAOSTECH Account`
   - **Homepage URL**: `https://account.xaostech.io`
   - **Application description**: `User authentication for XAOSTECH`
   - **Authorization callback URL**: `https://api.xaostech.io/auth/github/callback`
4. Copy **Client ID** and generate **Client Secret**
5. Run commands above to store secrets

## Future Extensibility

This architecture supports future features:

```typescript
// Public API signup (future)
POST /api/accounts { email, username, password }

// Admin API access (future)
GET /api/accounts?role=admin (restricted by access policy)

// Programmatic account creation (future)
POST /api/accounts { email, name } (restricted to trusted partners)

// OAuth for third-party apps (future)
POST /api/auth/oauth/authorize (delegate auth to XAOSTECH)
```

All of these can be implemented in the API worker without touching other workers.

## FAQs

**Q: Why can't account worker handle OAuth?**
A: It's not behind access policy, so secrets would be exposed to the public internet. API is protected, making it the safe choice.

**Q: Can I make API public in the future?**
A: Yes! Just remove the access policy and add authentication/rate limiting in the worker code.

**Q: What if I want OAuth providers other than GitHub?**
A: Add more routes to API: `/api/auth/google/login`, `/api/auth/okta/login`, etc. Account worker stays unchanged.

**Q: How do I revoke a session?**
A: Call `DELETE /session/:sessionId` (API worker) which deletes from SESSION KV, or user waits for 7-day expiry.
