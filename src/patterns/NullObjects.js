/**
 * Null Object Pattern Implementation
 * Provides safe default objects to avoid null/undefined checks
 */

/**
 * Null Layer - safe default layer object
 */
export const NullLayer = {
  id: null,
  name: 'Empty Layer',
  visible: false,
  locked: false,
  opacity: 1,
  color: '#000000',
  arrows: [],
  rects: [],
  ellipses: [],
  strokes: [],
  texts: [],
  image: null,
  isNull: true
}

/**
 * Null Position - safe default position
 */
export const NullPosition = {
  x: 0,
  y: 0,
  isNull: true
}

/**
 * Null Shape - safe default shape selection
 */
export const NullShape = {
  layerId: null,
  shapeType: null,
  shapeIndex: -1,
  isNull: true
}

/**
 * Null Bounds - safe default bounding box
 */
export const NullBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isNull: true
}

/**
 * Null Tool Config - safe default tool configuration
 */
export const NullToolConfig = {
  id: 'none',
  name: 'None',
  icon: null,
  handlers: {},
  properties: {},
  isNull: true
}

/**
 * Factory functions for creating null objects
 */

/**
 * Get layer or null layer
 */
export const getLayerOrNull = (layer) => {
  return layer && !layer.isNull ? layer : NullLayer
}

/**
 * Get position or null position
 */
export const getPositionOrNull = (position) => {
  return position && typeof position.x === 'number' && typeof position.y === 'number'
    ? position
    : NullPosition
}

/**
 * Get shape or null shape
 */
export const getShapeOrNull = (shape) => {
  return shape && shape.layerId !== null && shape.shapeType !== null
    ? shape
    : NullShape
}

/**
 * Get bounds or null bounds
 */
export const getBoundsOrNull = (bounds) => {
  return bounds && typeof bounds.width === 'number' && typeof bounds.height === 'number'
    ? bounds
    : NullBounds
}

/**
 * Get tool config or null config
 */
export const getToolConfigOrNull = (config) => {
  return config && config.id ? config : NullToolConfig
}

/**
 * Check if object is a null object
 */
export const isNullObject = (obj) => {
  return obj && obj.isNull === true
}

/**
 * Safe getter with null object fallback
 */
export const safeGet = (value, nullObject) => {
  return value !== null && value !== undefined ? value : nullObject
}
