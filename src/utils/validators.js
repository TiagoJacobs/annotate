/**
 * Validation Utilities
 * Centralized validation logic for shapes, layers, and coordinates
 */

import { isValidShapeType } from '../config/shapeConfig'

/**
 * Validate position/coordinates object
 */
export const isValidPosition = (pos) => {
  return (
    pos &&
    typeof pos === 'object' &&
    typeof pos.x === 'number' &&
    typeof pos.y === 'number' &&
    !isNaN(pos.x) &&
    !isNaN(pos.y)
  )
}

/**
 * Validate layer object
 */
export const isValidLayer = (layer) => {
  return (
    layer &&
    typeof layer === 'object' &&
    'id' in layer &&
    'visible' in layer &&
    'color' in layer
  )
}

/**
 * Validate shape type
 */
export const validateShapeType = (shapeType) => {
  if (!isValidShapeType(shapeType)) {
    throw new Error(`Invalid shape type: ${shapeType}`)
  }
  return true
}

/**
 * Validate stroke data
 */
export const isValidStroke = (stroke) => {
  return (
    stroke &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.every(isValidPosition)
  )
}

/**
 * Validate arrow data
 */
export const isValidArrow = (arrow) => {
  return (
    arrow &&
    typeof arrow.fromX === 'number' &&
    typeof arrow.fromY === 'number' &&
    typeof arrow.toX === 'number' &&
    typeof arrow.toY === 'number'
  )
}

/**
 * Validate rectangle data
 */
export const isValidRect = (rect) => {
  return (
    rect &&
    typeof rect.x === 'number' &&
    typeof rect.y === 'number' &&
    typeof rect.width === 'number' &&
    typeof rect.height === 'number' &&
    rect.width >= 0 &&
    rect.height >= 0
  )
}

/**
 * Validate ellipse data
 */
export const isValidEllipse = (ellipse) => {
  return (
    ellipse &&
    typeof ellipse.x === 'number' &&
    typeof ellipse.y === 'number' &&
    typeof ellipse.width === 'number' &&
    typeof ellipse.height === 'number' &&
    ellipse.width >= 0 &&
    ellipse.height >= 0
  )
}

/**
 * Validate text data
 */
export const isValidText = (text) => {
  return (
    text &&
    typeof text.content === 'string' &&
    text.content.length > 0 &&
    typeof text.x === 'number' &&
    typeof text.y === 'number' &&
    typeof text.fontSize === 'number' &&
    text.fontSize > 0
  )
}

/**
 * Validate color string
 */
export const isValidColor = (color) => {
  if (typeof color !== 'string') return false

  // Check hex color
  if (/^#[0-9A-F]{6}$/i.test(color)) return true

  // Check rgb/rgba
  if (/^rgba?\(/.test(color)) return true

  // Check named colors (basic check)
  return color.length > 0
}

/**
 * Validate zoom level
 */
export const isValidZoom = (zoom, min = 0.1, max = 10) => {
  return (
    typeof zoom === 'number' &&
    !isNaN(zoom) &&
    zoom >= min &&
    zoom <= max
  )
}

/**
 * Shape validators map
 */
export const shapeValidators = {
  stroke: isValidStroke,
  arrow: isValidArrow,
  rect: isValidRect,
  ellipse: isValidEllipse,
  text: isValidText
}

/**
 * Validate shape data based on type
 */
export const validateShape = (shapeType, shapeData) => {
  const validator = shapeValidators[shapeType]

  if (!validator) {
    throw new Error(`No validator for shape type: ${shapeType}`)
  }

  if (!validator(shapeData)) {
    throw new Error(`Invalid ${shapeType} data`)
  }

  return true
}
