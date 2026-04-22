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
&& CLOUDFLARE_ENV=production npm run build
```

`shared/injectEnv.sh` exports `ASTRO_TELEMETRY_DISABLED=1` for the rest of the
build, so every CF Pages build of an Astro worker runs with telemetry off (CF
build environments have no persistent home directory, so a one-shot
`astro telemetry disable` would not stick between builds).

See:
- [`shared/injectEnv.sh`](../shared/injectEnv.sh)
- [`README.md(line 284)`](../docs/README.md#step-1-provide-cloudflare-build-secrets-preferred-or-regular-secrets-alternative)
