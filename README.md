# Annotate

A lightweight, feature-rich annotation tool built with React. Paste images from your clipboard and annotate them with shapes, text, and freehand drawings — all directly in your browser.

> This project started as an experiment to try out [Claude Code](https://claude.ai/claude-code), but ended up becoming a genuinely useful tool that I now use regularly.

---

## For Users

### Quick Start

Use the tool directly in your browser: **https://tiagojacobs.github.io/annotate/**

No installation needed! Just open the link and start annotating.

### Features

- **Clipboard Image Paste**: Paste an image (Ctrl+V / Cmd+V) directly into the canvas
- **Drawing Tools**:
  - **Pen** — Freehand drawing with adjustable brush size (1-50px)
  - **Arrow** — Directional arrows to highlight areas
  - **Rectangle** — Draw rectangles and boxes
  - **Ellipse** — Draw circles and ovals
  - **Text** — Add text annotations with adjustable font size
  - **Selection** — Select, move, and resize shapes
  - **Pan** — Navigate the canvas (or use middle-mouse drag with any tool)
- **Shape Styling**:
  - Color picker for custom colors
  - Line styles: solid, dashed, dotted, dash-dot
  - Adjustable stroke width and font size
- **Layer Management**:
  - Create, rename, and delete layers
  - Toggle layer visibility and lock layers
  - Reorder layers (move up/down)
- **Canvas Navigation**:
  - Zoom in/out (10% to 1000%) with scroll wheel or keyboard
  - Pan canvas with middle mouse or the hand tool
  - Minimap for quick navigation
- **Selection & Editing**:
  - Select and transform individual shapes
  - Multi-select with Ctrl+A
  - Copy/paste shapes with Ctrl+C / Ctrl+V
  - Move shapes with arrow keys (hold Shift for 10px steps)
- **Edit History**: Full undo/redo support (Ctrl+Z / Ctrl+Shift+Z)
- **Export Options**:
  - Copy annotated image to clipboard
  - Download as PNG file
- **Keyboard Shortcuts**: Press **K** to view all shortcuts
- **Responsive Design**: Works on desktop and tablets
- **100% Client-Side**: All processing happens in your browser — no server uploads

### Usage

1. **Load an Image**: Copy an image to your clipboard and paste it (Ctrl+V / Cmd+V)
2. **Pick a Tool**: Select a tool from the toolbar, or press **1-7** to switch quickly
3. **Annotate**: Draw shapes, arrows, text, or freehand on the image
4. **Style**: Change color, line style, or stroke width from the toolbar
5. **Organize**: Use layers to group annotations — toggle visibility or lock layers
6. **Navigate**: Scroll to zoom, middle-click drag to pan, or use the minimap
7. **Edit**: Undo/redo mistakes, select and move shapes, or delete them
8. **Export**: Click **Copy** to copy to clipboard, or **Download** to save as PNG

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **1-7** | Switch tool (Pen, Arrow, Rect, Ellipse, Text, Select, Pan) |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z** | Redo |
| **Ctrl+A** | Select all shapes |
| **Ctrl+C / Ctrl+V** | Copy / paste shapes |
| **Delete** | Delete selected shape |
| **+** / **-** | Zoom in / out |
| **Arrow keys** | Pan canvas or move selected shape |
| **Shift+Arrow** | Move selected shape by 10px |
| **K** | Show shortcuts help |
| **Escape** | Clear selection |

### Browser Support

Works in any modern browser that supports HTML5 Canvas, Clipboard API, and ES6+ JavaScript.

---

## For Developers

### Prerequisites

- Node.js 18.19.1 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tiagojacobs/annotate.git
cd annotate
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Technology Stack

- **React 19** — UI framework
- **Vite** — Build tool and dev server
- **Lucide React** — Icon library
- **HTML5 Canvas** — Drawing and rendering
- **GitHub Actions** — CI/CD pipeline
- **GitHub Pages** — Hosting

### Project Structure

```
annotate/
├── src/
│   ├── App.jsx              # Main application component
│   ├── components/          # React UI components (canvas, toolbar, layers, minimap, etc.)
│   ├── hooks/               # Custom React hooks (events, state, rendering, shortcuts)
│   ├── services/            # Business logic layer (canvas, keyboard, layer services)
│   ├── tools/               # Tool handler and registry with creation strategies
│   ├── renderers/           # Shape rendering strategies (stroke, arrow, rect, ellipse, text)
│   ├── factories/           # Shape creation (Factory pattern)
│   ├── builders/            # Layer construction (Builder pattern)
│   ├── commands/            # Undo/redo support (Command pattern)
│   ├── patterns/            # Observer and Null Object patterns
│   ├── canvas/              # Canvas management (zoom, pan, coordinate transforms)
│   ├── layers/              # Layer management (CRUD, ordering, history)
│   ├── config/              # Centralized configuration (shapes, rendering, UI)
│   ├── constants/           # Type-safe constants (tool types, key codes)
│   ├── utils/               # Pure utilities (geometry, color, transform, performance)
│   └── styles/              # Component-specific styles
├── .github/workflows/       # CI/CD deployment pipeline
├── index.html
├── vite.config.js
├── package.json
├── ARCHITECTURE.md          # Design patterns and architecture docs
└── README.md
```

### Building for Production

```bash
npm run build     # Build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

### Architecture

The codebase uses several design patterns for maintainability and extensibility. See [ARCHITECTURE.md](ARCHITECTURE.md) for details on:

- Factory, Builder, Command, Observer, Strategy, Null Object, and Service Layer patterns
- Custom React hooks for separation of concerns
- Performance optimizations (debounce, throttle, memoization, object pooling)
- Centralized configuration and validation

### Future Enhancements

- Image filters
- Touch support for mobile devices

### Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

### License

This project is open source and available under the MIT License.
