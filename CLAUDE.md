# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint (JS/JSX files, ignores `dist/`)
- `npm run preview` — Preview production build locally

No test framework is configured. Linting is the only automated check.

## Project Overview

Annotate is a client-side canvas annotation tool built with React 19 and Vite. Users paste images from clipboard and draw annotations (pen, arrows, rectangles, ellipses, text) with no server-side component. Deployed to GitHub Pages at `/annotate/` base path.

## Architecture

### State Management

No external state library. State lives in `App.jsx` and is managed through 11 custom hooks in `src/hooks/` that extract specific concerns (rendering, events, keyboard shortcuts, layer ops, shape ops, viewport, etc.). The hooks are the primary way business logic is organized.

### Design Patterns (in `src/`)

- **Factory** (`factories/ShapeFactory.js`) — Centralizes shape creation
- **Builder** (`builders/LayerBuilder.js`) — Fluent interface for layer construction
- **Command** (`commands/ShapeCommands.js`) — Undo/redo via encapsulated action objects
- **Strategy** (`renderers/ShapeRenderer.js`) — Per-shape-type rendering strategies
- **Tool Registry** (`tools/toolRegistry.js`) — Declarative tool definitions (pen, arrow, rect, ellipse, text, select, pan) with icons, cursors, properties, and handlers. New tools are added here.

### Key Layers

| Directory | Role |
|-----------|------|
| `components/` | React UI components (CanvasArea, ToolsPanel, LayersPanel, ShapeOptionsPanel, Minimap, etc.) |
| `hooks/` | Custom React hooks — primary logic organization layer |
| `services/` | Business logic (CanvasService, ShapeOperations) |
| `canvas/` | CanvasManager — rendering, zoom, pan, coordinate transforms |
| `layers/` | LayerManager — layer CRUD, ordering, history tracking |
| `tools/` | ToolHandler + strategies for tool-specific behavior |
| `utils/` | Pure functions: geometry, color, performance (debounce/throttle), error handling, clipboard, export |
| `config/` | Centralized constants (uiConstants.js, shapeConfig.js, renderConfig.js) |

### Important Conventions

- Icons come from `lucide-react`
- UI constants (zoom limits, brush size range, handle sizes, hit detection thresholds) are centralized in `config/uiConstants.js`
- Shape types and their array property mappings are in `config/shapeConfig.js`
- The `base` in `vite.config.js` is set via `VITE_BASE_PATH` env var (defaults to `/annotate/main/`). CI sets it per branch (`/annotate/main/`, `/annotate/staging/`)
- ESLint rule: unused vars are errors unless they start with an uppercase letter or underscore (`varsIgnorePattern: '^[A-Z_]'`)

### Commit Guidelines

- Commit messages must be concise (1-2 sentences max)
- Do not mention AI tools, co-authors, or generation methods in commits
