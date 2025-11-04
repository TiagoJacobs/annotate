/**
 * Shape Creation Strategies
 * Strategy pattern for different shape types
 */

/**
 * Base Strategy
 */
class ShapeCreationStrategy {
  start(layer, startPos, properties) {
    throw new Error('start() must be implemented')
  }

  preview(layer, startPos, currentPos, properties) {
    throw new Error('preview() must be implemented')
  }

  finish(layer) {
    throw new Error('finish() must be implemented')
  }
}

/**
 * Freehand Stroke Strategy
 */
export class FreehandStrokeStrategy extends ShapeCreationStrategy {
  start(layer, startPos, properties) {
    const stroke = {
      size: properties.size,
      color: properties.color,
      lineStyle: properties.lineStyle,
      points: [startPos],
    }
    layer.strokes.push(stroke)
    return stroke
  }

  continue(stroke, pos) {
    stroke.points.push(pos)
  }

  finish(layer) {
    // No preview flag to remove for strokes
  }
}

/**
 * Arrow Strategy
 */
export class ArrowStrategy extends ShapeCreationStrategy {
  preview(layer, startPos, currentPos, properties) {
    // Remove existing previews
    layer.arrows = layer.arrows.filter(a => !a.isPreview)

    // Add new preview
    layer.arrows.push({
      fromX: startPos.x,
      fromY: startPos.y,
      toX: currentPos.x,
      toY: currentPos.y,
      size: properties.size,
      color: properties.color,
      lineStyle: properties.lineStyle,
      isPreview: true,
    })
  }

  finish(layer) {
    if (layer.arrows.length > 0) {
      const lastIndex = layer.arrows.length - 1
      delete layer.arrows[lastIndex].isPreview
    }
  }
}

/**
 * Rectangle Strategy
 */
export class RectStrategy extends ShapeCreationStrategy {
  preview(layer, startPos, currentPos, properties) {
    const width = currentPos.x - startPos.x
    const height = currentPos.y - startPos.y

    // Remove existing previews
    layer.rects = layer.rects.filter(r => !r.isPreview)

    // Add new preview
    layer.rects.push({
      x: width < 0 ? currentPos.x : startPos.x,
      y: height < 0 ? currentPos.y : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
      size: properties.size,
      color: properties.color,
      lineStyle: properties.lineStyle,
      isPreview: true,
    })
  }

  finish(layer) {
    if (layer.rects.length > 0) {
      const lastIndex = layer.rects.length - 1
      delete layer.rects[lastIndex].isPreview
    }
  }
}

/**
 * Ellipse Strategy
 */
export class EllipseStrategy extends ShapeCreationStrategy {
  preview(layer, startPos, currentPos, properties) {
    const width = currentPos.x - startPos.x
    const height = currentPos.y - startPos.y

    // Remove existing previews
    layer.ellipses = layer.ellipses.filter(e => !e.isPreview)

    // Add new preview
    layer.ellipses.push({
      x: width < 0 ? currentPos.x : startPos.x,
      y: height < 0 ? currentPos.y : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
      size: properties.size,
      color: properties.color,
      lineStyle: properties.lineStyle,
      isPreview: true,
    })
  }

  finish(layer) {
    if (layer.ellipses.length > 0) {
      const lastIndex = layer.ellipses.length - 1
      delete layer.ellipses[lastIndex].isPreview
    }
  }
}

/**
 * Text Strategy
 */
export class TextStrategy extends ShapeCreationStrategy {
  place(layer, pos, properties, textContent) {
    layer.texts.push({
      content: textContent,
      x: pos.x,
      y: pos.y,
      fontSize: properties.fontSize,
      fontFamily: 'Arial',
      color: properties.color,
    })
  }
}

/**
 * Strategy Factory
 */
export class ShapeStrategyFactory {
  static strategies = {
    pen: new FreehandStrokeStrategy(),
    arrow: new ArrowStrategy(),
    rect: new RectStrategy(),
    ellipse: new EllipseStrategy(),
    text: new TextStrategy(),
  }

  static getStrategy(shapeType) {
    return this.strategies[shapeType]
  }
}
