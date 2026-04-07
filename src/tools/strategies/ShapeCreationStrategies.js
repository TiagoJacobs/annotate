/**
 * Shape Creation Strategies
 * Strategy pattern for different shape types
 */

/**
 * Base Strategy
 */
class ShapeCreationStrategy {
  start(_layer, _startPos, _properties) {
    throw new Error('start() must be implemented')
  }

  preview(_layer, _startPos, _currentPos, _properties) {
    throw new Error('preview() must be implemented')
  }

  finish(_layer) {
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
      groupId: null,
      rotation: 0,
    }
    layer.strokes.push(stroke)
    return stroke
  }

  continue(stroke, pos) {
    stroke.points.push(pos)
  }

  finish() {
    // No preview flag to remove for strokes
  }
}

/**
 * Highlighter Stroke Strategy
 */
export class HighlighterStrokeStrategy extends ShapeCreationStrategy {
  start(layer, startPos, properties) {
    const stroke = {
      size: properties.size,
      color: properties.color,
      opacity: 0.4,
      points: [startPos],
      groupId: null,
      rotation: 0,
    }
    layer.highlighterStrokes.push(stroke)
    return stroke
  }

  continue(stroke, pos) {
    stroke.points.push(pos)
  }

  finish() {
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
      groupId: null,
      isPreview: true,
    })
  }

  finish(layer) {
    if (layer.arrows.length > 0) {
      const lastIndex = layer.arrows.length - 1
      const arrow = layer.arrows[lastIndex]
      // Remove zero-length arrows (click without drag)
      if (arrow.fromX === arrow.toX && arrow.fromY === arrow.toY) {
        layer.arrows.splice(lastIndex, 1)
        return
      }
      delete arrow.isPreview
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
      fillColor: properties.fillColor || '',
      lineStyle: properties.lineStyle,
      groupId: null,
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
      fillColor: properties.fillColor || '',
      lineStyle: properties.lineStyle,
      groupId: null,
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
 * Line Strategy (straight line without arrowhead)
 */
export class LineStrategy extends ShapeCreationStrategy {
  preview(layer, startPos, currentPos, properties) {
    layer.lines = layer.lines.filter(l => !l.isPreview)

    layer.lines.push({
      fromX: startPos.x,
      fromY: startPos.y,
      toX: currentPos.x,
      toY: currentPos.y,
      size: properties.size,
      color: properties.color,
      lineStyle: properties.lineStyle,
      groupId: null,
      isPreview: true,
    })
  }

  finish(layer) {
    if (layer.lines.length > 0) {
      const lastIndex = layer.lines.length - 1
      const line = layer.lines[lastIndex]
      if (line.fromX === line.toX && line.fromY === line.toY) {
        layer.lines.splice(lastIndex, 1)
        return
      }
      delete line.isPreview
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
      fontWeight: properties.fontWeight || 'normal',
      fontStyle: properties.fontStyle || 'normal',
      textDecoration: properties.textDecoration || 'none',
      highlightColor: properties.highlightColor || '',
      color: properties.color,
      groupId: null,
      rotation: 0,
    })
  }
}

/**
 * Strategy Factory
 */
export class ShapeStrategyFactory {
  static strategies = {
    pen: new FreehandStrokeStrategy(),
    highlighter: new HighlighterStrokeStrategy(),
    arrow: new ArrowStrategy(),
    line: new LineStrategy(),
    rect: new RectStrategy(),
    ellipse: new EllipseStrategy(),
    text: new TextStrategy(),
  }

  static getStrategy(shapeType) {
    return this.strategies[shapeType]
  }
}
