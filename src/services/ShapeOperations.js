/**
 * Shape Operations Service
 * Consolidates all shape-related operations (hit detection, bounds, movement, resize)
 */

// Constants
const LINE_HIT_THRESHOLD = 10
const TEXT_WIDTH_FACTOR = 0.6

export class ShapeOperations {
  /**
   * Hit Detection
   */

  static isPointNearLine(px, py, x1, y1, x2, y2, threshold = LINE_HIT_THRESHOLD) {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = px - xx
    const dy = py - yy
    return Math.sqrt(dx * dx + dy * dy) < threshold
  }

  static isPointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height
  }

  static isPointInEllipse(px, py, ellipse) {
    const cx = ellipse.x + ellipse.width / 2
    const cy = ellipse.y + ellipse.height / 2
    const rx = ellipse.width / 2
    const ry = ellipse.height / 2

    const normalized = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2)
    return normalized <= 1
  }

  static isPointOnStroke(px, py, stroke, threshold = LINE_HIT_THRESHOLD) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i]
      const p2 = stroke.points[i + 1]
      if (this.isPointNearLine(px, py, p1.x, p1.y, p2.x, p2.y, threshold)) {
        return true
      }
    }
    return false
  }

  static isPointOnText(px, py, text) {
    const textWidth = text.content.length * text.fontSize * TEXT_WIDTH_FACTOR
    const textHeight = text.fontSize
    return px >= text.x && px <= text.x + textWidth &&
           py >= text.y - textHeight && py <= text.y
  }

  /**
   * Bounds Calculation
   */

  static getBoundsFromPoints(points) {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  static getShapeBounds(layer, shapeType, shapeIndex) {
    const boundsGetters = {
      stroke: () => this.getBoundsFromPoints(layer.strokes[shapeIndex].points),
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        return this.getBoundsFromPoints([
          { x: arrow.fromX, y: arrow.fromY },
          { x: arrow.toX, y: arrow.toY }
        ])
      },
      rect: () => ({ ...layer.rects[shapeIndex] }),
      ellipse: () => ({ ...layer.ellipses[shapeIndex] }),
      text: () => {
        const text = layer.texts[shapeIndex]
        const textWidth = text.content.length * text.fontSize * TEXT_WIDTH_FACTOR
        const textHeight = text.fontSize
        return { x: text.x, y: text.y - textHeight, width: textWidth, height: textHeight }
      }
    }

    return boundsGetters[shapeType]?.() || { x: 0, y: 0, width: 0, height: 0 }
  }

  static boundsIntersect(bounds1, bounds2) {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    )
  }

  static getMultiShapeBounds(shapes, layerManager) {
    if (!shapes || shapes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const shape of shapes) {
      const layer = layerManager.getLayer(shape.layerId)
      if (!layer) continue

      const bounds = this.getShapeBounds(layer, shape.shapeType, shape.shapeIndex)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Shape Movement
   */

  static moveShape(layer, shapeType, shapeIndex, dx, dy) {
    const moveHandlers = {
      stroke: () => {
        layer.strokes[shapeIndex].points = layer.strokes[shapeIndex].points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }))
      },
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        arrow.fromX += dx
        arrow.fromY += dy
        arrow.toX += dx
        arrow.toY += dy
      },
      rect: () => {
        layer.rects[shapeIndex].x += dx
        layer.rects[shapeIndex].y += dy
      },
      ellipse: () => {
        layer.ellipses[shapeIndex].x += dx
        layer.ellipses[shapeIndex].y += dy
      },
      text: () => {
        layer.texts[shapeIndex].x += dx
        layer.texts[shapeIndex].y += dy
      }
    }

    moveHandlers[shapeType]?.()
  }

  /**
   * Shape Resize
   */

  static calculateNewBounds(handle, startBounds, dx, dy) {
    let newX = startBounds.x
    let newY = startBounds.y
    let newWidth = startBounds.width
    let newHeight = startBounds.height

    if (handle.includes('w')) {
      newX = startBounds.x + dx
      newWidth = startBounds.width - dx
    } else if (handle.includes('e')) {
      newWidth = startBounds.width + dx
    }

    if (handle.includes('n')) {
      newY = startBounds.y + dy
      newHeight = startBounds.height - dy
    } else if (handle.includes('s')) {
      newHeight = startBounds.height + dy
    }

    return { newX, newY, newWidth, newHeight }
  }

  static resizeShape(layer, shapeType, shapeIndex, handle, startBounds, dx, dy) {
    const { newX, newY, newWidth, newHeight } = this.calculateNewBounds(handle, startBounds, dx, dy)

    const resizeHandlers = {
      rect: () => {
        const rect = layer.rects[shapeIndex]
        rect.x = newX
        rect.y = newY
        rect.width = newWidth
        rect.height = newHeight
      },
      ellipse: () => {
        const ellipse = layer.ellipses[shapeIndex]
        ellipse.x = newX
        ellipse.y = newY
        ellipse.width = newWidth
        ellipse.height = newHeight
      },
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        if (handle.includes('w')) arrow.fromX = newX
        else if (handle.includes('e')) arrow.toX = newX + newWidth

        if (handle.includes('n')) arrow.fromY = newY
        else if (handle.includes('s')) arrow.toY = newY + newHeight
      }
    }

    resizeHandlers[shapeType]?.()
  }

  /**
   * Selection Helpers
   */

  static findShapesInRect(rect, layerManager) {
    const selectedShapes = []
    const layers = layerManager.getAllLayers()

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      if (!layer.visible) continue

      const shapeArrays = [
        { type: 'stroke', array: layer.strokes },
        { type: 'arrow', array: layer.arrows },
        { type: 'rect', array: layer.rects },
        { type: 'ellipse', array: layer.ellipses },
        { type: 'text', array: layer.texts }
      ]

      for (const { type, array } of shapeArrays) {
        for (let j = 0; j < array.length; j++) {
          const shapeBounds = this.getShapeBounds(layer, type, j)
          if (this.boundsIntersect(shapeBounds, rect)) {
            selectedShapes.push({
              layerId: layer.id,
              shapeType: type,
              shapeIndex: j
            })
          }
        }
      }
    }

    return selectedShapes
  }

  static checkLayerShapes(pos, layer) {
    const shapeChecks = [
      { type: 'stroke', array: layer.strokes, test: (shape) => this.isPointOnStroke(pos.x, pos.y, shape) },
      { type: 'arrow', array: layer.arrows, test: (arrow) => this.isPointNearLine(pos.x, pos.y, arrow.fromX, arrow.fromY, arrow.toX, arrow.toY) },
      { type: 'rect', array: layer.rects, test: (shape) => this.isPointInRect(pos.x, pos.y, shape) },
      { type: 'ellipse', array: layer.ellipses, test: (shape) => this.isPointInEllipse(pos.x, pos.y, shape) },
      { type: 'text', array: layer.texts, test: (shape) => this.isPointOnText(pos.x, pos.y, shape) },
    ]

    for (const { type, array, test } of shapeChecks) {
      for (let j = array.length - 1; j >= 0; j--) {
        if (test(array[j])) {
          return { layerId: layer.id, shapeType: type, shapeIndex: j }
        }
      }
    }

    return null
  }

  static findShapeAtPosition(pos, layerManager) {
    const layers = layerManager.getAllLayers()

    // Search from top layer to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      if (!layer.visible) continue

      const result = this.checkLayerShapes(pos, layer)
      if (result) return result
    }

    return null
  }
}
