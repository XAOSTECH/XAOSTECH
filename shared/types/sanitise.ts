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
 * Repeatedly removes patterns until the result stabilizes.
 * This is a CodeQL-recognized safe pattern for multi-character sanitization.
 * @private
 */
function removeUntilStable(input: string, remover: (s: string) => string): string {
    let result = input;
    let previous: string;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    do {
        previous = result;
        result = remover(result);
        iterations++;
    } while (result !== previous && iterations < maxIterations);

    return result;
}

/**
 * Removes all HTML tags safely, preventing nested tag injection attacks.
 * Uses character filtering to avoid regex-based multi-char sanitization issues.
 * 
 * CodeQL: js/incomplete-multi-character-sanitization - RESOLVED
 * by using removeUntilStable with character-level filtering.
 */
export function sanitiseHtml(input: string): string {
    if (!input) return '';

    return removeUntilStable(input, (s) => {
        // First pass: remove well-formed tags
        let result = s.replace(/<[^>]*>/g, '');
        // Second pass: remove any remaining angle brackets (malformed tags)
        // Use character filter to avoid multi-char sanitization warning
        result = [...result].filter(c => c !== '<' && c !== '>').join('');
        return result;
    });
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
 * Remove script tags and event handlers - comprehensive XSS prevention.
 * 
 * Uses state-machine parsing to avoid regex-based multi-char sanitization issues.
 * CodeQL-safe: no multi-character string replacement patterns.
 */
export function sanitiseScript(input: string): string {
    if (!input) return '';

    // Phase 1: Remove all content between script tags using state machine
    let result = removeScriptTags(input);
    
    // Phase 2: Remove event handlers using attribute parser
    result = removeEventHandlers(result);
    
    // Phase 3: Neutralize dangerous URI schemes by removing colons after scheme names
    result = neutralizeDangerousSchemes(result);
    
    return result;
}

/**
 * State-machine based script tag removal.
 * Handles nested/malformed tags without regex multi-char patterns.
 */
function removeScriptTags(input: string): string {
    const result: string[] = [];
    let i = 0;
    let inScript = false;
    
    while (i < input.length) {
        // Look for <script
        if (!inScript && i + 7 < input.length) {
            const chunk = input.slice(i, i + 7).toLowerCase();
            if (chunk === '<script') {
                // Check it's actually a tag start (followed by space, >, or end)
                const nextChar = input[i + 7];
                if (!nextChar || nextChar === ' ' || nextChar === '>' || nextChar === '\t' || nextChar === '\n' || nextChar === '/') {
                    inScript = true;
                    // Skip to end of opening tag
                    while (i < input.length && input[i] !== '>') i++;
                    i++; // Skip the >
                    continue;
                }
            }
        }
        
        // Look for </script>
        if (inScript && i + 9 <= input.length) {
            const chunk = input.slice(i, i + 9).toLowerCase();
            if (chunk === '</script>') {
                inScript = false;
                i += 9;
                continue;
            }
        }
        
        // Only add character if not in script
        if (!inScript) {
            result.push(input[i]);
        }
        i++;
    }
    
    return result.join('');
}

/**
 * Remove event handler attributes (onclick, onerror, etc.)
 * Uses character-by-character parsing instead of regex.
 */
function removeEventHandlers(input: string): string {
    const result: string[] = [];
    let i = 0;
    
    while (i < input.length) {
        // Check for whitespace followed by 'on'
        if ((i === 0 || /\s/.test(input[i - 1])) && 
            i + 2 < input.length && 
            input.slice(i, i + 2).toLowerCase() === 'on') {
            
            // Look ahead for = sign (event handler pattern: onX="..." or onX='...')
            let j = i + 2;
            while (j < input.length && /\w/.test(input[j])) j++; // Skip handler name
            while (j < input.length && /\s/.test(input[j])) j++; // Skip whitespace
            
            if (j < input.length && input[j] === '=') {
                // This is an event handler - skip it entirely
                j++; // Skip =
                while (j < input.length && /\s/.test(input[j])) j++; // Skip whitespace
                
                if (j < input.length && (input[j] === '"' || input[j] === "'")) {
                    const quote = input[j];
                    j++; // Skip opening quote
                    while (j < input.length && input[j] !== quote) j++;
                    j++; // Skip closing quote
                } else {
                    // Unquoted value - skip to whitespace or >
                    while (j < input.length && !/[\s>]/.test(input[j])) j++;
                }
                
                i = j;
                continue;
            }
        }
        
        result.push(input[i]);
        i++;
    }
    
    return result.join('');
}

/**
 * Neutralize dangerous URI schemes by replacing the colon with safe character.
 * Handles obfuscation attempts like "java script:" or "java\nscript:"
 */
function neutralizeDangerousSchemes(input: string): string {
    const dangerousSchemes = ['javascript', 'vbscript', 'data'];
    let result = input;
    
    for (const scheme of dangerousSchemes) {
        // Build a pattern that matches the scheme with any whitespace between chars
        // Then neutralize by removing the colon after it
        result = neutralizeScheme(result, scheme);
    }
    
    return result;
}

function neutralizeScheme(input: string, scheme: string): string {
    const result: string[] = [];
    let i = 0;
    
    while (i < input.length) {
        // Try to match scheme name (ignoring whitespace between chars)
        let j = i;
        let schemeIdx = 0;
        
        while (schemeIdx < scheme.length && j < input.length) {
            // Skip whitespace
            while (j < input.length && /\s/.test(input[j])) j++;
            
            if (j < input.length && input[j].toLowerCase() === scheme[schemeIdx]) {
                j++;
                schemeIdx++;
            } else {
                break;
            }
        }
        
        // If we matched the full scheme, check for colon
        if (schemeIdx === scheme.length) {
            // Skip whitespace before colon
            while (j < input.length && /\s/.test(input[j])) j++;
            
            if (j < input.length && input[j] === ':') {
                // Found dangerous scheme - skip the whole thing including colon
                i = j + 1;
                continue;
            }
        }
        
        result.push(input[i]);
        i++;
    }
    
    return result.join('');
}

// =============================================================================
// PATH SANITIZATION
// =============================================================================

/**
 * Sanitise file paths to prevent directory traversal attacks.
 * 
 * CodeQL: js/incomplete-multi-character-sanitization - RESOLVED
 * Uses removeUntilStable and processes path segments individually.
 */
export function sanitisePath(input: string): string {
    if (!input) return '';

    // First, URL-decode any encoded traversal attempts
    let decoded = input;
    try {
        // Repeatedly decode to handle double-encoding
        let prev: string;
        do {
            prev = decoded;
            decoded = decodeURIComponent(decoded);
        } while (decoded !== prev && decoded.includes('%'));
    } catch {
        // If decoding fails, work with original
        decoded = input;
    }

    return removeUntilStable(decoded, (s) => {
        // Split into segments, filter out traversal attempts, rejoin
        const segments = s.split(/[\/\\]+/);
        const safe = segments.filter(seg => {
            // Remove '..' and variations
            const normalized = seg.toLowerCase().trim();
            return normalized !== '..' &&
                normalized !== '.' &&
                !normalized.includes('\0') &&
                normalized !== '';
        });
        return safe.join('/');
    });
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
