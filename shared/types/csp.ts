// CSP relaxation utility for Astro sites that need inline scripts/styles
// Used by portfolio.xaostech.io and xaostech.io during migration to nonce-based CSP

export function relaxCspForInline(headers: Headers): void {
  const existingCsp = headers.get('Content-Security-Policy') || '';
  const tokens = "'unsafe-inline' 'unsafe-hashes'";

  if (existingCsp) {
    const directives = existingCsp.split(';').map(d => d.trim()).filter(Boolean);
    const hasScript = directives.some(d => d.startsWith('script-src'));
    const hasStyle = directives.some(d => d.startsWith('style-src'));

    const updated = directives.map(d => {
      if (d.startsWith('script-src')) return d + ' ' + tokens;
      if (d.startsWith('style-src')) return d + ' ' + tokens;
      return d;
    });

    if (!hasScript) updated.push(`script-src 'self' https: ${tokens}`);
    if (!hasStyle) updated.push(`style-src 'self' https: ${tokens}`);

    headers.set('Content-Security-Policy', updated.join('; '));
  } else {
    headers.set('Content-Security-Policy', `script-src 'self' https: ${tokens}; style-src 'self' https: ${tokens}`);
  }
}
