/**
 * Shape Configuration
 * Centralized configuration for shape types and their properties
 */

// Shape type to array name mapping
export const SHAPE_ARRAY_MAP = {
  stroke: 'strokes',
  highlighterStroke: 'highlighterStrokes',
  arrow: 'arrows',
  line: 'lines',
  rect: 'rects',
  ellipse: 'ellipses',
  text: 'texts',
  connector: 'connectors',
  stamp: 'stamps'
}

// Shape types enum
export const SHAPE_TYPES = {
  STROKE: 'stroke',
  HIGHLIGHTER_STROKE: 'highlighterStroke',
  ARROW: 'arrow',
  LINE: 'line',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  TEXT: 'text',
  CONNECTOR: 'connector',
  STAMP: 'stamp'
}

// Get array name for a shape type
export const getShapeArrayName = (shapeType) => {
  return SHAPE_ARRAY_MAP[shapeType]
}

// Check if shape type is valid
export const isValidShapeType = (shapeType) => {
  return shapeType in SHAPE_ARRAY_MAP
}

// Get all shape types
export const getAllShapeTypes = () => {
  return Object.keys(SHAPE_ARRAY_MAP)
}
