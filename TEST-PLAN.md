# TEST-PLAN.md

Test strategy reverse-engineered from codebase. References only surviving code after Phase 1 cleanup.

---

## 1. Tooling

| Layer | Tool | Why |
|-------|------|-----|
| Unit + Integration | Vitest + React Testing Library | Shares Vite config, zero extra bundler setup |
| E2E | Playwright | Real canvas interactions, screenshot comparison |
| Coverage | v8 via Vitest | `--coverage` flag |
| CI | GitHub Actions | Runs on push/PR |

### Setup

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom canvas @playwright/test
```

Add to `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.js',
  globals: true,
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
}
```

---

## 2. Unit Test Targets (Pure Functions, Static Methods)

### P0 — Critical Path

**`src/services/ShapeOperations.js`** (~30 tests)

| Method | Key Cases |
|--------|-----------|
| `isPointNearLine()` | On line, at threshold, beyond, zero-length |
| `isPointInRect()` / `isPointInEllipse()` | Inside, outside, edge |
| `isPointNearRect()` / `isPointNearEllipse()` | Near edge, far inside, far outside |
| `isPointOnStroke()` | Multi-segment hit, miss between segments |
| `isPointOnText()` | Inside text bounds, outside |
| `getBoundsFromPoints()` | Empty array, single point, multiple |
| `getShapeBounds()` | Each shape type; negative width normalization |
| `boundsIntersect()` | Overlapping, adjacent, disjoint, contained |
| `moveShape()` | Each type moves correctly; stroke points shifted; image updated |
| `calculateNewBounds()` | Each handle (n/s/e/w/nw/ne/sw/se) |
| `resizeShape()` | Rect/ellipse; text font-size min 8px; arrow endpoint scaling |
| `findShapeAtPosition()` | Topmost shape; hidden layer skipped; empty canvas null |
| `findShapesInRect()` | Marquee selects intersecting; ignores hidden |

**`src/layers/LayerManager.js`** (~15 tests)

| Method | Key Cases |
|--------|-----------|
| `createLayer()` | Auto-increments name; auto-selects |
| `deleteLayer()` | Removes; auto-selects remaining; last layer blocked |
| `moveLayer()` | Up/down reorders; no-op at boundaries |
| `toggleVisibility()` | Toggles boolean |
| `undo()` / `redo()` | Restores state; redo after undo; no-op at boundaries |
| `addShapeToLayer()` | Each shape type pushed to correct array |

### P1 — High Value, Fast Wins

**`src/utils/geometry.js`** (~20 tests)

| Function | Cases |
|----------|-------|
| `distance()` | Same point=0, known triangle (3-4-5), negatives |
| `angle()` | 0/90/180 degrees, negative angle |
| `midpoint()` | Symmetric, negatives, same point |
| `clamp()` | Below/above/within/boundary |
| `isPointInRect()` | Inside, outside, edge, zero-width |
| `isPointInEllipse()` | Center, boundary, outside, degenerate |
| `closestPointOnLine()` | Mid-projection, closest to start/end, zero-length |

**`src/factories/ShapeFactory.js`** (~10 tests)

| Method | Cases |
|--------|-------|
| `create('stroke', ...)` | Returns points array with start position |
| `create('arrow', ...)` | fromX/fromY/toX/toY set correctly |
| `create('rect', ...)` | Negative dimensions normalize |
| `create('text', ...)` | Content, position, fontSize |
| `create('unknown')` | Throws error |
| `isSupported()` | Valid=true, invalid=false |

**`src/commands/ShapeCommands.js`** (~15 tests)

| Class | Cases |
|-------|-------|
| `AddShapeCommand` | execute adds, undo removes, redo re-adds |
| `DeleteShapeCommand` | execute removes + stores, undo re-inserts at index |
| `MoveShapeCommand` | execute +dx/+dy, undo -dx/-dy |
| `CommandManager` | History navigation; mid-history execute truncates; canUndo/canRedo; clear() |

**`src/utils/shapeClipboard.js`** (~10 tests)

| Function | Cases |
|----------|-------|
| `serializeShapesToClipboard()` | Valid shapes serialize; null skipped |
| `deserializeShapesFromClipboard()` | Valid JSON parses; invalid returns null |
| `pasteShapesIntoLayer()` | Each type offset correctly; stroke points shifted |
| `calculateIncrementalOffset()` | Sequential increments |
| `ClipboardStateManager` | reset/getAndIncrement/hasChanged/updateContent |

### P2 — Supporting

**`src/utils/colorUtils.js`** (~12 tests)

| Function | Cases |
|----------|-------|
| `hexToRgb()` | Valid hex, invalid returns null, with/without # |
| `rgbToHex()` | Round-trip with hexToRgb; boundary values; fractional rounding |
| `parseColor()` | Hex, rgb(), rgba(), invalid |
| `lightenColor()` | 0%=unchanged, 100%=white, invalid hex |
| `getContrastColor()` | Dark bg=#FFFFFF, light bg=#000000 |

**`src/utils/performance.js`** (~8 tests, use `vi.useFakeTimers`)

| Function | Cases |
|----------|-------|
| `debounce()` | Fires after wait; cancel prevents; rapid calls fire once |
| `throttle()` | Fires immediately; suppresses during wait; trailing call |
| `Lazy` | .get() computes once; cached on second call; .reset() recomputes |

**`src/utils/errorHandling.js`** (~5 tests)

| Function | Cases |
|----------|-------|
| `handleError()` | Returns friendly string per error code; unknown=default; logs via console.error |
| `safeExecute()` | Success returns result; throw returns fallback; error logged |

**`src/builders/LayerBuilder.js`** (~8 tests)

| Class | Cases |
|-------|-------|
| `LayerBuilder` | Fluent chain; build() resets; setOpacity clamps 0-1 |
| `RectBuilder.fromCorners()` | Normalizes negative coords |
| `EllipseBuilder.asCircle()` | Width=height |
| `BuilderDirector.createSimpleLayer()` | Name and color set |

---

## 3. Integration Test Targets

**Hooks** (require `renderHook` + mock refs)

| Hook | Key Tests |
|------|-----------|
| `useShapeOperations` | deleteSelectedShape removes + clears; clearSelection resets state; selectShape sets ref |
| `useTextEditing` | startEditing sets state; cancelEditing clears |
| `useShapeProperties` | getShapeData retrieves correct shape; color/size getters with fallbacks |
| `useKeyboardShortcuts` | Delete calls deleteSelectedShape; Ctrl+Z/Shift+Z undo/redo; Ctrl+C/V clipboard; tool keys |
| `useLayerOperations` | updateLayerColor updates manager; getLayerPreviewText truncates |

**Components** (require `render` + React Testing Library)

| Component | Key Tests |
|-----------|-----------|
| `ErrorBoundary` | Renders children; catches error renders fallback |
| `ToolsPanel` | Renders 7 tool buttons; click changes tool |
| `LayersPanel` | Renders layers; add/delete/rename/reorder/visibility interactions |
| `ShapeOptionsPanel` | Shows color picker + size slider for selection |
| `KeyboardShortcutsModal` | Opens/closes; lists shortcuts |
| `Snackbar` | Shows message; auto-dismisses |

---

## 4. E2E Critical User Journeys (Playwright)

| # | Journey | Steps | Validates |
|---|---------|-------|-----------|
| 1 | Draw + Select rectangle | Rect tool, drag, Select tool, click inside | Drawing, hit detection, selection |
| 2 | Multi-tool session | Draw stroke, arrow, ellipse, text | All 4 annotation tools work |
| 3 | Undo/Redo cycle | Draw 3 shapes, Ctrl+Z x3, Ctrl+Shift+Z x3 | History integrity |
| 4 | Copy/Paste with offset | Draw rect, Ctrl+C, Ctrl+V x2 | Clipboard, incremental offset |
| 5 | Layer management | Create layer, draw, toggle visibility, delete | Layer CRUD, visibility |
| 6 | Zoom + Pan + Reset | Draw, zoom in, pan, reset view | Navigation, coordinate transforms |
| 7 | Export PNG | Draw shapes, click Download | Export pipeline, file download |
| 8 | Shape resize | Draw rect, select, drag handle | Resize handle detection, bounds update |
| 9 | Keyboard shortcuts | Press 1-7 for tools, +/- for zoom | Shortcut bindings |
| 10 | Image paste | Paste image from clipboard | Image layer creation |

---

## 5. Priority Matrix

| Risk Level | Modules | Rationale |
|------------|---------|-----------|
| **P0** Critical | ShapeOperations, LayerManager, E2E journeys 1-5 | Selection, drawing, data integrity break everything |
| **P1** High | geometry.js, ShapeFactory, ShapeCommands, shapeClipboard, ToolHandler | Core creation + manipulation paths |
| **P2** Medium | colorUtils, components, hooks, CanvasManager | UI/cosmetic, recoverable failures |
| **P3** Low | performance.js, errorHandling.js, ShapeRenderer | Performance/polish, no data loss |

---

## 6. Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| `src/utils/` | 95% | Pure functions, exhaustively testable |
| `src/services/ShapeOperations.js` | 90% | Critical path |
| `src/layers/LayerManager.js` | 90% | Core data layer |
| `src/factories/`, `src/builders/`, `src/commands/` | 90% | Simple classes |
| `src/canvas/CanvasManager.js` | 75% | Requires canvas mock |
| `src/tools/ToolHandler.js` | 80% | Complex orchestration |
| `src/hooks/` | 70% | Heavy React coupling |
| `src/components/` | 70% | UI rendering |
| `src/renderers/` | 60% | Canvas drawing hard to assert |
| **Overall** | **80%** | |

---

## 7. Test Data Strategy

### Fixtures (`src/test/fixtures/`)

```js
// shapes.js
export const testRect = { x: 100, y: 100, width: 200, height: 150, size: 2, color: '#ff0000', lineStyle: 'solid' }
export const testArrow = { fromX: 10, fromY: 10, toX: 200, toY: 150, size: 2, color: '#0000ff', lineStyle: 'solid' }
export const testStroke = { size: 3, color: '#000000', lineStyle: 'solid', points: [{x:10,y:10},{x:50,y:50},{x:100,y:30}] }
export const testEllipse = { x: 50, y: 50, width: 100, height: 80, size: 2, color: '#00ff00', lineStyle: 'solid' }
export const testText = { content: 'Hello', x: 100, y: 100, fontSize: 20, color: '#000000' }
```

### Helpers (`src/test/helpers/`)

```js
// createTestLayerManager.js
export const createTestLayerManager = (layers = []) => {
  const lm = new LayerManager()
  layers.forEach(l => { lm.layers.push(l); lm.selectedId = l.id })
  return lm
}

// points.js
export const point = (x, y) => ({ x, y })
export const rect = (x, y, w, h) => ({ x, y, width: w, height: h })
```

### E2E Strategy

Start from blank canvas (default state). Pre-existing shapes created via UI interactions in `beforeEach`, not state injection, to validate full paths.
