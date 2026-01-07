# Shared Resources Organization

This folder contains shared resources used across all XAOSTECH projects.

## Structure

- **types/** - TypeScript types, utilities, and handlers
  - `api-proxy.ts` - Shared API proxy handler for Astro projects
  - `route-proxy.ts` - Shared route proxy handler for Astro/generic workers (maps path prefixes like `/portfolio` to target subdomains)
  - `api-proxy-hono.ts` - Hono-compatible API proxy
  - `route-proxy-hono.ts` - Hono-compatible route proxy
  
- **styles/** - Shared CSS/SCSS stylesheets
  
- **injectEnv.sh** - Build script for injecting environment variables during build

## Usage

### TypeScript Files

Import from the `types/` folder:

```typescript
import { createProxyHandler } from '../shared/types/api-proxy';
```

### Environment Injection

During build, the `injectEnv.sh` script injects build secrets as environment variables:

```bash
bash shared/injectEnv.sh
```

## Guidelines

- **TypeScript/JavaScript**: Place in `types/` folder
- **Styles**: Place in `styles/` folder  
- **Build Scripts**: Keep in root with descriptive names
- **Documentation**: Update this README when adding new resources
