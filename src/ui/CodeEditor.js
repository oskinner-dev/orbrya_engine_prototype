/**
 * CodeEditor.js - C# Code Editor with Execution
 * 
 * Features:
 * - Syntax highlighting for C#
 * - Line numbers
 * - Console output with errors/warnings
 * - Integration with CodeExecutor
 * - Real-time validation (debounced)
 */

import { CodeExecutor } from '../engine/CodeExecutor.js';

export class CodeEditor {
    constructor(panelManager, sceneController, profiler = null) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.profiler = profiler;
        this.executor = null;
        this.panel = null;
        
        // DOM elements
        this.codeArea = null;
        this.lineNumbers = null;
        this.consoleOutput = null;
        
        // State
        this.currentScript = '';
        this.parseTimeout = null;
        this.parseDelay = 500; // Debounce for N4000
        
        // C# syntax
        this.keywords = [
            'using', 'namespace', 'class', 'public', 'private', 'protected',
            'static', 'void', 'int', 'float', 'bool', 'string', 'var',
            'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case',
            'break', 'continue', 'return', 'new', 'this', 'null', 'true', 'false',
            'override'
        ];
        
        this.types = [
            'GameObject', 'Transform', 'Vector3', 'MonoBehaviour',
            'Debug', 'Console', 'Math', 'Random', 'Profiler',
            'ForestScene', 'ScenarioBase'
        ];
    }

    init() {
        // Create executor
        this.executor = new CodeExecutor(this.sceneController, this.profiler);
        
        // Wire callbacks
        this.executor.onExecute = (result) => this.onExecuteSuccess(result);
        this.executor.onError = (result) => this.onExecuteError(result);
        
        return this;
    }

    createPanel() {
        const content = document.createElement('div');
        content.className = 'code-editor-wrapper';
        content.innerHTML = `
            <div class="editor-toolbar">
                <select id="script-selector">
                    <option value="TreeSpawner">🌲 TreeSpawner.cs</option>
                    <option value="MemoryDemo">💾 MemoryDemo.cs</option>
                </select>
                <button class="editor-btn" id="validate-btn" title="Validate">✓</button>
                <button class="editor-btn run-btn" id="run-code-btn" title="Run Code">▶ Run</button>
                <button class="editor-btn" id="undo-btn" title="Undo">↩</button>
            </div>
            <div class="code-editor">
                <div class="line-numbers" id="line-numbers"></div>
                <div class="code-area" id="code-area" contenteditable="true" spellcheck="false"></div>
            </div>
            <div class="console-output" id="console-output">
                <div class="console-line info">📝 Ready - Edit the code and click Run</div>
            </div>
        `;

        const saved = this.panelManager?.getSavedState('code-editor-panel');
        this.panel = this.panelManager.createPanel({
            id: 'code-editor-panel',
            title: 'Code Editor',
            icon: '📝',
            x: saved?.x ?? window.innerWidth - 500,
            y: saved?.y ?? 50,
            width: saved?.width ?? 480,
            height: saved?.height ?? 520,
            minWidth: 380,
            minHeight: 300,
            content
        });

        // Cache elements
        this.codeArea = document.getElementById('code-area');
        this.lineNumbers = document.getElementById('line-numbers');
        this.consoleOutput = document.getElementById('console-output');

        // Event listeners
        this.codeArea.addEventListener('input', () => this.onCodeChange());
        this.codeArea.addEventListener('scroll', () => this.syncScroll());
        this.codeArea.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        document.getElementById('run-code-btn').addEventListener('click', () => this.runCode());
        document.getElementById('validate-btn').addEventListener('click', () => this.validateCode());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoCode());
        document.getElementById('script-selector').addEventListener('change', (e) => this.loadScript(e.target.value));

        // Load default
        this.loadScript('TreeSpawner');
        return this.panel;
    }

    loadScript(name) {
        const scripts = {
            TreeSpawner: `// ════════════════════════════════════════════
// ORBRYA SCENARIO: Forest Optimization
// ════════════════════════════════════════════
// 
// 🔴 PROBLEM: The AI spawned infinite trees!
// The frame rate has crashed. Fix the bug!
//
// 🎯 TASK: Change the while condition to limit trees
// 💡 HINT: Try "treeCount < 50"
// ════════════════════════════════════════════

using Orbrya.Engine;

public class TreeSpawner : ScenarioBase
{
    private int treeCount = 0;

    public void SpawnTrees()
    {
        treeCount = 0;
        
        // ╔══════════════════════════════════════╗
        // ║  🔧 FIX THE BUG BELOW!               ║
        // ╚══════════════════════════════════════╝
        
        while (true)  // ← ❌ INFINITE LOOP!
        {
            SpawnTree();
            treeCount++;
        }
        
        // ════════════════════════════════════════
        // ✅ Change "true" to: treeCount < 50
        // ════════════════════════════════════════
        
        Debug.Log($"Spawned {treeCount} trees");
    }
}`,

            MemoryDemo: `// ════════════════════════════════════════════
// ORBRYA SCENARIO: Memory Management
// ════════════════════════════════════════════
//
// Learn how object count affects RAM usage
// ════════════════════════════════════════════

using Orbrya.Engine;

public class MemoryDemo : ScenarioBase
{
    public int objectCount = 100;

    public void CreateObjects()
    {
        // Try different values:
        // 50  = Low memory usage
        // 200 = Medium memory usage  
        // 500 = High memory usage
        
        while (treeCount < objectCount)
        {
            SpawnTree();
            treeCount++;
        }
    }
}`
        };

        this.currentScript = scripts[name] || scripts.TreeSpawner;
        this.codeArea.textContent = this.currentScript;
        this.highlightSyntax();
        this.updateLineNumbers();
        this.log('info', `📂 Loaded ${name}.cs`);
    }

    // ========== EXECUTION METHODS ==========

    runCode() {
        const code = this.codeArea.textContent;
        this.log('info', '▶ Running code...');
        
        const result = this.executor.execute(code);
        
        // Result handled by callbacks
        return result;
    }

    validateCode() {
        const code = this.codeArea.textContent;
        const result = this.executor.validate(code);
        
        if (result.valid) {
            this.log('success', `✓ Valid! Will spawn ${result.limit} trees`);
            result.warnings.forEach(w => this.log('warning', w));
        } else {
            result.errors.forEach(e => this.log('error', e));
        }
        
        return result;
    }

    undoCode() {
        const result = this.executor.undo();
        if (result.success) {
            this.log('info', `↩ Reverted to ${result.treeCount} trees`);
        } else {
            this.log('warning', result.message || 'Nothing to undo');
        }
    }

    onExecuteSuccess(result) {
        this.log('success', `✅ Spawned ${result.treeCount} trees`);
        
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => this.log('warning', w));
        }
        
        // Show FPS change after delay
        setTimeout(() => {
            const fps = this.profiler?.metrics?.fps;
            if (fps !== null) {
                const emoji = fps >= 45 ? '🟢' : fps >= 30 ? '🟡' : '🔴';
                this.log('info', `${emoji} Current FPS: ${fps}`);
            }
        }, 1500);
    }

    onExecuteError(result) {
        result.errors.forEach(e => this.log('error', e));
    }

    // ========== CONSOLE OUTPUT ==========

    log(type, message) {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = message;
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
        
        // Limit console lines
        while (this.consoleOutput.children.length > 50) {
            this.consoleOutput.removeChild(this.consoleOutput.firstChild);
        }
    }

    clearConsole() {
        this.consoleOutput.innerHTML = '<div class="console-line info">Console cleared</div>';
    }

    // ========== EDITOR FUNCTIONALITY ==========

    onCodeChange() {
        clearTimeout(this.parseTimeout);
        this.parseTimeout = setTimeout(() => {
            this.highlightSyntax();
            this.updateLineNumbers();
        }, this.parseDelay);
    }

    handleKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
        // Ctrl+Enter to run
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            this.runCode();
        }
    }

    syncScroll() {
        this.lineNumbers.scrollTop = this.codeArea.scrollTop;
    }

    updateLineNumbers() {
        const lines = this.codeArea.textContent.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div>${i}</div>`;
        }
        this.lineNumbers.innerHTML = html;
    }

    highlightSyntax() {
        let code = this.codeArea.textContent;
        
        // Save cursor
        const selection = window.getSelection();
        let cursorOffset = 0;
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(this.codeArea);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorOffset = preCaretRange.toString().length;
        }

        // Escape HTML
        code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Highlight
        code = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        code = code.replace(/(".*?")/g, '<span class="string">$1</span>');
        code = code.replace(/\b(\d+\.?\d*f?)\b/g, '<span class="number">$1</span>');
        
        const kwPattern = new RegExp(`\\b(${this.keywords.join('|')})\\b`, 'g');
        code = code.replace(kwPattern, '<span class="keyword">$1</span>');
        
        const typePattern = new RegExp(`\\b(${this.types.join('|')})\\b`, 'g');
        code = code.replace(typePattern, '<span class="type">$1</span>');
        
        // Apply
        this.codeArea.innerHTML = code;
        
        // Restore cursor
        this.restoreCursor(cursorOffset);
    }

    restoreCursor(offset) {
        const selection = window.getSelection();
        const range = document.createRange();
        
        let currentOffset = 0;
        const walker = document.createTreeWalker(this.codeArea, NodeFilter.SHOW_TEXT);
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const len = node.length;
            
            if (currentOffset + len >= offset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
            currentOffset += len;
        }
    }

    getCode() {
        return this.codeArea.textContent;
    }

    setCode(code) {
        this.codeArea.textContent = code;
        this.highlightSyntax();
        this.updateLineNumbers();
    }
}
