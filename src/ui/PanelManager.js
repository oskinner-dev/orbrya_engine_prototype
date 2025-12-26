/**
 * PanelManager.js - Movable/Resizable Panel System with SNAPPING
 * Unity/DaVinci Resolve inspired dockable panel management
 * 
 * Features:
 * - Drag to move panels with edge/panel snapping
 * - Resize from edges and corners
 * - Snap guides (visual feedback)
 * - Focus management (z-index)
 * - Minimize/maximize
 * - Panel state persistence (localStorage)
 */

export class PanelManager {
    constructor() {
        this.panels = new Map();
        this.activePanel = null;
        this.dragState = null;
        this.resizeState = null;
        this.baseZIndex = 100;
        this.topZIndex = 100;
        
        // Snapping configuration
        this.snapThreshold = 15;  // pixels to trigger snap
        this.snapGuides = [];     // visual snap indicators
        
        this.init();
    }

    init() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.loadPanelStates();
        this.createSnapGuides();
    }

    createSnapGuides() {
        // Create vertical and horizontal snap guide lines
        const workspace = document.getElementById('workspace');
        
        const vGuide = document.createElement('div');
        vGuide.className = 'snap-guide vertical';
        vGuide.id = 'snap-guide-v';
        workspace.appendChild(vGuide);
        
        const hGuide = document.createElement('div');
        hGuide.className = 'snap-guide horizontal';
        hGuide.id = 'snap-guide-h';
        workspace.appendChild(hGuide);
    }

    showSnapGuide(type, position) {
        const guide = document.getElementById(`snap-guide-${type === 'vertical' ? 'v' : 'h'}`);
        if (!guide) return;
        
        guide.classList.add('visible');
        if (type === 'vertical') {
            guide.style.left = `${position}px`;
        } else {
            guide.style.top = `${position}px`;
        }
    }

    hideSnapGuides() {
        document.getElementById('snap-guide-v')?.classList.remove('visible');
        document.getElementById('snap-guide-h')?.classList.remove('visible');
    }

    /**
     * Calculate snap positions for a panel
     */
    calculateSnap(panelId, newX, newY, width, height) {
        const workspace = document.getElementById('workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        const wW = workspaceRect.width;
        const wH = workspaceRect.height;
        
        let snapX = newX;
        let snapY = newY;
        let snappedV = false;
        let snappedH = false;
        let snapPosV = 0;
        let snapPosH = 0;
        
        // Snap to workspace edges
        // Left edge
        if (Math.abs(newX) < this.snapThreshold) {
            snapX = 0;
            snappedV = true;
            snapPosV = 0;
        }
        // Right edge
        if (Math.abs(newX + width - wW) < this.snapThreshold) {
            snapX = wW - width;
            snappedV = true;
            snapPosV = wW;
        }
        // Top edge
        if (Math.abs(newY) < this.snapThreshold) {
            snapY = 0;
            snappedH = true;
            snapPosH = 0;
        }
        // Bottom edge
        if (Math.abs(newY + height - wH) < this.snapThreshold) {
            snapY = wH - height;
            snappedH = true;
            snapPosH = wH;
        }
        
        // Snap to other panels
        this.panels.forEach((data, id) => {
            if (id === panelId) return;
            const el = data.element;
            if (el.classList.contains('hidden') || el.classList.contains('maximized')) return;
            
            const rect = el.getBoundingClientRect();
            const pLeft = rect.left - workspaceRect.left;
            const pTop = rect.top - workspaceRect.top;
            const pRight = pLeft + rect.width;
            const pBottom = pTop + rect.height;

            // Snap left edge to other panel's right edge
            if (Math.abs(newX - pRight) < this.snapThreshold) {
                snapX = pRight;
                snappedV = true;
                snapPosV = pRight;
            }
            // Snap right edge to other panel's left edge
            if (Math.abs(newX + width - pLeft) < this.snapThreshold) {
                snapX = pLeft - width;
                snappedV = true;
                snapPosV = pLeft;
            }
            // Snap left edges together
            if (Math.abs(newX - pLeft) < this.snapThreshold) {
                snapX = pLeft;
                snappedV = true;
                snapPosV = pLeft;
            }
            // Snap right edges together
            if (Math.abs(newX + width - pRight) < this.snapThreshold) {
                snapX = pRight - width;
                snappedV = true;
                snapPosV = pRight;
            }
            
            // Snap top edge to other panel's bottom
            if (Math.abs(newY - pBottom) < this.snapThreshold) {
                snapY = pBottom;
                snappedH = true;
                snapPosH = pBottom;
            }
            // Snap bottom edge to other panel's top
            if (Math.abs(newY + height - pTop) < this.snapThreshold) {
                snapY = pTop - height;
                snappedH = true;
                snapPosH = pTop;
            }
            // Snap top edges together
            if (Math.abs(newY - pTop) < this.snapThreshold) {
                snapY = pTop;
                snappedH = true;
                snapPosH = pTop;
            }
            // Snap bottom edges together
            if (Math.abs(newY + height - pBottom) < this.snapThreshold) {
                snapY = pBottom - height;
                snappedH = true;
                snapPosH = pBottom;
            }
        });
        
        return { snapX, snapY, snappedV, snappedH, snapPosV, snapPosH };
    }

    createPanel(config) {
        const {
            id, title, icon = '📦',
            x = 100, y = 100, width = 300, height = 400,
            minWidth = 200, minHeight = 150,
            resizable = true, closable = true, content = null
        } = config;

        const panel = document.createElement('div');
        panel.id = id;
        panel.className = 'panel';
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.width = `${width}px`;
        panel.style.height = `${height}px`;

        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-icon">${icon}</span>
                <span class="panel-title">${title}</span>
                <div class="panel-controls">
                    <button class="panel-btn minimize" title="Minimize">−</button>
                    <button class="panel-btn maximize" title="Maximize">□</button>
                    ${closable ? '<button class="panel-btn close" title="Close">×</button>' : ''}
                </div>
            </div>
            <div class="panel-content"></div>
            ${resizable ? this.createResizeHandles() : ''}
        `;

        this.panels.set(id, {
            element: panel,
            config: { id, title, minWidth, minHeight, resizable, closable },
            state: { minimized: false, maximized: false, prevBounds: null }
        });

        if (content) {
            panel.querySelector('.panel-content').appendChild(content);
        }

        this.attachPanelEvents(panel, id);
        document.getElementById('workspace').appendChild(panel);
        return panel;
    }

    createResizeHandles() {
        return `
            <div class="resize-handle n"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
        `;
    }

    attachPanelEvents(panel, id) {
        const header = panel.querySelector('.panel-header');
        const panelData = this.panels.get(id);

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.panel-controls')) return;
            this.startDrag(e, panel, id);
        });

        panel.addEventListener('mousedown', () => this.focusPanel(id));

        panel.querySelector('.panel-btn.minimize')?.addEventListener('click', () => {
            this.minimizePanel(id);
        });
        panel.querySelector('.panel-btn.maximize')?.addEventListener('click', () => {
            this.toggleMaximize(id);
        });
        panel.querySelector('.panel-btn.close')?.addEventListener('click', () => {
            this.closePanel(id);
        });

        if (panelData.config.resizable) {
            panel.querySelectorAll('.resize-handle').forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    this.startResize(e, panel, id, handle.className.split(' ')[1]);
                });
            });
        }
    }

    focusPanel(id) {
        this.panels.forEach((data) => data.element.classList.remove('focused'));
        const panelData = this.panels.get(id);
        if (panelData) {
            this.topZIndex++;
            panelData.element.style.zIndex = this.topZIndex;
            panelData.element.classList.add('focused');
            this.activePanel = id;
        }
    }

    startDrag(e, panel, id) {
        e.preventDefault();
        this.focusPanel(id);
        const rect = panel.getBoundingClientRect();
        const workspace = document.getElementById('workspace').getBoundingClientRect();
        
        this.dragState = {
            panel, id,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left - workspace.left,
            startTop: rect.top - workspace.top,
            width: rect.width,
            height: rect.height
        };
        document.body.style.cursor = 'move';
        panel.classList.add('dragging');
    }

    startResize(e, panel, id, direction) {
        e.preventDefault();
        e.stopPropagation();
        this.focusPanel(id);
        
        const rect = panel.getBoundingClientRect();
        const workspace = document.getElementById('workspace').getBoundingClientRect();
        const panelData = this.panels.get(id);
        
        this.resizeState = {
            panel, id, direction,
            startX: e.clientX, startY: e.clientY,
            startLeft: rect.left - workspace.left,
            startTop: rect.top - workspace.top,
            startWidth: rect.width, startHeight: rect.height,
            minWidth: panelData.config.minWidth,
            minHeight: panelData.config.minHeight
        };
        panel.classList.add('resizing');
    }

    handleMouseMove(e) {
        if (this.dragState) {
            this.handleDrag(e);
        } else if (this.resizeState) {
            this.handleResize(e);
        }
    }

    handleDrag(e) {
        const { panel, id, startX, startY, startLeft, startTop, width, height } = this.dragState;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newX = startLeft + dx;
        let newY = startTop + dy;
        
        // Apply snapping
        const snap = this.calculateSnap(id, newX, newY, width, height);
        newX = snap.snapX;
        newY = snap.snapY;
        
        // Show/hide snap guides
        if (snap.snappedV) {
            this.showSnapGuide('vertical', snap.snapPosV);
        } else {
            document.getElementById('snap-guide-v')?.classList.remove('visible');
        }
        if (snap.snappedH) {
            this.showSnapGuide('horizontal', snap.snapPosH);
        } else {
            document.getElementById('snap-guide-h')?.classList.remove('visible');
        }
        
        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
    }

    handleResize(e) {
        const { panel, direction, startX, startY, startLeft, startTop,
                startWidth, startHeight, minWidth, minHeight } = this.resizeState;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction.includes('e')) newWidth = Math.max(minWidth, startWidth + dx);
        if (direction.includes('w')) {
            newWidth = Math.max(minWidth, startWidth - dx);
            if (newWidth > minWidth) newLeft = startLeft + dx;
        }
        if (direction.includes('s')) newHeight = Math.max(minHeight, startHeight + dy);
        if (direction.includes('n')) {
            newHeight = Math.max(minHeight, startHeight - dy);
            if (newHeight > minHeight) newTop = startTop + dy;
        }

        panel.style.left = `${newLeft}px`;
        panel.style.top = `${newTop}px`;
        panel.style.width = `${newWidth}px`;
        panel.style.height = `${newHeight}px`;

        panel.dispatchEvent(new CustomEvent('panelresize', {
            detail: { width: newWidth, height: newHeight }
        }));
    }

    handleMouseUp() {
        if (this.dragState) {
            document.body.style.cursor = '';
            this.dragState.panel.classList.remove('dragging');
            this.hideSnapGuides();
            this.savePanelStates();
        }
        if (this.resizeState) {
            this.resizeState.panel.classList.remove('resizing');
            this.savePanelStates();
        }
        this.dragState = null;
        this.resizeState = null;
    }

    minimizePanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.classList.add('hidden');
        panelData.state.minimized = true;
    }

    toggleMaximize(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        const panel = panelData.element;
        
        if (panelData.state.maximized) {
            const prev = panelData.state.prevBounds;
            panel.style.left = prev.left;
            panel.style.top = prev.top;
            panel.style.width = prev.width;
            panel.style.height = prev.height;
            panel.classList.remove('maximized');
            panelData.state.maximized = false;
        } else {
            panelData.state.prevBounds = {
                left: panel.style.left, top: panel.style.top,
                width: panel.style.width, height: panel.style.height
            };
            panel.classList.add('maximized');
            panelData.state.maximized = true;
        }
        panel.dispatchEvent(new CustomEvent('panelresize'));
    }

    closePanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.remove();
        this.panels.delete(id);
        this.savePanelStates();
    }

    showPanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.classList.remove('hidden');
        panelData.state.minimized = false;
        this.focusPanel(id);
    }

    getPanel(id) { return this.panels.get(id); }
    
    getPanelContent(id) {
        return this.panels.get(id)?.element.querySelector('.panel-content');
    }

    savePanelStates() {
        const states = {};
        this.panels.forEach((data, id) => {
            const rect = data.element.getBoundingClientRect();
            states[id] = {
                x: parseInt(data.element.style.left),
                y: parseInt(data.element.style.top),
                width: rect.width, height: rect.height,
                minimized: data.state.minimized,
                maximized: data.state.maximized
            };
        });
        localStorage.setItem('orbrya_panels', JSON.stringify(states));
    }

    loadPanelStates() {
        try {
            const saved = localStorage.getItem('orbrya_panels');
            if (saved) this.savedStates = JSON.parse(saved);
        } catch (e) {
            console.warn('[PanelManager] Could not load saved panel states');
        }
    }

    getSavedState(id) { return this.savedStates?.[id]; }
}
