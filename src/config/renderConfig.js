/**
 * Render Configuration
 * Centralized configuration for canvas rendering
 */

// Canvas render settings
export const CANVAS_RENDER_CONFIG = {
  gridSize: 50,
  backgroundColor: '#ffffff',
  gridColor: '#f0f0f0',
  selectionColor: '#667eea',
  selectionLineWidth: 2,
  selectionDashPattern: [5, 5]
}

// Arrow render settings
export const ARROW_RENDER_CONFIG = {
  headLength: 15,
  headAngle: Math.PI / 6,
  defaultLineWidth: 2
}

// Text render settings
export const TEXT_RENDER_CONFIG = {
  defaultFontSize: 20,
  defaultFontFamily: 'Arial',
  widthFactor: 0.6, // Approximate character width multiplier
  baselineOffset: 1
}

// Stroke render settings
export const STROKE_RENDER_CONFIG = {
  lineCap: 'round',
  lineJoin: 'round',
  defaultWidth: 3
}

// Shape render settings
export const SHAPE_RENDER_CONFIG = {
  defaultLineWidth: 2,
  minDimension: 1
}

// Selection box render settings
export const SELECTION_BOX_CONFIG = {
  padding: 5,
  handleSize: 8,
  handleFillColor: '#667eea',
  handleStrokeColor: '#ffffff',
  handleLineWidth: 1
}

// Get render config for a specific shape type
export const getRenderConfigForShape = (shapeType) => {
  const configs = {
    stroke: STROKE_RENDER_CONFIG,
    arrow: ARROW_RENDER_CONFIG,
    text: TEXT_RENDER_CONFIG,
    rect: SHAPE_RENDER_CONFIG,
    ellipse: SHAPE_RENDER_CONFIG
  }

  return configs[shapeType] || SHAPE_RENDER_CONFIG
}
