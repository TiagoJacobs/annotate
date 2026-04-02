# REQUIREMENTS.md

Reverse-engineered from the codebase and commit history. Every requirement below is verified against actual code — no aspirational items.

---

## 1. Purpose

Annotate is a client-side canvas annotation tool. Users paste images from their clipboard and draw annotations (pen, arrows, rectangles, ellipses, text) with no server-side component. Deployed to GitHub Pages.

---

## 2. Functional Requirements

### FR-DRAW: Drawing Tools

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-DRAW-01 | Pen tool draws freehand strokes as continuous point arrays | Color, size (1-50px, default 3), lineStyle |
| FR-DRAW-02 | Arrow tool draws arrows from start to end point | Head length: `max(6, 8 + log(size) * 6)`, head angle: 30deg |
| FR-DRAW-03 | Rectangle tool draws rectangles via diagonal drag | Color, size (1-50px, default 2), lineStyle |
| FR-DRAW-04 | Ellipse tool draws ellipses via bounding-box drag | Color, size (1-50px, default 2), lineStyle |
| FR-DRAW-05 | Text tool places text at click position, triggers inline editing | Color, fontSize (10-100px, default 20) |
| FR-DRAW-06 | All shape tools show live preview during drag | Preview cleared on mouseup |
| FR-DRAW-07 | Line styles: solid, dashed, dotted, dashdot | Applied to pen, arrow, rect, ellipse |
| FR-DRAW-08 | Text inline editor: Enter saves, Escape cancels, empty text discarded | Activated on placement or double-click |
| FR-DRAW-09 | Auto-switch to select tool after text placement | Prevents accidental sequential text additions |
| FR-DRAW-10 | Starting a new drawing clears any active shape selection | Applies to all drawing tools |

### FR-SEL: Selection & Manipulation

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-SEL-01 | Select tool: click to select single shape | Shape reference: `{layerId, shapeType, shapeIndex}` |
| FR-SEL-02 | Shift+Click adds/removes shapes from multi-selection | Multi-selection stored as array |
| FR-SEL-03 | Marquee selection via click-drag on empty space | Blue dashed rect with 10% fill |
| FR-SEL-04 | Ctrl+A selects all shapes from all visible layers | Auto-switches to select tool |
| FR-SEL-05 | Selection box: dashed blue (#667eea), 5px padding | |
| FR-SEL-06 | Resize handles for rect/ellipse/stroke: 8px squares (corners+edges) | Blue fill, white stroke |
| FR-SEL-07 | Arrow endpoint dragging: 2 handles at start and arrow head tip | Replaces bounding-box resize for arrows; handles account for head size |
| FR-SEL-08 | Drag selected shapes to move | Applies to single and multi-selection |
| FR-SEL-09 | Arrow keys move selected shapes (1px normal, 10px Shift) | |
| FR-SEL-10 | Delete/Backspace removes selected shape(s) | |
| FR-SEL-11 | Editing color/size/lineStyle on selection updates all selected shapes | |
| FR-SEL-12 | Hit detection: rects and ellipses are selectable by clicking inside fill area | Not just near stroke edges |
| FR-SEL-13 | Hit detection threshold: half the stroke width | `(size \|\| 3) / 2` |
| FR-SEL-14 | Shape options panel hidden when image is selected | No color/weight/style controls for images |
| FR-SEL-15 | Multi-selection preserved when clicking inside bounds for dragging | Prevents accidental deselection |

### FR-NAV: Canvas Navigation

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-NAV-01 | Zoom via scroll wheel, +/- keys, or toolbar buttons | Range: 0.1-10, step: 0.1 |
| FR-NAV-02 | Scroll wheel zoom updates zoom percentage display in real time | |
| FR-NAV-03 | Pan via pan tool, middle mouse button, or arrow keys | Arrow: 20px normal, 50px Shift |
| FR-NAV-04 | Reset View button restores zoom=1.0 at origin | |
| FR-NAV-05 | Minimap auto-shown when content extends beyond viewport | Fixed 200x150px, interactive click/drag to pan |
| FR-NAV-06 | Minimap uses world-space coordinates | Content at absolute positions, not centered |
| FR-NAV-07 | Grid background: 50px squares | Rendered behind all content |
| FR-NAV-08 | Dynamic cursor based on context | See FR-CURSOR below |

### FR-CURSOR: Cursor Behavior

| Context | Cursor |
|---------|--------|
| Drawing tool active | Crosshair |
| Pan tool active | Grab |
| Hovering over unselected shape (select tool) | Pointer |
| Hovering over selected shape or inside multi-selection bounds | Move |
| Hovering over resize handle | Directional resize (nw, ne, sw, se, n, s, e, w) |
| Arrow endpoint handle | Crosshair |
| Text tool | Text (I-beam) |

### FR-LAY: Layer Management

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-LAY-01 | App initializes with one layer ("Layer 1") | Minimum 1 layer enforced |
| FR-LAY-02 | Add layer via + button | Default name: "Layer N" (auto-incrementing) |
| FR-LAY-03 | Delete layer via X button | Disabled when only 1 layer; tooltip: "Cannot delete last layer" |
| FR-LAY-04 | Toggle layer visibility via eye icon | Hidden layers not rendered or selectable |
| FR-LAY-05 | Reorder layers via up/down buttons | Disabled at stack boundaries |
| FR-LAY-06 | Rename layer via double-click | Enter saves, Escape cancels, trims whitespace |
| FR-LAY-07 | Clear canvas: trash button deletes all layers and resets | |
| FR-LAY-08 | Drawing only allowed when active layer exists | Shows toast: "Please create a layer first to draw shapes" |
| FR-LAY-09 | Layers displayed in reverse rendering order | Top in list = rendered last (visually on top) |
| FR-LAY-10 | Each layer supports multiple shapes of different types | Not one-shape-per-layer |
| FR-LAY-11 | Layer auto-selected after undo/redo | Ensures consistent state |

### FR-CLIP: Clipboard Operations

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-CLIP-01 | Ctrl+C copies selected shapes to localStorage | Key: `annotate-shapes-clipboard` |
| FR-CLIP-02 | Ctrl+V pastes shapes into current layer with incremental offset | Offset: 20px * (paste_count + 1); resets on new copy |
| FR-CLIP-03 | Image paste from system clipboard creates new image layer | MIME type: `image/*` |
| FR-CLIP-04 | Image dimensions scaled by devicePixelRatio | Prevents oversized images on high-DPI displays |
| FR-CLIP-05 | Pasting image into layer that already has an image creates new layer | Avoids overwriting existing image |
| FR-CLIP-06 | Shape paste takes priority over image paste | Image paste only when no shapes in localStorage clipboard |
| FR-CLIP-07 | Auto-switch to select tool and select image layer after image paste | |

### FR-EXP: Import/Export

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-EXP-01 | Copy to clipboard as PNG (cropped to content bounds) | Transparent background |
| FR-EXP-02 | Download as PNG (cropped to content bounds) | Filename: `annotated-image.png` |
| FR-EXP-03 | Download as SVG (embedded canvas image) | Filename: `annotated-image.svg`, white background |
| FR-EXP-04 | Format selector: PNG (default) or SVG | Dropdown in toolbar |
| FR-EXP-05 | Export includes content at negative coordinates | No clamping to (0,0) |
| FR-EXP-06 | Export excludes selection UI (bounding box, resize handles) | Clean render before capture |

### FR-UNDO: Undo/Redo

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-UNDO-01 | Ctrl+Z undoes last completed action | Per-layer history |
| FR-UNDO-02 | Ctrl+Shift+Z redoes last undone action | |
| FR-UNDO-03 | History records only completed actions (mouseup/keyup) | Intermediate steps (dragging, drawing) not recorded |
| FR-UNDO-04 | Separate `updateLayer()` (no history) vs `updateLayerWithHistory()` | Drawing previews use no-history; finished shapes use with-history |

### FR-KB: Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1-7 | Select tool (pen, arrow, rect, ellipse, text, select, pan) |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Ctrl+C / Ctrl+V | Copy / Paste shapes |
| Ctrl+A | Select all shapes (auto-switches to select tool) |
| Delete / Backspace | Delete selected |
| +/- | Zoom in/out |
| Arrow keys | Move selection (1px/10px) or pan canvas (20px/50px) |
| C | Focus color picker |
| W | Focus line weight slider |
| S | Focus line style selector |
| K | Show keyboard shortcuts modal |
| Escape | Clear selection |

### FR-UI: UI Elements

| ID | Requirement | Constraint |
|----|-------------|------------|
| FR-UI-01 | GitHub repo link in toolbar | Icon at end of toolbar, links to repository |
| FR-UI-02 | Shape options toolbar always visible with fixed height | Prevents layout shift when controls appear/disappear |
| FR-UI-03 | Snackbar for transient notifications | Success/error messages, auto-dismiss |
| FR-UI-04 | Keyboard shortcuts modal (K key) | Categorized display, close with Escape |
| FR-UI-05 | Image caching during renders | Prevents blinking on canvas re-render |

---

## 3. Data Model

### Layer
```
{ id, name, visible, opacity, color,
  strokes[], arrows[], rects[], ellipses[], texts[], image }
```

### Shape Properties
| Type | Properties |
|------|-----------|
| stroke | points[{x,y}], color, size, lineStyle |
| arrow | fromX, fromY, toX, toY, color, size, lineStyle |
| rect | x, y, width, height, color, size, lineStyle |
| ellipse | x, y, width, height, color, size, lineStyle |
| text | x, y, content, fontSize, color |
| image | data (dataURL), x, y, width, height |

### Selection Reference
```
Single: { layerId, shapeType, shapeIndex }
Multi:  [{ layerId, shapeType, shapeIndex }, ...]
```

---

## 4. Rendering Order

Per layer (bottom to top): image, strokes, arrows, rects, ellipses, texts.
Layers rendered in array order (first = bottom). Selection UI rendered on top of all layers.

---

## 5. Persistence

Tool properties auto-saved to localStorage with `annotate_` prefix: tool, color, brushSize, fontSize, lineStyle. Clipboard data stored under `annotate-shapes-clipboard`.

---

## 6. Constraint Values

| Constraint | Value |
|-----------|-------|
| Zoom range | 0.1 - 10 |
| Zoom step | 0.1 |
| Brush size range | 1 - 50px |
| Font size range | 10 - 100px |
| Min text font size (resize) | 8px |
| Grid size | 50px |
| Resize handle size | 8px |
| Handle hit threshold | 10px |
| Line hit threshold | half stroke width (`(size \|\| 3) / 2`) |
| Selection padding | 5px |
| Canvas update interval | 100ms |
| Pan amount (arrows) | 20px / 50px (Shift) |
| Move amount (selected) | 1px / 10px (Shift) |
| Paste offset base | 20px |
| Minimap size | 200 x 150px |
| Default color | #000000 |
| Default tool | pen |
| Default brush size | 3px |
| Default font size | 20px |
| Default line style | solid |

---

## 7. Known Gaps

- No persistent canvas save/load (layers lost on page reload beyond tool preferences)
- No touch/mobile gesture support
- Text width approximation uses fixed 0.6 factor (may not match rendered width)
- SVG export embeds rasterized canvas, not true SVG shapes
- No aspect ratio lock during shape resize
- Pan/zoom not bounded to content area (can scroll infinitely)
