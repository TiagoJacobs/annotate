# Annotate

A simple, lightweight annotation tool built with React that allows you to paste images from your clipboard and draw on top of them directly in your browser.

---

## For Users

### Quick Start

Use the tool directly in your browser: **https://tiagojacobs.github.io/annotate/**

No installation needed! Just open the link and start annotating.

### Features

- **Clipboard Image Paste**: Simply paste an image (Ctrl+V / Cmd+V) directly into the application
- **Drawing Tools**:
  - Pen tool for drawing annotations
  - Eraser tool to remove parts of drawings
  - Adjustable brush size (1-50px)
  - Custom colors with a color picker
- **Edit History**:
  - Undo and redo functionality for your annotations
  - Full drawing history during your session
- **Export Options**:
  - Copy annotated image to clipboard with one click
  - Download as PNG file
- **Responsive Design**: Works on desktop and tablets
- **100% Client-Side**: All processing happens in your browser - no server uploads

### Usage

1. **Load an Image**: Copy an image to your clipboard and paste it into the application (Ctrl+V / Cmd+V)
2. **Draw**: Use the pen tool to draw annotations on the image
3. **Customize**:
   - Select the pen or eraser tool using the buttons in the toolbar
   - Choose a color using the color picker
   - Adjust brush size with the size slider
4. **Edit**: Use Undo and Redo buttons to correct mistakes
5. **Export**:
   - Click "Copy" to copy the annotated image to your clipboard
   - Click "Download" to save it as a PNG file
6. **Clear**: Click "Clear" to start fresh

### Browser Support

This application works in any modern browser that supports:
- HTML5 Canvas
- Clipboard API
- ES6+ JavaScript

---

## For Developers

### Getting Started

### Prerequisites

- Node.js 18.19.1 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
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

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Lucide React** - Icon library
- **HTML5 Canvas** - Drawing functionality

### Project Structure

```
annotate/
├── src/
│   ├── App.jsx          # Main annotation component
│   ├── App.css          # Component styles
│   ├── index.css        # Global styles
│   ├── main.jsx         # Entry point
│   └── assets/          # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── README.md            # This file
```

### Building for Production

To create a production build:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

### Future Enhancements

Potential features for future versions:
- Shape tools (lines, rectangles, circles)
- Text annotations
- Brush styles (dashed, dotted)
- Image filters
- Opacity/transparency controls
- Keyboard shortcuts
- Touch support for mobile devices
- Export to other formats (JPG, WebP)
- Layers support

### Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

### License

This project is open source and available under the MIT License.
