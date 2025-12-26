/**
 * CodeEditor.js - C# Code Editor for Orbrya
 * 
 * Features:
 * - Syntax highlighting for C#
 * - Line numbers
 * - Error highlighting
 * - Console output
 * - Real-time code validation
 * 
 * Uses debouncing (300ms) for performance on N4000
 */

export class CodeEditor {
    constructor(panelManager, sceneController) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.panel = null;
        this.codeArea = null;
        this.lineNumbers = null;
        this.consoleOutput = null;
        
        // Current script state
        this.currentScript = '';
        this.errors = [];
        
        // Debounce timer for parsing
        this.parseTimeout = null;
        this.parseDelay = 300; // N4000 optimized debounce
        
        // C# keywords for highlighting
        this.keywords = [
            'using', 'namespace', 'class', 'public', 'private', 'protected',
            'static', 'void', 'int', 'float', 'bool', 'string', 'var',
            'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case',
            'break', 'continue', 'return', 'new', 'this', 'base', 'null',
            'true', 'false', 'try', 'catch', 'finally', 'throw'
        ];
        
        this.types = [
            'GameObject', 'Transform', 'Vector3', 'Quaternion', 'MonoBehaviour',
            'Rigidbody', 'Collider', 'Material', 'Mesh', 'Color',
            'Console', 'Debug', 'Time', 'Input', 'Math', 'Random'
        ];
    }


    createPanel() {
        const content = document.createElement('div');
        content.className = 'code-editor-wrapper';
        content.innerHTML = `
            <div class="editor-toolbar">
                <select id="script-selector">
                    <option value="TreeSpawner">TreeSpawner.cs</option>
                    <option value="PerformanceDemo">PerformanceDemo.cs</option>
                </select>
                <button class="run-btn" id="run-code-btn">▶ Run</button>
            </div>
            <div class="code-editor">
                <div class="line-numbers" id="line-numbers"></div>
                <div class="code-area" id="code-area" contenteditable="true" spellcheck="false"></div>
            </div>
            <div class="console-output" id="console-output">
                <div class="console-line info">[Console] Ready</div>
            </div>
        `;

        // Create panel
        const saved = this.panelManager.getSavedState('code-editor-panel');
        this.panel = this.panelManager.createPanel({
            id: 'code-editor-panel',
            title: 'Code Editor',
            icon: '📝',
            x: saved?.x ?? window.innerWidth - 560,
            y: saved?.y ?? 50,
            width: saved?.width ?? 450,
            height: saved?.height ?? 500,
            minWidth: 350,
            minHeight: 250,
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
        
        document.getElementById('run-code-btn').addEventListener('click', () => {
            this.runCode();
        });
        
        document.getElementById('script-selector').addEventListener('change', (e) => {
            this.loadScript(e.target.value);
        });

        // Load default script
        this.loadScript('TreeSpawner');

        return this.panel;
    }

    loadScript(name) {
        const scripts = {
            TreeSpawner: `// TreeSpawner.cs - Control tree count
// FIX: The AI made the tree count too high!
// Edit the maxTrees value to improve FPS

using UnityEngine;

public class TreeSpawner : MonoBehaviour
{
    // TODO: Lower this value to fix performance
    public int maxTrees = 500;  // ⚠️ Too many trees!
    
    void Start()
    {
        // Spawn trees in the scene
        for (int i = 0; i < maxTrees; i++)
        {
            SpawnTree();
        }
        
        Debug.Log("Spawned " + maxTrees + " trees");
    }
    
    void SpawnTree()
    {
        Vector3 position = new Vector3(
            Random.Range(-45f, 45f),
            0,
            Random.Range(-45f, 45f)
        );
        
        // Create tree at position
        Instantiate(treePrefab, position, Quaternion.identity);
    }
}`,


            PerformanceDemo: `// PerformanceDemo.cs - Learn optimization
// Watch how changes affect the FPS counter

using UnityEngine;

public class PerformanceDemo : MonoBehaviour
{
    // Control scene complexity
    public int objectCount = 100;
    public bool useInstancing = true;
    
    void Update()
    {
        // Check if we should optimize
        if (useInstancing)
        {
            // Good: GPU instancing reduces draw calls
            RenderWithInstancing();
        }
        else
        {
            // Bad: Many individual draw calls
            RenderIndividually();
        }
    }
    
    void RenderWithInstancing()
    {
        // Single draw call for all instances
        Graphics.DrawMeshInstanced(mesh, 0, material, matrices);
    }
    
    void RenderIndividually()
    {
        // WARNING: This causes many draw calls!
        foreach (var obj in objects)
        {
            Graphics.DrawMesh(mesh, obj.transform.position);
        }
    }
}`
        };

        this.currentScript = scripts[name] || '';
        this.codeArea.textContent = this.currentScript;
        this.highlightSyntax();
        this.updateLineNumbers();
        this.log('info', `Loaded ${name}.cs`);
    }


    onCodeChange() {
        // Debounce for N4000 performance
        clearTimeout(this.parseTimeout);
        this.parseTimeout = setTimeout(() => {
            this.highlightSyntax();
            this.updateLineNumbers();
            this.parseCode();
        }, this.parseDelay);
    }

    handleKeyDown(e) {
        // Tab handling
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
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
        
        // Store cursor position
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const cursorOffset = range ? this.getCaretOffset(this.codeArea) : 0;


        // Escape HTML
        code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Highlight comments
        code = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        
        // Highlight strings
        code = code.replace(/(".*?")/g, '<span class="string">$1</span>');
        
        // Highlight numbers
        code = code.replace(/\b(\d+\.?\d*f?)\b/g, '<span class="number">$1</span>');
        
        // Highlight keywords
        const keywordPattern = new RegExp(`\\b(${this.keywords.join('|')})\\b`, 'g');
        code = code.replace(keywordPattern, '<span class="keyword">$1</span>');
        
        // Highlight types
        const typePattern = new RegExp(`\\b(${this.types.join('|')})\\b`, 'g');
        code = code.replace(typePattern, '<span class="type">$1</span>');
        
        // Update content
        this.codeArea.innerHTML = code;
        
        // Restore cursor
        if (range && this.codeArea.childNodes.length > 0) {
            this.setCaretOffset(this.codeArea, cursorOffset);
        }
    }

    getCaretOffset(element) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(element);
        range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
        return range.toString().length;
    }


    setCaretOffset(element, offset) {
        const selection = window.getSelection();
        const range = document.createRange();
        
        let currentOffset = 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (currentOffset + node.length >= offset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
            currentOffset += node.length;
        }
    }

    parseCode() {
        const code = this.codeArea.textContent;
        this.errors = [];
        
        // Parse maxTrees value and apply to scene
        const treeMatch = code.match(/maxTrees\s*=\s*(\d+)/);
        if (treeMatch) {
            const count = parseInt(treeMatch[1]);
            if (this.sceneController) {
                this.sceneController.spawnTrees(Math.min(count, 705));
                this.log('success', `Applied: maxTrees = ${count}`);
                
                if (count > 175) {
                    this.log('warning', `⚠️ High tree count may impact FPS`);
                }
            }
        }
    }


    runCode() {
        this.log('info', 'Compiling...');
        
        setTimeout(() => {
            this.parseCode();
            this.log('success', '✓ Code executed successfully');
        }, 300);
    }

    log(type, message) {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = message;
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
        
        // Keep max 50 lines
        while (this.consoleOutput.children.length > 50) {
            this.consoleOutput.removeChild(this.consoleOutput.firstChild);
        }
    }

    clearConsole() {
        this.consoleOutput.innerHTML = '<div class="console-line info">[Console] Cleared</div>';
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

