/**
 * XAOSTECH Theme System
 * 
 * Modular CSS custom properties for dark/light themes.
 * Designed to be easily extensible for Three.js/WebGPU overlays.
 * 
 * Usage in Astro:
 *   import { themeStyles } from '../../shared/styles/theme';
 *   <style set:html={themeStyles}></style>
 * 
 * Or in plain HTML:
 *   <link rel="stylesheet" href="/theme.css">
 * 
 * Theme is controlled by:
 *   - localStorage key: 'xaostech_theme' (values: 'dark' | 'light')
 *   - body class: 'light-theme' 
 *   - data-theme attribute on <html>
 */

export const themeStyles = `
/* =============================================================================
   XAOSTECH THEME SYSTEM - CSS CUSTOM PROPERTIES
   ============================================================================= */

/* Dark Theme (Default) */
:root,
[data-theme="dark"] {
  /* Core palette */
  --color-primary: #f6821f;
  --color-primary-dark: #e65100;
  --color-primary-light: #ff9d4d;
  --color-secondary: #00d4ff;
  --color-secondary-dark: #0099cc;
  --color-accent: #7c3aed;
  
  /* Backgrounds - layered for depth */
  --bg-base: #0a0a0a;
  --bg-surface: #121218;
  --bg-card: #1a1a2e;
  --bg-elevated: #252538;
  --bg-input: #2a2a3a;
  --bg-overlay: rgba(0, 0, 0, 0.8);
  
  /* Text hierarchy */
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-muted: #888888;
  --text-disabled: #555555;
  --text-inverse: #0a0a0a;
  
  /* Borders and dividers */
  --border-primary: #333344;
  --border-subtle: #222233;
  --border-focus: var(--color-secondary);
  
  /* Status colors */
  --color-success: #22c55e;
  --color-success-bg: rgba(34, 197, 94, 0.1);
  --color-danger: #ef4444;
  --color-danger-bg: rgba(239, 68, 68, 0.1);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-info: #3b82f6;
  --color-info-bg: rgba(59, 130, 246, 0.1);
  
  /* Shadows - glow effects for dark mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(0, 212, 255, 0.15);
  --shadow-glow-primary: 0 0 20px rgba(246, 130, 31, 0.2);
  
  /* Glass effects (for overlays, modals) */
  --glass-bg: rgba(26, 26, 46, 0.85);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 12px;
  
  /* Marble effect base colors (for Three.js integration) */
  --marble-light: #3a3a4a;
  --marble-dark: #1a1a2a;
  --marble-vein: rgba(255, 255, 255, 0.08);
  --marble-highlight: rgba(0, 212, 255, 0.1);
  
  /* Animation timings */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.4s ease;
  
  /* Z-index layers */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-bubble: 99999;
}

/* =============================================================================
   LIGHT THEME
   ============================================================================= */

[data-theme="light"],
body.light-theme {
  /* Core palette - adjusted for light backgrounds */
  --color-primary: #e65100;
  --color-primary-dark: #bf4500;
  --color-primary-light: #f6821f;
  --color-secondary: #0099cc;
  --color-secondary-dark: #007399;
  
  /* Backgrounds - light layers */
  --bg-base: #f5f5f7;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --bg-elevated: #ffffff;
  --bg-input: #f0f0f2;
  --bg-overlay: rgba(255, 255, 255, 0.9);
  
  /* Text hierarchy */
  --text-primary: #1a1a1a;
  --text-secondary: #333333;
  --text-muted: #666666;
  --text-disabled: #aaaaaa;
  --text-inverse: #ffffff;
  
  /* Borders and dividers */
  --border-primary: #dddddd;
  --border-subtle: #eeeeee;
  --border-focus: var(--color-secondary);
  
  /* Shadows - soft shadows for light mode */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-glow: 0 0 20px rgba(0, 153, 204, 0.1);
  --shadow-glow-primary: 0 0 20px rgba(230, 81, 0, 0.15);
  
  /* Glass effects */
  --glass-bg: rgba(255, 255, 255, 0.9);
  --glass-border: rgba(0, 0, 0, 0.1);
  
  /* Marble effect - light marble colors */
  --marble-light: #ffffff;
  --marble-dark: #e8e8ec;
  --marble-vein: rgba(0, 0, 0, 0.05);
  --marble-highlight: rgba(0, 153, 204, 0.08);
}

/* =============================================================================
   BASE ELEMENT STYLES
   ============================================================================= */

body {
  background: var(--bg-base);
  color: var(--text-secondary);
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

a {
  color: var(--color-primary);
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-primary-dark);
}

/* =============================================================================
   UTILITY CLASSES
   ============================================================================= */

.surface { background: var(--bg-surface); }
.card-bg { background: var(--bg-card); }
.elevated { background: var(--bg-elevated); box-shadow: var(--shadow-md); }

.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }

.border { border: 1px solid var(--border-primary); }
.border-subtle { border: 1px solid var(--border-subtle); }

/* Glass morphism effect */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
}

/* Glow effects */
.glow { box-shadow: var(--shadow-glow); }
.glow-primary { box-shadow: var(--shadow-glow-primary); }

/* =============================================================================
   FORM ELEMENTS
   ============================================================================= */

input, textarea, select {
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

input:focus, textarea:focus, select:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15);
  outline: none;
}

input::placeholder, textarea::placeholder {
  color: var(--text-muted);
}

/* =============================================================================
   BUTTON BASE (for marble shader integration)
   ============================================================================= */

.btn-marble {
  position: relative;
  background: linear-gradient(135deg, var(--marble-light) 0%, var(--marble-dark) 100%);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  overflow: hidden;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.btn-marble:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-glow);
}

/* Canvas container for Three.js marble effects */
.btn-marble canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* =============================================================================
   SCROLLBAR STYLING
   ============================================================================= */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) var(--bg-surface);
}
`;

// Export as plain CSS string for non-module usage
export default themeStyles;
