/**
 * VisualProfiler.js - CORE PEDAGOGICAL TOOL
 * 
 * Makes invisible performance concepts visually tangible for students:
 * - FPS (frames per second) - smoothness
 * - RAM usage (memory) - resource consumption  
 * - Draw Calls - GPU workload
 * 
 * DESIGN PRINCIPLES:
 * - Profiler itself uses <1% CPU (100ms update interval)
 * - requestIdleCallback for non-critical updates
 * - Color-coded health bars for instant understanding
 * - Glassmorphism UI (frosted glass effect)
 * 
 * THRESHOLDS:
 * GREEN:  FPS > 45, RAM < 300MB, Draw Calls < 50
 * YELLOW: FPS 30-45, RAM 300-350MB, Draw Calls 50-80
 * RED:    FPS < 30, RAM > 350MB, Draw Calls > 80
 */

export class VisualProfiler {
    constructor(renderer = null) {
        this.renderer = renderer;
        this.panelManager = null;
        this.panel = null;
        this.container = null;
        this.visible = true;
        
        // Thresholds (matching spec)
        this.thresholds = {
            fps: { green: 45, yellow: 30 },
            memory: { green: 300, yellow: 350 },  // MB
            drawCalls: { green: 50, yellow: 80 }
        };
        
        // Current metrics
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            memory: 0,
            memoryLimit: 400,
            drawCalls: 0,
            triangles: 0,
            textures: 0,
            geometries: 0
        };
        
        // FPS calculation
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        this.fpsHistory = new Array(60).fill(60);
        
        // Update intervals (100ms for metrics, less frequent for UI)
        this.updateInterval = null;
        this.lastUIUpdate = 0;
        this.uiUpdateInterval = 100; // ms
        
        // DOM element cache
        this.elements = {};
        
        // Graph
        this.graphCanvas = null;
        this.graphCtx = null;
    }

    /**
     * Initialize with panel manager (optional)
     */
    init(panelManager = null) {
        this.panelManager = panelManager;
        
        if (panelManager) {
            this.createPanel();
        } else {
            this.createStandaloneUI();
        }
        
        // Start automatic updates (100ms interval)
        this.startUpdates();
        
        return this;
    }

    /**
     * Create panel-based UI
     */
    createPanel() {
        const content = document.createElement('div');
        content.className = 'profiler-content';
        content.innerHTML = this.getHTMLTemplate();

        const saved = this.panelManager.getSavedState('profiler-panel');
        this.panel = this.panelManager.createPanel({
            id: 'profiler-panel',
            title: 'Performance',
            icon: '📊',
            x: saved?.x ?? window.innerWidth - 280,
            y: saved?.y ?? 50,
            width: saved?.width ?? 260,
            height: saved?.height ?? 480,
            minWidth: 220,
            minHeight: 300,
            content
        });

        this.cacheElements();
        this.setupGraph();
        this.panel.addEventListener('panelresize', () => this.resizeGraph());
        
        return this.panel;
    }

    /**
     * Create standalone overlay UI (no panel manager)
     */
    createStandaloneUI() {
        this.container = document.createElement('div');
        this.container.id = 'profiler-overlay';
        this.container.className = 'profiler-overlay';
        this.container.innerHTML = this.getHTMLTemplate();
        document.body.appendChild(this.container);
        
        this.cacheElements();
        this.setupGraph();
    }

    /**
     * HTML template for the profiler UI
     */
    getHTMLTemplate() {
        return `
            <!-- Main FPS Display -->
            <div class="profiler-fps-display">
                <div class="fps-ring" id="fps-ring">
                    <div class="fps-value" id="prof-fps">60</div>
                    <div class="fps-unit">FPS</div>
                </div>
                <div class="fps-status" id="fps-status">✅ Excellent</div>
            </div>

            <!-- Health Bars Section -->
            <div class="profiler-section">
                <div class="profiler-section-title">System Health</div>
                
                <!-- FPS Bar -->
                <div class="health-bar-row">
                    <div class="health-bar-icon">⚡</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">FPS</span>
                            <span class="health-bar-value" id="prof-fps-val">60</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill" id="prof-fps-bar"></div>
                        </div>
                    </div>
                </div>

                <!-- RAM Bar -->
                <div class="health-bar-row">
                    <div class="health-bar-icon">💾</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">RAM</span>
                            <span class="health-bar-value" id="prof-mem-val">0 MB</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill" id="prof-mem-bar"></div>
                        </div>
                    </div>
                </div>

                <!-- Draw Calls Bar -->
                <div class="health-bar-row">
                    <div class="health-bar-icon">🎨</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">DRAW</span>
                            <span class="health-bar-value" id="prof-dc-val">0</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill" id="prof-dc-bar"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Performance Graph -->
            <div class="profiler-section">
                <div class="profiler-section-title">FPS History</div>
                <div class="profiler-graph">
                    <canvas id="profiler-graph-canvas"></canvas>
                    <div class="graph-labels">
                        <span class="graph-label-max">60</span>
                        <span class="graph-label-mid">30</span>
                        <span class="graph-label-min">0</span>
                    </div>
                </div>
            </div>

            <!-- Detailed Stats -->
            <div class="profiler-section">
                <div class="profiler-section-title">Render Stats</div>
                <div class="profiler-stats-grid">
                    <div class="profiler-stat">
                        <span class="stat-value" id="prof-triangles">0</span>
                        <span class="stat-label">Triangles</span>
                    </div>
                    <div class="profiler-stat">
                        <span class="stat-value" id="prof-textures">0</span>
                        <span class="stat-label">Textures</span>
                    </div>
                    <div class="profiler-stat">
                        <span class="stat-value" id="prof-geometries">0</span>
                        <span class="stat-label">Geometries</span>
                    </div>
                    <div class="profiler-stat">
                        <span class="stat-value" id="prof-frametime">16.7ms</span>
                        <span class="stat-label">Frame Time</span>
                    </div>
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            fpsRing: document.getElementById('fps-ring'),
            fps: document.getElementById('prof-fps'),
            fpsVal: document.getElementById('prof-fps-val'),
            fpsBar: document.getElementById('prof-fps-bar'),
            fpsStatus: document.getElementById('fps-status'),
            memVal: document.getElementById('prof-mem-val'),
            memBar: document.getElementById('prof-mem-bar'),
            dcVal: document.getElementById('prof-dc-val'),
            dcBar: document.getElementById('prof-dc-bar'),
            triangles: document.getElementById('prof-triangles'),
            textures: document.getElementById('prof-textures'),
            geometries: document.getElementById('prof-geometries'),
            frametime: document.getElementById('prof-frametime')
        };
    }

    setupGraph() {
        this.graphCanvas = document.getElementById('profiler-graph-canvas');
        if (this.graphCanvas) {
            this.graphCtx = this.graphCanvas.getContext('2d');
            this.resizeGraph();
        }
    }

    resizeGraph() {
        if (!this.graphCanvas) return;
        const parent = this.graphCanvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        this.graphCanvas.width = rect.width - 40;
        this.graphCanvas.height = rect.height;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    /**
     * Start automatic metric updates (100ms interval)
     */
    startUpdates() {
        if (this.updateInterval) return;
        this.updateInterval = setInterval(() => this.sampleMetrics(), 100);
    }

    /**
     * Stop automatic updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Sample metrics (called every 100ms by interval)
     * Uses requestIdleCallback for non-critical updates
     */
    sampleMetrics() {
        const now = performance.now();
        
        // Calculate FPS from frame count
        const elapsed = now - this.lastFpsTime;
        if (elapsed >= 100) {
            this.metrics.fps = Math.round((this.frameCount / elapsed) * 1000);
            this.frameCount = 0;
            this.lastFpsTime = now;
            
            // Update history
            this.fpsHistory.shift();
            this.fpsHistory.push(this.metrics.fps);
        }
        
        // Sample renderer info
        if (this.renderer) {
            const info = this.renderer.info;
            this.metrics.drawCalls = info.render?.calls || 0;
            this.metrics.triangles = info.render?.triangles || 0;
            this.metrics.textures = info.memory?.textures || 0;
            this.metrics.geometries = info.memory?.geometries || 0;
        }
        
        // Sample memory (throttled - expensive on some browsers)
        if (performance.memory) {
            this.metrics.memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
            this.metrics.memoryLimit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        }
        
        // Update UI using requestIdleCallback if available
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => this.updateUI(), { timeout: 50 });
        } else {
            this.updateUI();
        }
    }

    /**
     * Called each frame to count frames (lightweight)
     */
    update() {
        this.frameCount++;
        this.metrics.frameTime = performance.now() - (this.lastFrameTimestamp || performance.now());
        this.lastFrameTimestamp = performance.now();
    }

    /**
     * Update the UI elements
     */
    updateUI() {
        if (!this.elements.fps) return;
        
        const { fps, memory, drawCalls, triangles, textures, geometries, frameTime } = this.metrics;
        
        // FPS display
        this.elements.fps.textContent = fps;
        this.elements.fpsVal.textContent = fps;
        
        // FPS health status
        const fpsHealth = this.getHealthStatus('fps', fps);
        this.elements.fpsRing.className = `fps-ring ${fpsHealth.class}`;
        this.elements.fpsStatus.textContent = `${fpsHealth.icon} ${fpsHealth.label}`;
        this.elements.fpsStatus.className = `fps-status ${fpsHealth.class}`;
        
        // FPS bar (inverted - higher is better)
        const fpsPercent = Math.min(100, (fps / 60) * 100);
        this.elements.fpsBar.style.width = `${fpsPercent}%`;
        this.elements.fpsBar.className = `health-bar-fill ${fpsHealth.class}`;
        
        // Memory bar
        const memHealth = this.getHealthStatus('memory', memory);
        const memPercent = Math.min(100, (memory / 400) * 100);
        this.elements.memVal.textContent = `${memory} MB`;
        this.elements.memBar.style.width = `${memPercent}%`;
        this.elements.memBar.className = `health-bar-fill ${memHealth.class}`;
        
        // Draw calls bar
        const dcHealth = this.getHealthStatus('drawCalls', drawCalls);
        const dcPercent = Math.min(100, (drawCalls / 100) * 100);
        this.elements.dcVal.textContent = drawCalls;
        this.elements.dcBar.style.width = `${dcPercent}%`;
        this.elements.dcBar.className = `health-bar-fill ${dcHealth.class}`;
        
        // Stats
        this.elements.triangles.textContent = this.formatNumber(triangles);
        this.elements.textures.textContent = textures;
        this.elements.geometries.textContent = geometries;
        this.elements.frametime.textContent = `${frameTime.toFixed(1)}ms`;
        
        // Draw graph
        this.drawGraph();
    }

    /**
     * Get health status for a metric
     */
    getHealthStatus(metric, value) {
        const t = this.thresholds[metric];
        
        if (metric === 'fps') {
            // Higher is better for FPS
            if (value >= t.green) return { class: 'healthy', icon: '✅', label: 'Excellent' };
            if (value >= t.yellow) return { class: 'warning', icon: '⚠️', label: 'Moderate' };
            return { class: 'critical', icon: '❌', label: 'Poor' };
        } else {
            // Lower is better for memory and draw calls
            if (value < t.green) return { class: 'healthy', icon: '✅', label: 'Good' };
            if (value < t.yellow) return { class: 'warning', icon: '⚠️', label: 'Warning' };
            return { class: 'critical', icon: '❌', label: 'Critical' };
        }
    }

    /**
     * Draw the FPS history graph
     */
    drawGraph() {
        if (!this.graphCtx || !this.graphCanvas) return;
        
        const ctx = this.graphCtx;
        const w = this.graphCanvas.width;
        const h = this.graphCanvas.height;
        
        // Clear with dark background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);
        
        // Draw threshold lines
        ctx.setLineDash([3, 3]);
        
        // 45 FPS line (green threshold)
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.beginPath();
        const y45 = h - (45 / 70) * h;
        ctx.moveTo(0, y45);
        ctx.lineTo(w, y45);
        ctx.stroke();
        
        // 30 FPS line (yellow threshold)
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.beginPath();
        const y30 = h - (30 / 70) * h;
        ctx.moveTo(0, y30);
        ctx.lineTo(w, y30);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Draw FPS line with gradient based on value
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < this.fpsHistory.length; i++) {
            const fps = this.fpsHistory[i];
            const x = (i / (this.fpsHistory.length - 1)) * w;
            const y = h - (Math.min(70, fps) / 70) * h;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        // Color based on current FPS
        const currentFps = this.fpsHistory[this.fpsHistory.length - 1];
        if (currentFps >= 45) ctx.strokeStyle = '#00ff88';
        else if (currentFps >= 30) ctx.strokeStyle = '#ffa500';
        else ctx.strokeStyle = '#ff4757';
        
        ctx.stroke();
        
        // Fill under the line with gradient
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Show the profiler
     */
    show() {
        this.visible = true;
        if (this.panel) {
            this.panelManager?.showPanel('profiler-panel');
        } else if (this.container) {
            this.container.classList.remove('hidden');
        }
        this.startUpdates();
    }

    /**
     * Hide the profiler
     */
    hide() {
        this.visible = false;
        if (this.panel) {
            this.panelManager?.minimizePanel('profiler-panel');
        } else if (this.container) {
            this.container.classList.add('hidden');
        }
        this.stopUpdates();
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            fps: 60, frameTime: 16.67,
            memory: 0, memoryLimit: 400,
            drawCalls: 0, triangles: 0,
            textures: 0, geometries: 0
        };
        this.fpsHistory = new Array(60).fill(60);
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        this.updateUI();
    }

    /**
     * Get current metrics object
     */
    getMetrics() {
        return {
            ...this.metrics,
            fpsHistory: [...this.fpsHistory],
            health: {
                fps: this.getHealthStatus('fps', this.metrics.fps),
                memory: this.getHealthStatus('memory', this.metrics.memory),
                drawCalls: this.getHealthStatus('drawCalls', this.metrics.drawCalls)
            }
        };
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    dispose() {
        this.stopUpdates();
        if (this.container) {
            this.container.remove();
        }
    }
}
