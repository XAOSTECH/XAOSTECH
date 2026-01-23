/**
 * =============================================================================
 * XAOSTECH Shared - Sanitisation Library
 * =============================================================================
 * Provides comprehensive input sanitisation to prevent XSS, injection, and
 * other security vulnerabilities across all workers.
 * 
 * Addresses CodeQL warnings:
 * - js/incomplete-multi-character-sanitisation
 * - CWE-20, CWE-80, CWE-116
 * 
 * Usage:
 *   import { sanitise, sanitiseHtml, sanitisePath, sanitiseMarkup } from '../shared/types/sanitise';
 * =============================================================================
 */

// =============================================================================
// HTML SANITIZATION
// =============================================================================

/**
 * Removes all HTML tags by repeatedly applying replacement until stable
 * Prevents incomplete sanitisation attacks like "<scr<script>ipt>"
 */
export function sanitiseHtml(input: string): string {
    if (!input) return '';

    let previous: string;
    let result = input;

    // Apply until no more changes (handles nested/malformed tags)
    do {
        previous = result;
        // Remove complete tags
        result = result.replace(/<[^>]*>/g, '');
        // Remove any orphaned angle brackets
        result = result.replace(/[<>]/g, '');
    } while (result !== previous);

    return result;
}

/**
 * Escape HTML entities instead of removing (preserves content)
 */
export function escapeHtml(input: string): string {
    if (!input) return '';

    const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;',
    };

    return input.replace(/[&<>"'`=/]/g, char => entities[char] || char);
}

/**
 * Remove script tags and event handlers - comprehensive XSS prevention
 */
export function sanitiseScript(input: string): string {
    if (!input) return '';

    let previous: string;
    let result = input;

    do {
        previous = result;
        // Remove script tags (handles obfuscation like <scr<script>ipt>)
        result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        result = result.replace(/<script[^>]*>/gi, '');
        result = result.replace(/<\/script>/gi, '');
        // Remove event handlers (onclick, onerror, onload, etc.)
        result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
        result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
        // Remove javascript: and data: URLs
        result = result.replace(/javascript\s*:/gi, '');
        result = result.replace(/data\s*:\s*text\/html/gi, '');
        result = result.replace(/vbscript\s*:/gi, '');
    } while (result !== previous);

    return result;
}

// =============================================================================
// PATH SANITIZATION
// =============================================================================

/**
 * Sanitise file paths to prevent directory traversal attacks
 */
export function sanitisePath(input: string): string {
    if (!input) return '';

    let previous: string;
    let result = input;

    do {
        previous = result;
        // Remove directory traversal sequences
        result = result.replace(/\.\.\//g, '');
        result = result.replace(/\.\.\\/g, '');
        result = result.replace(/\.\.$/g, '');
        // Remove URL-encoded traversal
        result = result.replace(/%2e%2e%2f/gi, '');
        result = result.replace(/%2e%2e\//gi, '');
        result = result.replace(/\.\.%2f/gi, '');
        result = result.replace(/%2e%2e%5c/gi, '');
        // Remove null bytes
        result = result.replace(/\0/g, '');
        result = result.replace(/%00/g, '');
    } while (result !== previous);

    return result;
}

/**
 * Sanitise filename - removes unsafe characters
 */
export function sanitiseFilename(input: string): string {
    if (!input) return '';

    return input
        // Remove path components
        .replace(/^.*[\\\/]/, '')
        // Remove unsafe characters
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        // Remove leading/trailing dots and spaces
        .replace(/^[\s.]+|[\s.]+$/g, '')
        // Limit length
        .substring(0, 255);
}

// =============================================================================
// WIKI/MARKUP SANITIZATION
// =============================================================================

/**
 * Clean MediaWiki/Wikipedia markup safely
 * Handles nested brackets and prevents injection
 */
export function sanitiseMarkup(input: string): string {
    if (!input) return '';

    let previous: string;
    let result = input;

    do {
        previous = result;

        // Remove wiki links: [[link|display]] -> display, [[link]] -> link
        result = result.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
        result = result.replace(/\[\[([^\]]+)\]\]/g, '$1');

        // Remove templates: {{template}} (handles nesting)
        result = result.replace(/\{\{[^{}]*\}\}/g, '');

        // Remove categories: [[Category:...]]
        result = result.replace(/\[\[Category:[^\]]*\]\]/gi, '');

        // Remove file/image links: [[File:...]]
        result = result.replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '');

        // Remove ref tags: <ref>...</ref>
        result = result.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
        result = result.replace(/<ref[^>]*\/>/gi, '');

    } while (result !== previous);

    // Final HTML sanitisation
    result = sanitiseHtml(result);

    // Clean up whitespace
    return result.replace(/\s+/g, ' ').trim();
}

// =============================================================================
// SQL SANITIZATION (for parameterized query building)
// =============================================================================

/**
 * Escape SQL special characters
 * NOTE: Always prefer parameterized queries over string escaping
 */
export function escapeSql(input: string): string {
    if (!input) return '';

    return input
        .replace(/'/g, "''")
        .replace(/\\/g, '\\\\')
        .replace(/\x00/g, '')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z');
}

/**
 * Sanitise SQL identifier (table/column names)
 */
export function sanitiseSqlIdentifier(input: string): string {
    if (!input) return '';

    // Only allow alphanumeric and underscores
    return input.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
}

// =============================================================================
// JSON SANITIZATION
// =============================================================================

/**
 * Safely parse JSON with size limits and depth checking
 */
export function safeJsonParse<T = unknown>(
    input: string,
    options: { maxSize?: number; maxDepth?: number } = {}
): T | null {
    const { maxSize = 1024 * 1024, maxDepth = 20 } = options;

    if (!input || input.length > maxSize) {
        return null;
    }

    try {
        const parsed = JSON.parse(input);

        // Check depth
        if (getObjectDepth(parsed) > maxDepth) {
            return null;
        }

        return parsed as T;
    } catch {
        return null;
    }
}

function getObjectDepth(obj: unknown, currentDepth = 0): number {
    if (currentDepth > 100) return currentDepth; // Safety limit

    if (typeof obj !== 'object' || obj === null) {
        return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
        const depth = getObjectDepth(value, currentDepth + 1);
        if (depth > maxDepth) maxDepth = depth;
    }

    return maxDepth;
}

// =============================================================================
// URL SANITIZATION
// =============================================================================

/**
 * Sanitise URL - prevent javascript: and data: schemes
 */
export function sanitiseUrl(input: string): string {
    if (!input) return '';

    const trimmed = input.trim().toLowerCase();

    // Block dangerous schemes
    const dangerousSchemes = [
        'javascript:',
        'vbscript:',
        'data:text/html',
        'data:application/javascript',
    ];

    for (const scheme of dangerousSchemes) {
        if (trimmed.startsWith(scheme)) {
            return '';
        }
    }

    // Allow only http, https, mailto, tel
    const allowedSchemes = ['http://', 'https://', 'mailto:', 'tel:', '//', '/'];
    const hasAllowedScheme = allowedSchemes.some(s => trimmed.startsWith(s));

    if (!hasAllowedScheme && trimmed.includes(':')) {
        return '';
    }

    return input;
}

// =============================================================================
// GENERAL INPUT SANITIZATION
// =============================================================================

/**
 * General-purpose input sanitiser with configurable options
 */
export interface SanitiseOptions {
    maxLength?: number;
    trim?: boolean;
    lowercase?: boolean;
    removeHtml?: boolean;
    escapeHtml?: boolean;
    removeNewlines?: boolean;
    alphanumericOnly?: boolean;
    allowedChars?: RegExp;
}

export function sanitise(input: string, options: SanitiseOptions = {}): string {
    if (!input) return '';

    let result = input;

    // Length limit first
    if (options.maxLength) {
        result = result.substring(0, options.maxLength);
    }

    // Trim whitespace
    if (options.trim !== false) {
        result = result.trim();
    }

    // Lowercase
    if (options.lowercase) {
        result = result.toLowerCase();
    }

    // HTML handling
    if (options.removeHtml) {
        result = sanitiseHtml(result);
    } else if (options.escapeHtml) {
        result = escapeHtml(result);
    }

    // Newlines
    if (options.removeNewlines) {
        result = result.replace(/[\r\n]/g, ' ');
    }

    // Character filtering
    if (options.alphanumericOnly) {
        result = result.replace(/[^a-zA-Z0-9]/g, '');
    } else if (options.allowedChars) {
        result = result.replace(options.allowedChars, '');
    }

    return result;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate email format
 */
export function isValidEmail(input: string): boolean {
    if (!input || input.length > 254) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
}

/**
 * Validate UUID format
 */
export function isValidUuid(input: string): boolean {
    if (!input) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input);
}

/**
 * Validate that string contains only allowed characters
 */
export function isAlphanumeric(input: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(input);
}

/**
 * Validate string is a safe identifier (letters, numbers, underscores, hyphens)
 */
export function isSafeIdentifier(input: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(input);
}
