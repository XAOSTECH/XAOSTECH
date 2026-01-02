# XAOSTECH

<!-- Project Shields/Badges -->
<p align="center">
  <a href="https://github.com/XAOSTECH/XAOSTECH">
    <img alt="GitHub repo" src="https://img.shields.io/badge/GitHub-XAOSTECH%2F-XAOSTECH-181717?style=for-the-badge&logo=github">
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/releases">
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/XAOSTECH/XAOSTECH?style=for-the-badge&logo=semantic-release&color=blue">
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/XAOSTECH/XAOSTECH?style=for-the-badge&color=green">
  </a>
</p>

<p align="center">
  <a href="https://github.com/XAOSTECH/XAOSTECH/actions">
    <img alt="CI Status" src="https://github.com/XAOSTECH/XAOSTECH/actions/workflows/bash-lint.yml/badge.svg?branch=Main>
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/issues">
    <img alt="Issues" src="https://img.shields.io/github/issues/XAOSTECH/XAOSTECH?style=flat-square&logo=github&color=yellow">
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/pulls">
    <img alt="Pull Requests" src="https://img.shields.io/github/issues-pr/XAOSTECH/XAOSTECH?style=flat-square&logo=github&color=purple">
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/stargazers">
    <img alt="Stars" src="https://img.shields.io/github/stars/XAOSTECH/XAOSTECH?style=flat-square&logo=github&color=gold">
  </a>
  <a href="https://github.com/XAOSTECH/XAOSTECH/network/members">
    <img alt="Forks" src="https://img.shields.io/github/forks/XAOSTECH/XAOSTECH?style=flat-square&logo=github">
  </a>
</p>

<p align="center">
  <img alt="Last Commit" src="https://img.shields.io/github/last-commit/XAOSTECH/XAOSTECH?style=flat-square&logo=git&color=blue">
  <img alt="Repo Size" src="https://img.shields.io/github/repo-size/XAOSTECH/XAOSTECH?style=flat-square&logo=files&color=teal">
  <img alt="Code Size" src="https://img.shields.io/github/languages/code-size/XAOSTECH/XAOSTECH?style=flat-square&logo=files&color=orange">
  <img alt="Contributors" src="https://img.shields.io/github/contributors/XAOSTECH/XAOSTECH?style=flat-square&logo=github&color=green">
</p>

<!-- Optional: Stability/Maturity Badge -->
<p align="center">
  <img alt="Stability" src="https://img.shields.io/badge/stability-stable-green?style=flat-square">
  <img alt="Maintenance" src="https://img.shields.io/maintenance/yes/2025?style=flat-square">
</p>

---

<p align="center">
  <b>Production-ready monorepo: 8 Cloudflare Workers + 2 Astro sites</b>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [What's New](#-whats-new)
- [Quick Start](#-quick-start)
- [Services](#-services)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

XAOSTECH is a **production-ready monorepo** featuring:
- 🔧 **8 Cloudflare Workers** (API, auth, blog, privacy, chat, translation, payments)
- 🎨 **2 Astro Sites** (landing page, 3D portfolio)
- 🔐 **GDPR-Compliant Cookie Management** (first-party, consent tracking)
- 📝 **Full-Featured Blog** (posts, walls, comments, media uploads)
- 📊 **Unified Deployment** (npm scripts for all services)

All services are **public on GitHub** with automated submodule setup.

---

## ✨ What's New (January 2026)

### Blog Platform (blog.xaostech.io)
- 📝 Post management with draft/publish workflow
- 💬 Message walls with inline comment threads
- 🎙️ Audio & image uploads (R2 storage)
- 📊 Quota tracking (5GB free tier/month)
- 👮 Admin moderation dashboard

### GDPR Compliance (data.xaostech.io)
- 🍪 First-party cookies (.xaostech.io domain)
- ✅ Consent management API
- 📋 Data access & deletion requests
- 🔒 Audit trails for all operations
- 🌍 GDPR Articles 15-22 compliance

### Deployment Fixes
- ✅ Resolved all wrangler.toml errors
- 📖 Complete deployment guide (see [DEPLOYMENT.md](DEPLOYMENT.md))
- 🚀 Ready for production (after Cloudflare ID setup)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start All Services (Local Dev)
```bash
npm run dev:all
# Starts 8 workers on ports 8787-8793 + 2 Astro on 3000-3001
```

### 3. Run Integration Tests
```bash
bash test-integration.sh
```

### 4. Deploy to Production
```bash
# Fill Cloudflare IDs first (see DEPLOYMENT.md)
npm run deploy:all
```

---

## 🏢 Services

| Service | Purpose | Tech Stack | Status |
|---------|---------|-----------|--------|
| **api.xaostech.io** | Task CRUD API | Hono, D1 | ✅ Production |
| **account.xaostech.io** | Authentication & profiles | Hono, D1, KV | ✅ Production |
| **blog.xaostech.io** | Posts, comments, media | Hono, D1, R2, KV | ✨ Featured |
| **data.xaostech.io** | GDPR, cookies, privacy | Hono, D1, KV | ✨ Featured |
| **chat.xaostech.io** | Messaging & real-time | Hono, KV | ✅ Production |
| **lingua.xaostech.io** | Translation service | Hono, OpenAI, KV | ✅ Production |
| **payments.xaostech.io** | Stripe integration | Hono, D1 | ✅ Production |
| **xaostech.io** | Marketing landing | Astro | ✅ Production |
| **portfolio.xaostech.io** | 3D showcase | Astro, Three.js | ✅ Production |

---

## ✨ Features

- 🚀 **Serverless Architecture** - All on Cloudflare Workers (no servers to manage)
- 🔐 **GDPR-Compliant** - First-party cookies, consent tracking, data rights
- 📝 **Full-Featured Blog** - Posts, walls, comments, media uploads with R2 storage
- 💬 **Real-Time Messaging** - KV-backed chat system
- 🌐 **Multi-Language** - OpenAI-powered translation with caching
- 💳 **Payment Processing** - Stripe webhook integration
- 📊 **Media Management** - R2 storage with quota tracking (5GB free tier)
- 🔄 **Zero-Trust Security** - Public repos, secrets in Cloudflare only

---

## 📥 Installation

### Prerequisites
- Node.js 20+ (or Bun 1.2+)
- Cloudflare account with API token
- Git (with submodule support)

### Quick Start

```bash
# Clone with all submodules
git clone --recurse-submodules https://github.com/XAOSTECH/XAOSTECH.git
cd XAOSTECH

# Install all dependencies
npm run install:all

# Start all services locally
npm run dev:all

# Run integration tests
bash test-integration.sh
```

### Deployment

```bash
# First: Fill Cloudflare IDs in wrangler.toml files
# See DEPLOYMENT.md for step-by-step instructions

# Then deploy all workers & sites
npm run deploy:all
```

---

## 🚀 Usage

### Local Development

```bash
# Start specific worker
cd api.xaostech.io && npm run dev

# Start Astro site
cd xaostech.io && npm run dev
```

### Testing

```bash
# Full integration test (all workers + APIs)
bash test-integration.sh

# Test cross-worker communication (auth → API → data)
curl http://localhost:8788/callback  # auth worker
curl http://localhost:8789/tasks     # api worker
```

### Production Workflows

<details>
<summary>📘 Deploy Blog Worker</summary>

```bash
cd blog.xaostech.io
wrangler secret put R2_API_KEY
wrangler secret put ACCOUNT_ID
npm run deploy
```

</details>

<details>
<summary>📗 Migrate Media to R2</summary>

```bash
# Blog worker automatically stores new uploads in R2
# Set quota in environment variables (see IMPLEMENTATION_SUMMARY.md)
wrangler secret put R2_BUCKET_NAME
wrangler secret put QUOTA_GB=5  # 5GB free tier
```

</details>

---

## 🔐 Zero-Trust Architecture

**All repos are public. Secrets stay private. Here's how:**

### Why Public Repos + Secrets Work Together

```
GitHub Public Repo          Cloudflare Dashboard (Private)
├─ /api/index.ts           ├─ STRIPE_KEY (encrypted)
├─ /blog/index.ts          ├─ R2_API_KEY (encrypted)
├─ wrangler.toml           ├─ OPENAI_API_KEY (encrypted)
└─ (NO secrets here!)       └─ D1 database ID (encrypted)
     ↓                           ↓
  Anyone can audit        Only workers can read at runtime
  Never gets secrets      Client never sees these
```

At deploy time, `wrangler deploy --env production` sends your secrets securely to Cloudflare. Workers read them as `env.STRIPE_KEY` at runtime. **Browser never sees them.**

### How R2 Storage Fits In (Common Practice)

Blog worker needs to:
1. ✅ Validate user has upload permission (auth token)
2. ✅ Check file size vs user quota (query D1)
3. ✅ Store file in R2 (use env.R2_API_KEY secret)
4. ✅ Return signed URL (time-limited, auto-expires)

```typescript
// blog.xaostech.io worker code (never exposed publicly)
const file = await request.arrayBuffer();
const bucket = env.R2_BUCKET_NAME;  // secret from Cloudflare
const url = await bucket.put(`blog/${postId}/photo.jpg`, file);
```

**This is standard.** Vercel, AWS, Render all use this pattern: secrets on server, client gets only the URL.

---

## ⚙️ Configuration & Deployment

### Step 1: Provide Cloudflare build secrets (preferred) or regular secrets (alternative)

We prefer using Cloudflare **Build Secrets** (see [Cloudflare documentation](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)) and the repository's build-time injection flow. The build command (see [`config/buildConfig.md`](../config/buildConfig.md)) clones shared content and runs [`shared/injectEnv.sh`](../shared/injectEnv.sh), which injects the required Cloudflare IDs into each worker's `wrangler.toml` at build time.

#### Alternative: set regular worker secrets through dashboard or CLI

```bash
wrangler secret put D1_DATABASE_ID          # From Cloudflare dashboard
wrangler secret put STRIPE_WEBHOOK_SECRET   # From Stripe dashboard
wrangler secret put R2_BUCKET_NAME          # Your R2 bucket name
wrangler secret put R2_API_KEY              # Generated in Cloudflare
```

### Step 2: Update wrangler.toml

Each worker's `wrangler.toml` has a template section:

```toml
name = "xaostech-api"
compatibility_date = "2026-01-01"
main = "src/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "api-db"
database_id = ""  # ← Fill with YOUR Cloudflare ID

[env.production]
routes = [{ pattern = "api.xaostech.io/*", zone_name = "xaostech.io" }]
vars = { ENVIRONMENT = "production" }
```

Find database IDs in Cloudflare → D1 → Click each DB → copy ID.

### Step 3: Deploy All Workers

```bash
npm run deploy:all
# Deploys: api, account, blog, data, chat, lingua, payments
```

### Step 4: Test in Production

```bash
npm run test:prod
# Verifies workers are live and routes work
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed walkthrough.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**DEPLOYMENT.md**](DEPLOYMENT.md) | Fill IDs & deploy checklist |
| [IMPLEMENTATION_SUMMARY.md](.tmp/IMPLEMENTATION_SUMMARY.md) | Full architecture |
| [COOKIES_GDPR.md](.tmp/COOKIES_GDPR_IMPLEMENTATION.md) | Privacy details |
| [ACCOUNT_PLAN.md](.tmp/ACCOUNT_MANAGEMENT_PLAN.md) | Next phase roadmap |

**Service READMEs:**
- [api.xaostech.io](api.xaostech.io/README.md) — Task CRUD API
- [account.xaostech.io](account.xaostech.io/README.md) — Auth & profiles  
- [blog.xaostech.io](blog.xaostech.io/README.md) — Posts, comments, R2 media
- [data.xaostech.io](data.xaostech.io/README.md) — GDPR & cookies

---

## 🤝 Contributing

**Fork → Feature Branch → PR:**

```bash
git checkout -b feature/my-feature
git commit -m "Add feature"
git push origin feature/my-feature
# Open PR on GitHub
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

Code of Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)  
Security Policy: [SECURITY.md](SECURITY.md)

---

## 📄 License

Licensed under MIT. See [LICENSE](LICENSE).

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/XAOSTECH/XAOSTECH/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XAOSTECH/XAOSTECH/discussions)
- **Email**: contact@xaostech.io

---

<p align="center">
  Built with Cloudflare Workers | Zero-Trust | Public Code, Secure Secrets
</p>

<p align="center">
  <a href="#XAOSTECH">⬆️ Back to Top</a>
</p>