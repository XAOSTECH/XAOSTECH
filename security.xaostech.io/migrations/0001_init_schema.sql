-- Security alerts tracking database
-- Tracks all Dependabot alerts, CodeQL findings, and security PRs

-- Core alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- GitHub identifiers
    github_alert_id INTEGER NOT NULL,
    repo_name TEXT NOT NULL,
    repo_full_name TEXT NOT NULL,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('dependabot', 'codeql', 'secret_scanning')),
    state TEXT NOT NULL CHECK (state IN ('open', 'dismissed', 'fixed', 'auto_dismissed')),
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    
    -- Package/vulnerability info
    package_ecosystem TEXT,
    package_name TEXT,
    vulnerable_version TEXT,
    patched_version TEXT,
    
    -- Advisory info
    ghsa_id TEXT,
    cve_id TEXT,
    summary TEXT,
    description TEXT,
    
    -- Applicability analysis
    is_applicable INTEGER DEFAULT 1,  -- 1 = applicable, 0 = not applicable
    applicability_reason TEXT,         -- Why it's applicable or not
    
    -- Our actions
    auto_closed INTEGER DEFAULT 0,
    auto_closed_at TEXT,
    auto_closed_reason TEXT,
    
    pr_created INTEGER DEFAULT 0,
    pr_number INTEGER,
    pr_url TEXT,
    
    -- Timestamps
    github_created_at TEXT,
    github_updated_at TEXT,
    first_seen_at TEXT DEFAULT (datetime('now')),
    last_checked_at TEXT DEFAULT (datetime('now')),
    
    -- Unique constraint
    UNIQUE(repo_full_name, alert_type, github_alert_id)
);

-- Applicability rules
-- Define rules for auto-dismissing alerts that don't apply to our stack
CREATE TABLE IF NOT EXISTS applicability_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Match criteria (NULL = match any)
    package_name TEXT,
    package_ecosystem TEXT,
    ghsa_id TEXT,
    cve_id TEXT,
    severity TEXT,
    
    -- Rule details
    is_applicable INTEGER NOT NULL,   -- 0 = not applicable, 1 = applicable
    reason TEXT NOT NULL,             -- Explanation shown when closing
    dismiss_reason TEXT,              -- GitHub dismiss reason: fix_started, inaccurate, no_bandwidth, not_used, tolerable_risk
    
    -- Rule priority (higher = checked first)
    priority INTEGER DEFAULT 0,
    
    -- Active flag
    active INTEGER DEFAULT 1,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Security PRs we've created or managed
CREATE TABLE IF NOT EXISTS security_prs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    repo_full_name TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url TEXT NOT NULL,
    pr_state TEXT CHECK (pr_state IN ('open', 'closed', 'merged')),
    
    -- Related alerts (JSON array of alert IDs)
    related_alert_ids TEXT,
    
    -- PR details
    title TEXT,
    body TEXT,
    head_branch TEXT,
    base_branch TEXT,
    
    -- Tracking
    created_by_bot INTEGER DEFAULT 1,
    auto_merge_enabled INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    merged_at TEXT,
    
    UNIQUE(repo_full_name, pr_number)
);

-- Scan history for audit trail
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    scan_type TEXT NOT NULL CHECK (scan_type IN ('scheduled', 'manual', 'webhook')),
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    
    -- Results
    repos_scanned INTEGER DEFAULT 0,
    alerts_found INTEGER DEFAULT 0,
    alerts_auto_closed INTEGER DEFAULT 0,
    prs_created INTEGER DEFAULT 0,
    
    -- Errors
    errors TEXT,  -- JSON array of error messages
    
    success INTEGER DEFAULT 1
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_alerts_repo ON alerts(repo_full_name);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_applicable ON alerts(is_applicable);
CREATE INDEX IF NOT EXISTS idx_rules_active ON applicability_rules(active, priority DESC);

-- Insert default applicability rules for known non-applicable scenarios
INSERT OR IGNORE INTO applicability_rules (package_name, package_ecosystem, is_applicable, reason, dismiss_reason, priority) VALUES
    -- Deno-specific vulnerabilities don't apply to CF Workers
    ('hono', 'npm', 1, 'Hono is our web framework - check if specific vulnerability applies', NULL, 10),
    
    -- Development dependencies - lower priority but still track
    (NULL, NULL, 1, 'Default: treat all alerts as applicable until reviewed', NULL, -1);
