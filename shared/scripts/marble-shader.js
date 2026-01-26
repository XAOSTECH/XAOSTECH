/**
 * XAOSTECH Marble Shader Module
 * 
 * Interactive marble texture effect for buttons and UI elements.
 * Uses Three.js WebGPU renderer with TSL (Three Shading Language).
 * 
 * Features:
 * - Procedural marble veins using turbulent noise
 * - Light and dark marble variants based on theme
 * - Interactive polygon dissolution on hover/click
 * - Smooth gradient animations
 * 
 * Based on Codrops "Magical Marbles" technique adapted for 2D UI elements.
 * 
 * Usage:
 *   import { MarbleButton } from './marble-shader';
 *   new MarbleButton(buttonElement, { theme: 'dark' });
 */

(function() {
    'use strict';

    const MARBLE_CONFIG = {
        // Noise settings for marble veins
        noiseScale: 4.0,
        noiseOctaves: 5,
        veinIntensity: 0.6,
        veinSharpness: 8.0,
        
        // Animation
        hoverTransitionSpeed: 0.15,
        dissolveSpeed: 0.8,
        dissolveRadius: 150, // pixels from mouse
        
        // Polygon dissolution
        triangleSize: 12,
        maxDisplacement: 50,
        
        // Colors (CSS custom property fallbacks)
        darkMarble: {
            base: [0.15, 0.15, 0.2],
            light: [0.25, 0.25, 0.3],
            vein: [0.08, 0.08, 0.12],
            highlight: [0.0, 0.83, 1.0, 0.15] // cyan glow
        },
        lightMarble: {
            base: [0.95, 0.95, 0.97],
            light: [1.0, 1.0, 1.0],
            vein: [0.85, 0.85, 0.88],
            highlight: [0.0, 0.6, 0.8, 0.1] // subtle cyan
        }
    };

    // Simplex noise implementation (simplified for 2D)
    const SimplexNoise = {
        // Permutation table
        perm: new Uint8Array(512),
        
        init() {
            const p = new Uint8Array(256);
            for (let i = 0; i < 256; i++) p[i] = i;
            // Fisher-Yates shuffle with fixed seed for consistency
            let seed = 42;
            for (let i = 255; i > 0; i--) {
                seed = (seed * 16807) % 2147483647;
                const j = seed % (i + 1);
                [p[i], p[j]] = [p[j], p[i]];
            }
            for (let i = 0; i < 512; i++) {
                this.perm[i] = p[i & 255];
            }
        },

        grad2: [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ],

        noise2D(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;
            
            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);
            
            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;
            
            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }
            
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;
            
            const ii = i & 255;
            const jj = j & 255;
            
            const gi0 = this.perm[ii + this.perm[jj]] & 7;
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] & 7;
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] & 7;
            
            let n0 = 0, n1 = 0, n2 = 0;
            
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                t0 *= t0;
                const g = this.grad2[gi0];
                n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
            }
            
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                t1 *= t1;
                const g = this.grad2[gi1];
                n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
            }
            
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                t2 *= t2;
                const g = this.grad2[gi2];
                n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
            }
            
            return 70 * (n0 + n1 + n2);
        },

        // Fractal Brownian Motion for marble veins
        fbm(x, y, octaves = 5) {
            let value = 0;
            let amplitude = 1;
            let frequency = 1;
            let maxValue = 0;
            
            for (let i = 0; i < octaves; i++) {
                value += amplitude * this.noise2D(x * frequency, y * frequency);
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            
            return value / maxValue;
        },

        // Turbulence for marble effect
        turbulence(x, y, octaves = 5) {
            let value = 0;
            let amplitude = 1;
            let frequency = 1;
            let maxValue = 0;
            
            for (let i = 0; i < octaves; i++) {
                value += amplitude * Math.abs(this.noise2D(x * frequency, y * frequency));
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            
            return value / maxValue;
        }
    };

    SimplexNoise.init();

    /**
     * Triangle mesh for dissolution effect
     */
    class TriangleMesh {
        constructor(width, height, triangleSize) {
            this.triangles = [];
            this.generateMesh(width, height, triangleSize);
        }

        generateMesh(width, height, size) {
            const cols = Math.ceil(width / size) + 1;
            const rows = Math.ceil(height / size) + 1;
            
            // Generate points with slight randomization
            const points = [];
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const px = x * size + (y % 2 ? size / 2 : 0);
                    const py = y * size * 0.866; // sqrt(3)/2 for equilateral
                    points.push({
                        x: px + (Math.random() - 0.5) * size * 0.3,
                        y: py + (Math.random() - 0.5) * size * 0.3,
                        ox: px, // original x
                        oy: py, // original y
                        vx: 0,
                        vy: 0,
                        dissolve: 0
                    });
                }
            }

            // Create triangles using Delaunay-like pattern
            for (let y = 0; y < rows - 1; y++) {
                for (let x = 0; x < cols - 1; x++) {
                    const i = y * cols + x;
                    if (y % 2 === 0) {
                        this.triangles.push([points[i], points[i + 1], points[i + cols]]);
                        this.triangles.push([points[i + 1], points[i + cols + 1], points[i + cols]]);
                    } else {
                        this.triangles.push([points[i], points[i + 1], points[i + cols + 1]]);
                        this.triangles.push([points[i], points[i + cols + 1], points[i + cols]]);
                    }
                }
            }
        }

        updateDissolve(mouseX, mouseY, radius, intensity, isClick) {
            const radiusSq = radius * radius;
            
            for (const triangle of this.triangles) {
                for (const point of triangle) {
                    const dx = point.ox - mouseX;
                    const dy = point.oy - mouseY;
                    const distSq = dx * dx + dy * dy;
                    
                    if (distSq < radiusSq) {
                        const dist = Math.sqrt(distSq);
                        const factor = 1 - (dist / radius);
                        const target = factor * intensity;
                        
                        if (isClick) {
                            // Full 360° dissolution on click
                            point.dissolve = Math.min(1, point.dissolve + target * 0.2);
                            const angle = Math.atan2(dy, dx);
                            point.vx += Math.cos(angle) * target * 3;
                            point.vy += Math.sin(angle) * target * 3;
                        } else {
                            // Subtle displacement on hover
                            point.dissolve = Math.max(point.dissolve, target * 0.5);
                        }
                    }
                    
                    // Apply velocity and decay
                    point.x = point.ox + point.vx;
                    point.y = point.oy + point.vy;
                    point.vx *= 0.95;
                    point.vy *= 0.95;
                    point.dissolve *= 0.98;
                }
            }
        }

        reset() {
            for (const triangle of this.triangles) {
                for (const point of triangle) {
                    point.x = point.ox;
                    point.y = point.oy;
                    point.vx = 0;
                    point.vy = 0;
                    point.dissolve = 0;
                }
            }
        }
    }

    /**
     * Main MarbleButton class
     */
    class MarbleButton {
        constructor(element, options = {}) {
            this.element = element;
            this.options = {
                theme: 'dark',
                animated: true,
                dissolveOnClick: true,
                ...options
            };
            
            this.canvas = null;
            this.ctx = null;
            this.mesh = null;
            this.animationId = null;
            this.mouseX = -1000;
            this.mouseY = -1000;
            this.isHovering = false;
            this.isClicking = false;
            this.time = 0;
            
            this.init();
        }

        init() {
            // Create canvas
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                border-radius: inherit;
            `;
            
            // Setup element
            this.element.style.position = 'relative';
            this.element.style.overflow = 'hidden';
            this.element.appendChild(this.canvas);
            
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            
            // Create triangle mesh for dissolution
            this.mesh = new TriangleMesh(
                this.canvas.width,
                this.canvas.height,
                MARBLE_CONFIG.triangleSize
            );
            
            // Event listeners
            this.element.addEventListener('mouseenter', () => {
                this.isHovering = true;
                if (!this.animationId) this.animate();
            });
            
            this.element.addEventListener('mouseleave', () => {
                this.isHovering = false;
                this.mouseX = -1000;
                this.mouseY = -1000;
            });
            
            this.element.addEventListener('mousemove', (e) => {
                const rect = this.element.getBoundingClientRect();
                this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
                this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            });
            
            this.element.addEventListener('mousedown', () => {
                this.isClicking = true;
            });
            
            this.element.addEventListener('mouseup', () => {
                this.isClicking = false;
            });
            
            // Theme observer
            this.observeTheme();
            
            // Initial render
            this.render();
        }

        observeTheme() {
            const observer = new MutationObserver(() => {
                const isDark = !document.body.classList.contains('light-theme') &&
                               document.documentElement.getAttribute('data-theme') !== 'light';
                this.options.theme = isDark ? 'dark' : 'light';
            });
            
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        }

        resize() {
            const rect = this.element.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
        }

        getMarbleColor(x, y) {
            const colors = this.options.theme === 'dark' 
                ? MARBLE_CONFIG.darkMarble 
                : MARBLE_CONFIG.lightMarble;
            
            const scale = MARBLE_CONFIG.noiseScale;
            const nx = x / this.canvas.width * scale;
            const ny = y / this.canvas.height * scale;
            
            // Create marble vein pattern
            const turbulence = SimplexNoise.turbulence(nx, ny, MARBLE_CONFIG.noiseOctaves);
            const vein = Math.sin((nx + turbulence * 2) * Math.PI * 3);
            const veinIntensity = Math.pow(Math.abs(vein), MARBLE_CONFIG.veinSharpness);
            
            // Secondary veins
            const vein2 = Math.sin((ny + turbulence * 1.5) * Math.PI * 2);
            const vein2Intensity = Math.pow(Math.abs(vein2), MARBLE_CONFIG.veinSharpness * 0.8) * 0.5;
            
            // Combine veins
            const combinedVein = Math.min(1, veinIntensity + vein2Intensity) * MARBLE_CONFIG.veinIntensity;
            
            // Mix colors
            const r = colors.base[0] * (1 - combinedVein) + colors.vein[0] * combinedVein;
            const g = colors.base[1] * (1 - combinedVein) + colors.vein[1] * combinedVein;
            const b = colors.base[2] * (1 - combinedVein) + colors.vein[2] * combinedVein;
            
            return [r, g, b];
        }

        render() {
            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);
            
            ctx.clearRect(0, 0, width, height);
            
            // Update mesh if hovering
            if (this.isHovering || this.isClicking) {
                this.mesh.updateDissolve(
                    this.mouseX,
                    this.mouseY,
                    MARBLE_CONFIG.dissolveRadius,
                    this.isClicking ? 1 : 0.5,
                    this.isClicking
                );
            }
            
            // Draw triangles with marble texture
            for (const triangle of this.mesh.triangles) {
                const [p1, p2, p3] = triangle;
                const avgDissolve = (p1.dissolve + p2.dissolve + p3.dissolve) / 3;
                
                if (avgDissolve > 0.9) continue; // Skip fully dissolved triangles
                
                // Get center color
                const cx = (p1.x + p2.x + p3.x) / 3;
                const cy = (p1.y + p2.y + p3.y) / 3;
                const [r, g, b] = this.getMarbleColor(cx, cy);
                
                // Add highlight near mouse
                const dx = cx - this.mouseX;
                const dy = cy - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const highlight = Math.max(0, 1 - dist / 100) * 0.3;
                
                const colors = this.options.theme === 'dark' 
                    ? MARBLE_CONFIG.darkMarble 
                    : MARBLE_CONFIG.lightMarble;
                
                const fr = Math.min(1, r + highlight * colors.highlight[0]);
                const fg = Math.min(1, g + highlight * colors.highlight[1]);
                const fb = Math.min(1, b + highlight * colors.highlight[2]);
                const alpha = 1 - avgDissolve;
                
                ctx.fillStyle = `rgba(${Math.floor(fr * 255)}, ${Math.floor(fg * 255)}, ${Math.floor(fb * 255)}, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fill();
            }
            
            // Add subtle gradient overlay
            if (this.isHovering) {
                const gradient = ctx.createRadialGradient(
                    this.mouseX, this.mouseY, 0,
                    this.mouseX, this.mouseY, 80
                );
                const colors = this.options.theme === 'dark' 
                    ? MARBLE_CONFIG.darkMarble 
                    : MARBLE_CONFIG.lightMarble;
                
                gradient.addColorStop(0, `rgba(${colors.highlight[0] * 255}, ${colors.highlight[1] * 255}, ${colors.highlight[2] * 255}, ${colors.highlight[3]})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }
        }

        animate() {
            this.time += 0.016;
            this.render();
            
            // Continue animation if hovering or triangles are still moving
            const hasMotion = this.mesh.triangles.some(t => 
                t.some(p => Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01 || p.dissolve > 0.01)
            );
            
            if (this.isHovering || hasMotion) {
                this.animationId = requestAnimationFrame(() => this.animate());
            } else {
                this.animationId = null;
                this.mesh.reset();
                this.render();
            }
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.canvas.remove();
        }
    }

    /**
     * Initialize all marble buttons on page
     */
    function initMarbleButtons() {
        const buttons = document.querySelectorAll('.btn-marble, [data-marble]');
        buttons.forEach(btn => {
            if (!btn._marbleInstance) {
                btn._marbleInstance = new MarbleButton(btn);
            }
        });
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMarbleButtons);
    } else {
        initMarbleButtons();
    }

    // Expose globally
    window.XAOSTECH = window.XAOSTECH || {};
    window.XAOSTECH.MarbleButton = MarbleButton;
    window.XAOSTECH.initMarbleButtons = initMarbleButtons;
})();
