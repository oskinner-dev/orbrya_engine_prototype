# Orbrya Scenario System - "The Infinite Forest" Test

## Overview

The scenario system implements Orbrya's core "Saboteur" pedagogy: students fix intentionally broken AI-generated code to learn debugging, optimization, and systems thinking.

## Quick Start

### Run the Infinite Forest Scenario

**Option 1: Keyboard Shortcut**
- Press `S` to start the scenario

**Option 2: Console Command**
```javascript
window.orbrya.runInfiniteForest()
```

**Option 3: Dropdown Menu**
- Select "🌲 The Infinite Forest" from the scenario dropdown in the code editor toolbar

### Run Automated Tests
```javascript
// Full test suite (runs 3 times)
window.testRunner.runFullTest()

// Individual tests
window.testRunner.testBrokenState()
window.testRunner.testFixApply()
window.testRunner.testReset()
```

## The Infinite Forest Scenario

### Story
> "The AI tried to populate this forest, but it wrote a buggy loop. The forest is spawning WAY too many trees and the game is lagging. Can you fix the AI's code?"

### Workflow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scene loads | 500 trees spawn, FPS drops to ~10 |
| 2 | Profiler shows RED | FPS < 30, health bars critical |
| 3 | Click "🔍 Inspect AI Code" | Code editor loads buggy code |
| 4 | Find the bug | `while (true)` - infinite loop! |
| 5 | Fix the code | Change to `while (treeCount < 50)` |
| 6 | Click "✅ Apply Fix" | Scene respawns with 50 trees |
| 7 | Profiler shows GREEN | FPS returns to 55-60 |
| 8 | Success overlay | Shows improvement metrics |

### The Buggy Code
```csharp
while (true)  // ← ❌ INFINITE LOOP!
{
    SpawnTree();
    treeCount++;
}
```

### The Fix
```csharp
while (treeCount < 50)  // ✅ Proper termination condition
{
    SpawnTree();
    treeCount++;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Start Infinite Forest scenario |
| `H` | Show hint |
| `R` | Reset current scenario |
| `T` | Cycle tree count (free mode) |
| `L` | Toggle Lite Mode (hide panels) |
| `P` | Toggle profiler panel |

## File Structure

```
src/scenarios/
├── Scenario.js          # Base class for all scenarios
├── InfiniteForest.js    # The Infinite Forest scenario
├── ScenarioManager.js   # Orchestrates scenario lifecycle
└── templates/
    └── TreeSpawner.cs   # C# template for reference

src/utils/
└── ScenarioTestRunner.js # Automated testing
```

## Test Criteria

The test runner validates:

1. **Broken State**
   - FPS < 30 ✓
   - Tree count >= 400 ✓

2. **Fix Application**  
   - FPS >= 45 after fix ✓
   - Tree count <= 100 ✓

3. **Completion Detection**
   - Success overlay displayed ✓
   - Metrics accurately reported ✓

4. **Memory Stability**
   - No significant heap growth between runs ✓
   - No memory leaks detected ✓

5. **Reset Functionality**
   - Returns to broken state ✓
   - All UI elements reset ✓

## API Reference

### ScenarioManager

```javascript
// Load a scenario
await scenarioManager.loadScenario('infinite-forest');

// Get current status
scenarioManager.getStatus();

// Get hint for current scenario
scenarioManager.getHint();

// Reset current scenario
scenarioManager.reset();
```

### Scenario (base class)

```javascript
// Lifecycle methods
await scenario.init();
await scenario.start();
scenario.inspect();
const result = await scenario.apply(code);
const completion = scenario.checkCompletion();
scenario.reset();
```

### ScenarioTestRunner

```javascript
// Run full test suite (3 iterations)
await testRunner.runFullTest();

// Individual tests
await testRunner.testBrokenState();
await testRunner.testFixApply();
await testRunner.testReset();
```

## Creating New Scenarios

1. Extend the `Scenario` base class:

```javascript
import { Scenario } from './Scenario.js';

export class MyNewScenario extends Scenario {
    constructor(sceneController, codeEditor, profiler) {
        super(sceneController, codeEditor, profiler);
        
        this.id = 'my-scenario';
        this.title = 'My New Scenario';
        
        this.buggyCode = `// AI-generated buggy code here`;
        
        this.solutionPatterns = [
            {
                regex: /pattern/,
                feedback: 'Good fix!'
            }
        ];
    }
    
    async start() {
        // Create broken state
        await super.start();
    }
}
```

2. Register in ScenarioManager:

```javascript
this.registerScenario('my-scenario', MyNewScenario);
```

## Performance Notes

- All scenarios must be N4000-safe (Intel Celeron N4000, 4GB RAM)
- Target 30-60 FPS in "fixed" state
- "Broken" state intentionally targets < 30 FPS to demonstrate lag
- GPU instancing keeps draw calls low (2 draw calls per tree type)

## Pedagogical Framework

The "Saboteur" method inverts traditional coding education:

| Traditional | Orbrya "Saboteur" |
|-------------|-------------------|
| Write code from scratch | Fix broken code |
| Abstract concepts | Visual consequences |
| Pass/fail tests | Performance metrics |
| AI does it for you | AI's mistakes teach you |

Students learn to:
- Identify infinite loops
- Understand performance impact
- Write proper termination conditions
- Debug systematically
- Think like systems architects
