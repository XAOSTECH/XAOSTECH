/**
 * XAOSTECH Security Worker
 * 
 * Private security monitoring and management worker.
 * - Scans all XAOSTECH repos for Dependabot/CodeQL alerts
 * - Categorizes alerts by applicability
 * - Auto-closes non-applicable alerts
 * - Creates/manages security update PRs
 * - Acts as xaostech-security[bot] via GitHub App
 * 
 * ⚠️  DO NOT PUBLISH TO PUBLIC REPO
 */

import { Hono } from 'hono';
import { z } from 'zod';

// Environment bindings
interface Env {
    DB: D1Database;
    CACHE: KVNamespace;

    // GitHub App credentials
    GITHUB_APP_ID: string;
    GITHUB_APP_PRIVATE_KEY: string;
    GITHUB_INSTALLATION_ID: string;
    GITHUB_WEBHOOK_SECRET?: string;

    // Config
    GITHUB_ORG: string;
    ADMIN_API_KEY: string;
}

// Types
interface DependabotAlert {
    number: number;
    state: 'open' | 'dismissed' | 'fixed' | 'auto_dismissed';
    dependency: {
        package: { ecosystem: string; name: string };
        manifest_path: string;
        scope: 'runtime' | 'development';
    };
    security_advisory: {
        ghsa_id: string;
        cve_id: string | null;
        summary: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    };
    security_vulnerability: {
        package: { ecosystem: string; name: string };
        severity: string;
        vulnerable_version_range: string;
        first_patched_version: { identifier: string } | null;
    };
    created_at: string;
    updated_at: string;
    html_url: string;
}

interface Repository {
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
}

interface ApplicabilityRule {
    id: number;
    package_name: string | null;
    package_ecosystem: string | null;
    ghsa_id: string | null;
    cve_id: string | null;
    severity: string | null;
    is_applicable: number;
    reason: string;
    dismiss_reason: string | null;
    priority: number;
}

// GitHub App JWT generation
async function generateAppJWT(appId: string, privateKey: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const payload = {
        iat: now - 60,          // Issued 60 seconds ago (clock skew)
        exp: now + (10 * 60),   // Expires in 10 minutes
        iss: appId              // GitHub App ID
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Import the private key
    const pemContents = privateKey
        .replace('-----BEGIN RSA PRIVATE KEY-----', '')
        .replace('-----END RSA PRIVATE KEY-----', '')
        .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${signatureInput}.${encodedSignature}`;
}

// Get installation access token
async function getInstallationToken(env: Env): Promise<string> {
    // Check cache first
    const cached = await env.CACHE.get('github_installation_token');
    if (cached) {
        const { token, expires_at } = JSON.parse(cached);
        if (new Date(expires_at) > new Date(Date.now() + 60000)) {
            return token;
        }
    }

    const jwt = await generateAppJWT(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);

    const response = await fetch(
        `https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'xaostech-security-bot'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get installation token: ${response.status}`);
    }

    const data = await response.json() as { token: string; expires_at: string };

    // Cache for slightly less than 1 hour
    await env.CACHE.put('github_installation_token', JSON.stringify(data), { expirationTtl: 3500 });

    return data.token;
}

// GitHub API helper
async function githubAPI<T>(
    env: Env,
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getInstallationToken(env);

    const response = await fetch(`https://api.github.com${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'xaostech-security-bot',
            ...options.headers
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
}

// List all repos in org
async function listOrgRepos(env: Env): Promise<Repository[]> {
    const repos: Repository[] = [];
    let page = 1;

    while (true) {
        const batch = await githubAPI<Repository[]>(
            env,
            `/orgs/${env.GITHUB_ORG}/repos?per_page=100&page=${page}`
        );

        if (batch.length === 0) break;
        repos.push(...batch);
        page++;
    }

    return repos;
}

// Get Dependabot alerts for a repo
async function getDependabotAlerts(env: Env, repo: string): Promise<DependabotAlert[]> {
    try {
        return await githubAPI<DependabotAlert[]>(
            env,
            `/repos/${repo}/dependabot/alerts?state=open&per_page=100`
        );
    } catch (e) {
        // Some repos may not have Dependabot enabled
        console.warn(`Could not get alerts for ${repo}:`, e);
        return [];
    }
}

// Check alert applicability against rules
async function checkApplicability(
    env: Env,
    alert: DependabotAlert
): Promise<{ applicable: boolean; reason: string; dismissReason?: string }> {
    const rules = await env.DB.prepare(`
        SELECT * FROM applicability_rules 
        WHERE active = 1 
        ORDER BY priority DESC
    `).all<ApplicabilityRule>();

    for (const rule of rules.results || []) {
        // Check if rule matches
        const matches = (
            (rule.package_name === null || rule.package_name === alert.dependency.package.name) &&
            (rule.package_ecosystem === null || rule.package_ecosystem === alert.dependency.package.ecosystem) &&
            (rule.ghsa_id === null || rule.ghsa_id === alert.security_advisory.ghsa_id) &&
            (rule.cve_id === null || rule.cve_id === alert.security_advisory.cve_id) &&
            (rule.severity === null || rule.severity === alert.security_advisory.severity)
        );

        if (matches) {
            return {
                applicable: rule.is_applicable === 1,
                reason: rule.reason,
                dismissReason: rule.dismiss_reason || undefined
            };
        }
    }

    // Default: treat as applicable
    return { applicable: true, reason: 'No matching rule - treating as applicable' };
}

// Analyze alert for auto-dismissal
function analyzeAlertApplicability(alert: DependabotAlert): {
    applicable: boolean;
    reason: string;
    dismissReason?: 'fix_started' | 'inaccurate' | 'no_bandwidth' | 'not_used' | 'tolerable_risk';
} {
    const pkg = alert.dependency.package.name.toLowerCase();
    const ecosystem = alert.dependency.package.ecosystem;
    const scope = alert.dependency.scope;
    const advisory = alert.security_advisory;
    const summary = advisory.summary.toLowerCase();

    // ========================================
    // Hono-specific analysis
    // ========================================
    if (pkg === 'hono') {
        // JWK/JWT algorithm confusion - we use jose, not Hono's JWT middleware
        if (summary.includes('jwk') || summary.includes('jwt') || summary.includes('algorithm confusion')) {
            return {
                applicable: false,
                reason: 'We use jose library for JWT validation, not Hono JWT middleware',
                dismissReason: 'not_used'
            };
        }

        // Deno serveStatic - we run on CF Workers, not Deno
        if (summary.includes('servestatic') && summary.includes('deno')) {
            return {
                applicable: false,
                reason: 'Deno-specific vulnerability - we run on Cloudflare Workers',
                dismissReason: 'inaccurate'
            };
        }

        // CSRF middleware - check if we actually use it
        if (summary.includes('csrf')) {
            return {
                applicable: true,  // Need to verify usage
                reason: 'Review CSRF middleware usage in codebase'
            };
        }

        // Body limit bypass - we use CF's built-in limits
        if (summary.includes('body limit')) {
            return {
                applicable: false,
                reason: 'Cloudflare Workers has built-in request size limits',
                dismissReason: 'tolerable_risk'
            };
        }

        // TrieRouter named params - low risk for our use case
        if (summary.includes('trierouter') || summary.includes('named path parameters')) {
            return {
                applicable: false,
                reason: 'TrieRouter parameter override is low risk for our API design',
                dismissReason: 'tolerable_risk'
            };
        }

        // Vary header injection - CORS bypass is relevant
        if (summary.includes('vary header') || summary.includes('cors bypass')) {
            return {
                applicable: true,
                reason: 'CORS bypass could affect cross-origin security'
            };
        }
    }

    // ========================================
    // Wrangler - development only
    // ========================================
    if (pkg === 'wrangler') {
        if (scope === 'development') {
            return {
                applicable: false,
                reason: 'Wrangler is a development dependency, not deployed to production',
                dismissReason: 'not_used'
            };
        }
    }

    // ========================================
    // Zod DoS - need to check input validation
    // ========================================
    if (pkg === 'zod') {
        if (summary.includes('denial of service') || summary.includes('dos')) {
            return {
                applicable: true,
                reason: 'Zod DoS could affect API endpoints - verify input validation patterns'
            };
        }
    }

    // ========================================
    // General rules
    // ========================================

    // Development dependencies are lower priority
    if (scope === 'development') {
        return {
            applicable: false,
            reason: 'Development dependency - not deployed to production',
            dismissReason: 'not_used'
        };
    }

    // Critical/High severity - always applicable
    if (advisory.severity === 'critical' || advisory.severity === 'high') {
        return {
            applicable: true,
            reason: `${advisory.severity} severity - requires immediate attention`
        };
    }

    // Default: applicable, needs review
    return {
        applicable: true,
        reason: 'Requires manual review'
    };
}

// Dismiss an alert via GitHub API
async function dismissAlert(
    env: Env,
    repoFullName: string,
    alertNumber: number,
    reason: 'fix_started' | 'inaccurate' | 'no_bandwidth' | 'not_used' | 'tolerable_risk',
    comment: string
): Promise<void> {
    await githubAPI(
        env,
        `/repos/${repoFullName}/dependabot/alerts/${alertNumber}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                state: 'dismissed',
                dismissed_reason: reason,
                dismissed_comment: `[xaostech-security[bot]] ${comment}`
            })
        }
    );
}

// Store alert in database
async function storeAlert(env: Env, repo: Repository, alert: DependabotAlert, analysis: ReturnType<typeof analyzeAlertApplicability>): Promise<void> {
    await env.DB.prepare(`
        INSERT INTO alerts (
            github_alert_id, repo_name, repo_full_name,
            alert_type, state, severity,
            package_ecosystem, package_name, vulnerable_version, patched_version,
            ghsa_id, cve_id, summary, description,
            is_applicable, applicability_reason,
            github_created_at, github_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(repo_full_name, alert_type, github_alert_id) DO UPDATE SET
            state = excluded.state,
            is_applicable = excluded.is_applicable,
            applicability_reason = excluded.applicability_reason,
            last_checked_at = datetime('now')
    `).bind(
        alert.number,
        repo.name,
        repo.full_name,
        'dependabot',
        alert.state,
        alert.security_advisory.severity,
        alert.dependency.package.ecosystem,
        alert.dependency.package.name,
        alert.security_vulnerability.vulnerable_version_range,
        alert.security_vulnerability.first_patched_version?.identifier || null,
        alert.security_advisory.ghsa_id,
        alert.security_advisory.cve_id,
        alert.security_advisory.summary,
        alert.security_advisory.description,
        analysis.applicable ? 1 : 0,
        analysis.reason,
        alert.created_at,
        alert.updated_at
    ).run();
}

// Main scan function
async function runSecurityScan(env: Env, scanType: 'scheduled' | 'manual' | 'webhook' = 'scheduled'): Promise<{
    repos_scanned: number;
    alerts_found: number;
    alerts_auto_closed: number;
    applicable_alerts: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let reposScanned = 0;
    let alertsFound = 0;
    let alertsAutoClosed = 0;
    let applicableAlerts = 0;

    // Record scan start
    const scanResult = await env.DB.prepare(`
        INSERT INTO scan_history (scan_type) VALUES (?) RETURNING id
    `).bind(scanType).first<{ id: number }>();
    const scanId = scanResult?.id;

    try {
        const repos = await listOrgRepos(env);
        console.log(`Scanning ${repos.length} repositories...`);

        for (const repo of repos) {
            try {
                const alerts = await getDependabotAlerts(env, repo.full_name);
                reposScanned++;
                alertsFound += alerts.length;

                for (const alert of alerts) {
                    const analysis = analyzeAlertApplicability(alert);

                    // Store in database
                    await storeAlert(env, repo, alert, analysis);

                    if (analysis.applicable) {
                        applicableAlerts++;
                    } else if (analysis.dismissReason) {
                        // Auto-dismiss non-applicable alerts
                        try {
                            await dismissAlert(
                                env,
                                repo.full_name,
                                alert.number,
                                analysis.dismissReason,
                                analysis.reason
                            );
                            alertsAutoClosed++;

                            // Update database
                            await env.DB.prepare(`
                                UPDATE alerts SET 
                                    auto_closed = 1,
                                    auto_closed_at = datetime('now'),
                                    auto_closed_reason = ?
                                WHERE repo_full_name = ? AND github_alert_id = ? AND alert_type = 'dependabot'
                            `).bind(analysis.reason, repo.full_name, alert.number).run();

                            console.log(`Auto-closed: ${repo.full_name}#${alert.number} - ${analysis.reason}`);
                        } catch (e) {
                            errors.push(`Failed to dismiss ${repo.full_name}#${alert.number}: ${e}`);
                        }
                    }
                }
            } catch (e) {
                errors.push(`Failed to scan ${repo.full_name}: ${e}`);
            }
        }

        // Update scan record
        await env.DB.prepare(`
            UPDATE scan_history SET
                completed_at = datetime('now'),
                repos_scanned = ?,
                alerts_found = ?,
                alerts_auto_closed = ?,
                errors = ?,
                success = 1
            WHERE id = ?
        `).bind(
            reposScanned,
            alertsFound,
            alertsAutoClosed,
            errors.length > 0 ? JSON.stringify(errors) : null,
            scanId
        ).run();

    } catch (e) {
        errors.push(`Scan failed: ${e}`);

        await env.DB.prepare(`
            UPDATE scan_history SET
                completed_at = datetime('now'),
                errors = ?,
                success = 0
            WHERE id = ?
        `).bind(JSON.stringify(errors), scanId).run();
    }

    return {
        repos_scanned: reposScanned,
        alerts_found: alertsFound,
        alerts_auto_closed: alertsAutoClosed,
        applicable_alerts: applicableAlerts,
        errors
    };
}

// Hono app
const app = new Hono<{ Bindings: Env }>();

// Admin auth middleware
const adminAuth = async (c: any, next: () => Promise<void>) => {
    const key = c.req.header('X-Admin-Key') || c.req.query('key');
    if (key !== c.env.ADMIN_API_KEY) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
};

// Health check
app.get('/', (c) => {
    return c.json({
        service: 'xaostech-security',
        status: 'operational',
        note: 'Private security monitoring - do not expose publicly'
    });
});

// Manual scan trigger
app.post('/scan', adminAuth, async (c) => {
    const result = await runSecurityScan(c.env, 'manual');
    return c.json(result);
});

// Get current alerts summary
app.get('/alerts', adminAuth, async (c) => {
    const state = c.req.query('state') || 'open';
    const applicable = c.req.query('applicable');

    let query = `
        SELECT 
            repo_full_name,
            package_name,
            severity,
            summary,
            is_applicable,
            applicability_reason,
            github_alert_id,
            ghsa_id,
            cve_id,
            first_seen_at
        FROM alerts
        WHERE state = ?
    `;
    const params: any[] = [state];

    if (applicable !== undefined) {
        query += ' AND is_applicable = ?';
        params.push(applicable === 'true' ? 1 : 0);
    }

    query += ' ORDER BY severity DESC, first_seen_at DESC';

    const alerts = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
        count: alerts.results?.length || 0,
        alerts: alerts.results
    });
});

// Get scan history
app.get('/scans', adminAuth, async (c) => {
    const scans = await c.env.DB.prepare(`
        SELECT * FROM scan_history 
        ORDER BY started_at DESC 
        LIMIT 50
    `).all();

    return c.json(scans.results);
});

// Applicability rules management
app.get('/rules', adminAuth, async (c) => {
    const rules = await c.env.DB.prepare(`
        SELECT * FROM applicability_rules ORDER BY priority DESC
    `).all();
    return c.json(rules.results);
});

app.post('/rules', adminAuth, async (c) => {
    const body = await c.req.json();
    const schema = z.object({
        package_name: z.string().nullable().optional(),
        package_ecosystem: z.string().nullable().optional(),
        ghsa_id: z.string().nullable().optional(),
        cve_id: z.string().nullable().optional(),
        severity: z.string().nullable().optional(),
        is_applicable: z.number(),
        reason: z.string(),
        dismiss_reason: z.string().nullable().optional(),
        priority: z.number().default(0)
    });

    const rule = schema.parse(body);

    await c.env.DB.prepare(`
        INSERT INTO applicability_rules 
        (package_name, package_ecosystem, ghsa_id, cve_id, severity, is_applicable, reason, dismiss_reason, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        rule.package_name || null,
        rule.package_ecosystem || null,
        rule.ghsa_id || null,
        rule.cve_id || null,
        rule.severity || null,
        rule.is_applicable,
        rule.reason,
        rule.dismiss_reason || null,
        rule.priority
    ).run();

    return c.json({ success: true });
});

// Manually dismiss an alert
app.post('/alerts/:repo/:alertNumber/dismiss', adminAuth, async (c) => {
    const { repo, alertNumber } = c.req.param();
    const body = await c.req.json();
    const { reason, comment } = body;

    await dismissAlert(c.env, repo, parseInt(alertNumber), reason, comment);

    return c.json({ success: true });
});

// GitHub webhook handler (for real-time updates)
app.post('/webhook', async (c) => {
    // TODO: Verify webhook signature
    // const signature = c.req.header('X-Hub-Signature-256');

    const event = c.req.header('X-GitHub-Event');
    const body = await c.req.json();

    if (event === 'dependabot_alert') {
        // Handle new/updated alert
        console.log('Dependabot alert webhook:', body.action);
        // Trigger scan for specific repo
    }

    return c.json({ received: true });
});

// Stats endpoint
app.get('/stats', adminAuth, async (c) => {
    const stats = await c.env.DB.batch([
        c.env.DB.prepare(`SELECT COUNT(*) as total FROM alerts WHERE state = 'open'`),
        c.env.DB.prepare(`SELECT COUNT(*) as applicable FROM alerts WHERE state = 'open' AND is_applicable = 1`),
        c.env.DB.prepare(`SELECT COUNT(*) as auto_closed FROM alerts WHERE auto_closed = 1`),
        c.env.DB.prepare(`
            SELECT severity, COUNT(*) as count 
            FROM alerts WHERE state = 'open' AND is_applicable = 1
            GROUP BY severity
        `),
        c.env.DB.prepare(`
            SELECT repo_full_name, COUNT(*) as count 
            FROM alerts WHERE state = 'open' AND is_applicable = 1
            GROUP BY repo_full_name
            ORDER BY count DESC
        `)
    ]);

    return c.json({
        total_open: (stats[0].results?.[0] as any)?.total || 0,
        applicable_open: (stats[1].results?.[0] as any)?.applicable || 0,
        auto_closed_total: (stats[2].results?.[0] as any)?.auto_closed || 0,
        by_severity: stats[3].results,
        by_repo: stats[4].results
    });
});

export default {
    fetch: app.fetch,

    // Scheduled handler for cron triggers
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        console.log('Running scheduled security scan...');
        ctx.waitUntil(runSecurityScan(env, 'scheduled'));
    }
};
