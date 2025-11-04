/**
 * Shape Factory
 * Implements Factory Pattern for creating different shape types
 * Centralizes shape creation logic and ensures consistency
 */

/**
 * Create a stroke shape
 */
const createStroke = (position, properties) => ({
  size: properties.size || 3,
  points: [position]
})

/**
 * Create an arrow shape
 */
const createArrow = (from, to, properties) => ({
  fromX: from.x,
  fromY: from.y,
  toX: to.x,
  toY: to.y,
  size: properties.size || 2
})

/**
 * Create a rectangle shape
 */
const createRectangle = (start, end, properties) => {
  const width = end.x - start.x
  const height = end.y - start.y

  return {
    x: width < 0 ? end.x : start.x,
    y: height < 0 ? end.y : start.y,
    width: Math.abs(width),
    height: Math.abs(height),
    size: properties.size || 2
  }
}

/**
 * Create an ellipse shape
 */
const createEllipse = (start, end, properties) => {
  const width = end.x - start.x
  const height = end.y - start.y

  return {
    x: width < 0 ? end.x : start.x,
    y: height < 0 ? end.y : start.y,
    width: Math.abs(width),
    height: Math.abs(height),
    size: properties.size || 2
  }
}

/**
 * Create a text shape
 */
const createText = (position, content, properties) => ({
  content,
  x: position.x,
  y: position.y,
  fontSize: properties.fontSize || 20,
  fontFamily: properties.fontFamily || 'Arial'
})

/**
 * Shape factory registry
 */
const shapeCreators = {
  stroke: createStroke,
  arrow: createArrow,
  rect: createRectangle,
  ellipse: createEllipse,
  text: createText
}

/**
 * Main factory method
 */
export class ShapeFactory {
  /**
   * Create a shape of the specified type
   * @param {string} type - Shape type (stroke, arrow, rect, ellipse, text)
   * @param {Object} params - Shape-specific parameters
   * @param {Object} properties - Common shape properties (size, color, etc.)
   * @returns {Object} The created shape
   */
  static create(type, params, properties = {}) {
    const creator = shapeCreators[type]

    if (!creator) {
      throw new Error(`Unknown shape type: ${type}`)
    }

    return creator(params.position || params.start, params.end || params.to || params.content, properties)
  }

  /**
   * Check if shape type is supported
   */
  static isSupported(type) {
    return type in shapeCreators
  }

  /**
   * Get all supported shape types
   */
  static getSupportedTypes() {
    return Object.keys(shapeCreators)
  }
}

// Export individual creators for direct use if needed
export {
  createStroke,
  createArrow,
  createRectangle,
  createEllipse,
  createText
}
