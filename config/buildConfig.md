```bash
# clone shared content for build (e.g. styles, types, build helper scripts)
git clone --depth 1 --filter=blob:none --sparse https://github.com/XAOSTECH/XAOSTECH.git ./shared.tmp && \
cd shared.tmp && \
git sparse-checkout set shared && \
cd .. && \
mv shared.tmp/shared . && \
rm -rf shared.tmp && \
bash shared/injectEnv.sh

# optional build (e.g. for Astro pages)
&& npm run build
```
See:
- [`shared/injectEnv.sh`](../shared/injectEnv.sh)
- [`README.md(line 284)`](../docs/README.md#step-1-provide-cloudflare-build-secrets-preferred-or-regular-secrets-alternative)
