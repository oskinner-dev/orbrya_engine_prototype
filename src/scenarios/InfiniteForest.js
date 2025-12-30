/**
 * InfiniteForest.js - "THE INFINITE FOREST" Test Scenario
 * 
 * PEDAGOGICAL GOAL:
 * Teach students to identify and fix infinite loops by making the
 * consequences visually obvious (laggy performance, low FPS).
 * 
 * STORY:
 * "The AI tried to populate this forest, but it wrote a buggy loop.
 * The forest is spawning WAY too many trees and the game is lagging.
 * Can you fix the AI's code?"
 * 
 * WORKFLOW:
 * 1. Scene loads with 500 trees (intentionally laggy, ~10 FPS)
 * 2. Profiler shows RED (FPS < 30, Draw Calls > 100)
 * 3. "Inspector" button appears
 * 4. Student clicks to see the buggy code
 * 5. Student changes while(true) to while(treeCount < 50)
 * 6. Student clicks "Apply Fix"
 * 7. Scene respawns with 50 trees
 * 8. Profiler shows GREEN (FPS 55-60)
 * 9. "Success!" celebration
 */

import { Scenario } from './Scenario.js';

export class InfiniteForest extends Scenario {
    constructor(sceneController, codeEditor, profiler) {
        super(sceneController, codeEditor, profiler);
        
        // Scenario metadata
        this.id = 'infinite-forest';
        this.title = 'The Infinite Forest';
        this.description = 'Fix the AI\'s buggy tree spawner to restore performance';
        this.difficulty = 'beginner';
        
        // Story elements
        this.story = {
            intro: `🌲 THE INFINITE FOREST 🌲

The AI assistant tried to help build a forest scene, 
but something went wrong...

It wrote a loop that never stops! The forest keeps 
growing until the game crashes!

🔴 PROBLEM: FPS has dropped to ~10. The game is unplayable!

Your mission: Find the bug in the AI's code and fix it.

Click "🔍 Inspect AI Code" to begin your investigation.`,
            
            hint: `💡 HINT: Look at the while loop condition.
"while (true)" means "loop forever" - that's the bug!
Try changing it to "while (treeCount < 50)" to limit the trees.`,
            
            success: `🎉 EXCELLENT WORK!

You fixed the infinite loop! The forest now has a reasonable 
number of trees and the game runs smoothly.

📊 Your Results:
• FPS improved from ~10 to 60!
• You learned: Loop termination conditions

You're becoming a great AI code auditor!`,
            
            failure: `🔄 Not quite right yet!

The game is still lagging. Make sure your loop has a 
proper exit condition.

💡 Remember: The loop needs to STOP at some point.
Try: while (treeCount < 50)`
        };


        // The buggy AI code students will fix
        this.buggyCode = `// ════════════════════════════════════════════
// 🤖 AI GENERATED CODE - Contains Bug!
// ════════════════════════════════════════════
//
// The AI was asked to "create a forest scene"
// but it made a critical mistake...
//
// ════════════════════════════════════════════

using Orbrya.Engine;

public class ForestGenerator : ScenarioBase
{
    private int treeCount = 0;

    public void PopulateForest()
    {
        // AI's comment: "I'll spawn trees until the 
        // forest looks full enough!"
        
        treeCount = 0;
        
        // ╔══════════════════════════════════════════╗
        // ║  🔴 BUG FOUND! FIX THE LINE BELOW!       ║
        // ╚══════════════════════════════════════════╝
        
        while (true)  // ← ❌ INFINITE LOOP!
        {
            SpawnTree();
            treeCount++;
        }
        
        // ════════════════════════════════════════════
        // 💡 HINT: Replace "true" with a condition
        // ✅ Example: while (treeCount < 50)
        // ════════════════════════════════════════════
        
        Debug.Log($"Forest complete: {treeCount} trees");
    }
}`;

        // Solution patterns that indicate a correct fix
        this.solutionPatterns = [
            {
                regex: /while\s*\(\s*treeCount\s*<\s*(\d+)\s*\)/,
                extractRegex: /while\s*\(\s*treeCount\s*<\s*(\d+)\s*\)/,
                feedback: 'Great! You added a proper loop limit.'
            },
            {
                regex: /while\s*\(\s*treeCount\s*<=\s*(\d+)\s*\)/,
                extractRegex: /while\s*\(\s*treeCount\s*<=\s*(\d+)\s*\)/,
                feedback: 'Good use of <= operator!'
            },
            {
                regex: /while\s*\(\s*(\d+)\s*>\s*treeCount\s*\)/,
                extractRegex: /while\s*\(\s*(\d+)\s*>\s*treeCount\s*\)/,
                feedback: 'Clever! Reversed the comparison.'
            },
            {
                regex: /while\s*\(\s*treeCount\s*!=\s*(\d+)\s*\)/,
                extractRegex: /while\s*\(\s*treeCount\s*!=\s*(\d+)\s*\)/,
                feedback: 'Using != works, but < is safer!'
            }
        ];
        
        // Validation thresholds
        this.validation = {
            targetFPS: 45,      // Need at least 45 FPS to pass
            maxObjects: 175,    // More than 175 trees will cause lag
            minObjects: 10,     // Less than 10 is "cheating"
            brokenTreeCount: 500 // How many trees to spawn when broken
        };
        
        // Internal state
        this._inspectorButton = null;
        this._successOverlay = null;
        this._storyOverlay = null;
    }


    /**
     * Initialize the scenario
     */
    async init() {
        await super.init();
        
        // Create UI elements
        this._createInspectorButton();
        this._createStoryOverlay();
        this._createSuccessOverlay();
        
        console.log(`[InfiniteForest] Initialized`);
        return this;
    }

    /**
     * Start the broken scenario
     */
    async start() {
        console.log('[InfiniteForest] Starting broken state...');
        
        // Show the story intro
        this._showStoryOverlay();
        
        // Spawn WAY too many trees (causes lag)
        this.sceneController.spawnTrees(this.validation.brokenTreeCount);
        
        // Show inspector button after delay
        setTimeout(() => {
            this._showInspectorButton();
        }, 1000);
        
        await super.start();
    }

    /**
     * Override inspect to load specific buggy code
     */
    inspect() {
        super.inspect();
        
        // Hide story overlay
        this._hideStoryOverlay();
        
        // Show code editor with buggy code
        if (this.codeEditor) {
            this.codeEditor.setCode(this.buggyCode);
            this.codeEditor.log('warning', '⚠️ AI code loaded - Find and fix the bug!');
            this.codeEditor.log('info', '💡 Hint: Look at the while loop condition');
        }
        
        // Update inspector button
        if (this._inspectorButton) {
            this._inspectorButton.textContent = '📝 Code Loaded';
            this._inspectorButton.disabled = true;
        }
    }

    /**
     * Apply student's fix
     */
    async apply(code) {
        const result = await super.apply(code);
        
        if (result.success) {
            // Check if we actually improved
            const completion = this.checkCompletion();
            
            if (completion.success) {
                this._showSuccessOverlay(completion);
            } else {
                // Partial success - fixed but still laggy
                this.codeEditor?.log('warning', completion.message);
                this.codeEditor?.log('info', `Current FPS: ${completion.fps} (need ${completion.targetFPS}+)`);
            }
        }
        
        return result;
    }

    /**
     * Reset scenario for retry
     */
    reset() {
        super.reset();
        
        // Reset UI
        this._hideSuccessOverlay();
        this._showInspectorButton();
        if (this._inspectorButton) {
            this._inspectorButton.textContent = '🔍 Inspect AI Code';
            this._inspectorButton.disabled = false;
        }
        
        // Respawn broken state
        this.sceneController.spawnTrees(this.validation.brokenTreeCount);
        
        // Show story again
        this._showStoryOverlay();
        
        this.codeEditor?.clearConsole();
        this.codeEditor?.log('info', '🔄 Scenario reset - Try again!');
    }


    // ============================================
    // UI CREATION METHODS
    // ============================================

    _createInspectorButton() {
        // Check if already exists
        if (document.getElementById('scenario-inspector-btn')) {
            this._inspectorButton = document.getElementById('scenario-inspector-btn');
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'scenario-inspector-btn';
        btn.className = 'scenario-action-btn';
        btn.innerHTML = '🔍 Inspect AI Code';
        btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            display: none;
            transition: all 0.3s ease;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateX(-50%) scale(1.05)';
            btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateX(-50%) scale(1)';
            btn.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
        });
        
        btn.addEventListener('click', () => this.inspect());
        
        document.body.appendChild(btn);
        this._inspectorButton = btn;
    }

    _showInspectorButton() {
        if (this._inspectorButton) {
            this._inspectorButton.style.display = 'block';
        }
    }

    _hideInspectorButton() {
        if (this._inspectorButton) {
            this._inspectorButton.style.display = 'none';
        }
    }

    _createStoryOverlay() {
        if (document.getElementById('scenario-story-overlay')) {
            this._storyOverlay = document.getElementById('scenario-story-overlay');
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'scenario-story-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            max-width: 400px;
            background: rgba(15, 22, 41, 0.95);
            border: 2px solid #667eea;
            border-radius: 15px;
            padding: 25px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            z-index: 999;
            display: none;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${this.story.intro}</div>
            <button id="story-dismiss-btn" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">Got it!</button>
        `;
        
        document.body.appendChild(overlay);
        this._storyOverlay = overlay;
        
        overlay.querySelector('#story-dismiss-btn').addEventListener('click', () => {
            this._hideStoryOverlay();
        });
    }


    _showStoryOverlay() {
        if (this._storyOverlay) {
            this._storyOverlay.style.display = 'block';
        }
    }

    _hideStoryOverlay() {
        if (this._storyOverlay) {
            this._storyOverlay.style.display = 'none';
        }
    }

    _createSuccessOverlay() {
        if (document.getElementById('scenario-success-overlay')) {
            this._successOverlay = document.getElementById('scenario-success-overlay');
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'scenario-success-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0f1629 0%, #1a2744 100%);
                border: 2px solid #00ff88;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                text-align: center;
                color: white;
                box-shadow: 0 0 60px rgba(0, 255, 136, 0.3);
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #00ff88; margin: 0 0 20px 0; font-size: 28px;">MISSION COMPLETE!</h2>
                <div id="success-message" style="font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 25px;"></div>
                <div id="success-metrics" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                ">
                    <div>
                        <div style="font-size: 28px; color: #ff4757;" id="metric-fps-before">10</div>
                        <div style="font-size: 11px; color: #888;">FPS Before</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; color: #00ff88;" id="metric-fps-after">60</div>
                        <div style="font-size: 11px; color: #888;">FPS After</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; color: #667eea;" id="metric-improvement">+500%</div>
                        <div style="font-size: 11px; color: #888;">Improvement</div>
                    </div>
                </div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="success-continue-btn" style="
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #00ff88 0%, #00d4aa 100%);
                        color: #0a0a14;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                    ">Continue</button>
                    <button id="success-retry-btn" style="
                        padding: 12px 30px;
                        background: transparent;
                        color: #667eea;
                        border: 2px solid #667eea;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Try Again</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this._successOverlay = overlay;
        
        overlay.querySelector('#success-continue-btn').addEventListener('click', () => {
            this._hideSuccessOverlay();
        });
        
        overlay.querySelector('#success-retry-btn').addEventListener('click', () => {
            this._hideSuccessOverlay();
            this.reset();
        });
    }


    _showSuccessOverlay(completion) {
        if (!this._successOverlay) return;
        
        const fpsBefore = this.metrics.fpsBefore || 10;
        const fpsAfter = this.metrics.fpsAfter || completion.fps || 60;
        const improvement = fpsAfter > fpsBefore 
            ? `+${Math.round(((fpsAfter - fpsBefore) / fpsBefore) * 100)}%`
            : 'N/A';
        
        // Update metrics display
        this._successOverlay.querySelector('#metric-fps-before').textContent = fpsBefore;
        this._successOverlay.querySelector('#metric-fps-after').textContent = fpsAfter;
        this._successOverlay.querySelector('#metric-improvement').textContent = improvement;
        this._successOverlay.querySelector('#success-message').textContent = this.story.success;
        
        // Show overlay with animation
        this._successOverlay.style.display = 'flex';
        this._hideInspectorButton();
    }

    _hideSuccessOverlay() {
        if (this._successOverlay) {
            this._successOverlay.style.display = 'none';
        }
    }

    /**
     * Clean up when scenario is disposed
     */
    dispose() {
        if (this._inspectorButton) {
            this._inspectorButton.remove();
        }
        if (this._storyOverlay) {
            this._storyOverlay.remove();
        }
        if (this._successOverlay) {
            this._successOverlay.remove();
        }
    }
}

export default InfiniteForest;
