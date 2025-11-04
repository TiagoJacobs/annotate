/**
 * Tool Handler
 * Base class for tool behaviors
 * Extensible for adding new tools
 */

export class ToolHandler {
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager
    this.layerManager = layerManager
    this.isDrawing = false
    this.currentLayer = null
    this.startPos = { x: 0, y: 0 }
  }

  /**
   * Start freehand stroke (pen, hand)
   */
  startFreehandStroke(pos, toolConfig, properties) {
    this.isDrawing = true
    this.startPos = pos

    // Get selected layer or create new one
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) {
      layer = this.layerManager.createLayer(null, properties.color)
    }
    this.currentLayer = layer

    // Add new stroke to layer
    const stroke = {
      size: properties.size,
      points: [pos],
    }
    layer.strokes.push(stroke)
    this.currentStroke = stroke
  }

  /**
   * Continue freehand stroke
   */
  continueFreehandStroke(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentStroke) return

    this.currentStroke.points.push(pos)
    this.layerManager.updateLayer(this.currentLayer.id, { strokes: this.currentLayer.strokes })
  }

  /**
   * Finish freehand stroke
   */
  finishFreehandStroke() {
    this.isDrawing = false
    this.currentStroke = null
  }

  /**
   * Start shape (arrow, rect, ellipse)
   */
  startShape(pos, toolConfig, properties) {
    this.isDrawing = true
    this.startPos = pos

    // Get selected layer or create new one
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) {
      layer = this.layerManager.createLayer(null, properties.color)
    }
    this.currentLayer = layer
    this.currentShapeType = toolConfig.id
  }

  /**
   * Preview shape (during drag)
   */
  previewShape(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentLayer) return

    const width = pos.x - this.startPos.x
    const height = pos.y - this.startPos.y

    // Create temporary shape for preview (will be replaced on finish)
    if (this.currentShapeType === 'arrow') {
      this.currentLayer.arrows = this.currentLayer.arrows.filter(a => !a.isPreview)
      this.currentLayer.arrows.push({
        fromX: this.startPos.x,
        fromY: this.startPos.y,
        toX: pos.x,
        toY: pos.y,
        size: properties.size,
        isPreview: true,
      })
    } else if (this.currentShapeType === 'rect') {
      this.currentLayer.rects = this.currentLayer.rects.filter(r => !r.isPreview)
      this.currentLayer.rects.push({
        x: width < 0 ? pos.x : this.startPos.x,
        y: height < 0 ? pos.y : this.startPos.y,
        width: Math.abs(width),
        height: Math.abs(height),
        size: properties.size,
        isPreview: true,
      })
    } else if (this.currentShapeType === 'ellipse') {
      this.currentLayer.ellipses = this.currentLayer.ellipses.filter(e => !e.isPreview)
      this.currentLayer.ellipses.push({
        x: width < 0 ? pos.x : this.startPos.x,
        y: height < 0 ? pos.y : this.startPos.y,
        width: Math.abs(width),
        height: Math.abs(height),
        size: properties.size,
        isPreview: true,
      })
    }

    this.layerManager.updateLayer(this.currentLayer.id, this.currentLayer)
  }

  /**
   * Finish shape
   */
  finishShape() {
    if (this.currentLayer) {
      // Remove preview flag from the last added shape
      if (this.currentShapeType === 'arrow' && this.currentLayer.arrows.length > 0) {
        delete this.currentLayer.arrows[this.currentLayer.arrows.length - 1].isPreview
      } else if (this.currentShapeType === 'rect' && this.currentLayer.rects.length > 0) {
        delete this.currentLayer.rects[this.currentLayer.rects.length - 1].isPreview
      } else if (this.currentShapeType === 'ellipse' && this.currentLayer.ellipses.length > 0) {
        delete this.currentLayer.ellipses[this.currentLayer.ellipses.length - 1].isPreview
      }
      this.layerManager.updateLayer(this.currentLayer.id, this.currentLayer)
    }

    this.isDrawing = false
    this.currentShapeType = null
  }

  /**
   * Place text
   */
  placeText(pos, toolConfig, properties, textContent) {
    if (!textContent) return

    // Get selected layer or create new one
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) {
      layer = this.layerManager.createLayer(null, properties.color)
    }

    // Add text to layer
    layer.texts.push({
      content: textContent,
      x: pos.x,
      y: pos.y,
      fontSize: properties.fontSize,
      fontFamily: 'Arial',
    })

    this.layerManager.updateLayer(layer.id, { texts: layer.texts })
  }

  /**
   * Check if a point is near a line segment (for strokes and arrows)
   */
  isPointNearLine(px, py, x1, y1, x2, y2, threshold = 10) {
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

  /**
   * Check if a point is inside a rectangle
   */
  isPointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height
  }

  /**
   * Check if a point is inside an ellipse
   */
  isPointInEllipse(px, py, ellipse) {
    const cx = ellipse.x + ellipse.width / 2
    const cy = ellipse.y + ellipse.height / 2
    const rx = ellipse.width / 2
    const ry = ellipse.height / 2

    const normalized = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2)
    return normalized <= 1
  }

  /**
   * Check if a point hits a stroke
   */
  isPointOnStroke(px, py, stroke, threshold = 10) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i]
      const p2 = stroke.points[i + 1]
      if (this.isPointNearLine(px, py, p1.x, p1.y, p2.x, p2.y, threshold)) {
        return true
      }
    }
    return false
  }

  /**
   * Find shape at position
   */
  findShapeAtPosition(pos) {
    const layers = this.layerManager.getAllLayers()

    // Search from top layer to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      if (!layer.visible) continue

      // Check strokes
      for (let j = layer.strokes.length - 1; j >= 0; j--) {
        if (this.isPointOnStroke(pos.x, pos.y, layer.strokes[j])) {
          return { layerId: layer.id, shapeType: 'stroke', shapeIndex: j }
        }
      }

      // Check arrows
      for (let j = layer.arrows.length - 1; j >= 0; j--) {
        const arrow = layer.arrows[j]
        if (this.isPointNearLine(pos.x, pos.y, arrow.fromX, arrow.fromY, arrow.toX, arrow.toY)) {
          return { layerId: layer.id, shapeType: 'arrow', shapeIndex: j }
        }
      }

      // Check rectangles
      for (let j = layer.rects.length - 1; j >= 0; j--) {
        if (this.isPointInRect(pos.x, pos.y, layer.rects[j])) {
          return { layerId: layer.id, shapeType: 'rect', shapeIndex: j }
        }
      }

      // Check ellipses
      for (let j = layer.ellipses.length - 1; j >= 0; j--) {
        if (this.isPointInEllipse(pos.x, pos.y, layer.ellipses[j])) {
          return { layerId: layer.id, shapeType: 'ellipse', shapeIndex: j }
        }
      }

      // Check texts
      for (let j = layer.texts.length - 1; j >= 0; j--) {
        const text = layer.texts[j]
        // Simple bounding box for text (approximate)
        const textWidth = text.content.length * text.fontSize * 0.6
        const textHeight = text.fontSize
        if (pos.x >= text.x && pos.x <= text.x + textWidth &&
            pos.y >= text.y - textHeight && pos.y <= text.y) {
          return { layerId: layer.id, shapeType: 'text', shapeIndex: j }
        }
      }
    }

    return null
  }

  /**
   * Get bounding box for a shape
   */
  getShapeBounds(layer, shapeType, shapeIndex) {
    let bounds = { x: 0, y: 0, width: 0, height: 0 }

    if (shapeType === 'stroke') {
      const stroke = layer.strokes[shapeIndex]
      if (stroke.points.length === 0) return bounds

      let minX = stroke.points[0].x
      let maxX = stroke.points[0].x
      let minY = stroke.points[0].y
      let maxY = stroke.points[0].y

      stroke.points.forEach(p => {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      })

      bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    } else if (shapeType === 'arrow') {
      const arrow = layer.arrows[shapeIndex]
      const minX = Math.min(arrow.fromX, arrow.toX)
      const maxX = Math.max(arrow.fromX, arrow.toX)
      const minY = Math.min(arrow.fromY, arrow.toY)
      const maxY = Math.max(arrow.fromY, arrow.toY)
      bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    } else if (shapeType === 'rect') {
      bounds = { ...layer.rects[shapeIndex] }
    } else if (shapeType === 'ellipse') {
      bounds = { ...layer.ellipses[shapeIndex] }
    } else if (shapeType === 'text') {
      const text = layer.texts[shapeIndex]
      const textWidth = text.content.length * text.fontSize * 0.6
      const textHeight = text.fontSize
      bounds = { x: text.x, y: text.y - textHeight, width: textWidth, height: textHeight }
    }

    return bounds
  }

  /**
   * Check if point is on a resize handle
   */
  getResizeHandle(pos, bounds) {
    const padding = 5
    const handleSize = 8
    const threshold = handleSize + 2

    const handles = [
      { name: 'nw', x: bounds.x - padding, y: bounds.y - padding },
      { name: 'ne', x: bounds.x + bounds.width + padding, y: bounds.y - padding },
      { name: 'sw', x: bounds.x - padding, y: bounds.y + bounds.height + padding },
      { name: 'se', x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding },
      { name: 'n', x: bounds.x + bounds.width / 2, y: bounds.y - padding },
      { name: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding },
      { name: 'w', x: bounds.x - padding, y: bounds.y + bounds.height / 2 },
      { name: 'e', x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2 },
    ]

    for (const handle of handles) {
      const dist = Math.sqrt((pos.x - handle.x) ** 2 + (pos.y - handle.y) ** 2)
      if (dist < threshold) {
        return handle.name
      }
    }

    return null
  }

  /**
   * Select object
   */
  selectObject(pos) {
    // First check if clicking on a resize handle
    if (this.selectedShape) {
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (layer) {
        const bounds = this.getShapeBounds(layer, this.selectedShape.shapeType, this.selectedShape.shapeIndex)
        const handle = this.getResizeHandle(pos, bounds)
        if (handle) {
          this.resizeHandle = handle
          this.resizeStartPos = pos
          this.resizeStartBounds = { ...bounds }
          this.isResizing = true
          return this.selectedShape
        }
      }
    }

    const shape = this.findShapeAtPosition(pos)
    this.selectedShape = shape
    this.isDragging = false
    this.isResizing = false
    this.resizeHandle = null
    return shape
  }

  /**
   * Resize shape
   */
  resizeShape(pos) {
    if (!this.selectedShape || !this.resizeHandle) return

    const layer = this.layerManager.getLayer(this.selectedShape.layerId)
    if (!layer) return

    const { shapeType, shapeIndex } = this.selectedShape
    const dx = pos.x - this.resizeStartPos.x
    const dy = pos.y - this.resizeStartPos.y

    const handle = this.resizeHandle
    const startBounds = this.resizeStartBounds

    // Calculate new bounds based on handle
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

    // Apply to shape (skip strokes - too complex to resize)
    if (shapeType === 'rect') {
      layer.rects[shapeIndex].x = newX
      layer.rects[shapeIndex].y = newY
      layer.rects[shapeIndex].width = newWidth
      layer.rects[shapeIndex].height = newHeight
    } else if (shapeType === 'ellipse') {
      layer.ellipses[shapeIndex].x = newX
      layer.ellipses[shapeIndex].y = newY
      layer.ellipses[shapeIndex].width = newWidth
      layer.ellipses[shapeIndex].height = newHeight
    } else if (shapeType === 'arrow') {
      // Resize arrow by adjusting endpoints
      const arrow = layer.arrows[shapeIndex]
      if (handle.includes('w')) {
        arrow.fromX = newX
      } else if (handle.includes('e')) {
        arrow.toX = newX + newWidth
      }
      if (handle.includes('n')) {
        arrow.fromY = newY
      } else if (handle.includes('s')) {
        arrow.toY = newY + newHeight
      }
    }

    this.layerManager.updateLayer(layer.id, layer)
  }

  /**
   * Drag object
   */
  dragObject(pos) {
    if (!this.selectedShape) return

    // If resizing, call resize instead
    if (this.isResizing) {
      this.resizeShape(pos)
      return
    }

    if (!this.isDragging) {
      this.isDragging = true
      this.dragStartPos = pos
      return
    }

    const layer = this.layerManager.getLayer(this.selectedShape.layerId)
    if (!layer) return

    const dx = pos.x - this.dragStartPos.x
    const dy = pos.y - this.dragStartPos.y

    const { shapeType, shapeIndex } = this.selectedShape

    if (shapeType === 'stroke') {
      layer.strokes[shapeIndex].points = layer.strokes[shapeIndex].points.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      }))
    } else if (shapeType === 'arrow') {
      const arrow = layer.arrows[shapeIndex]
      arrow.fromX += dx
      arrow.fromY += dy
      arrow.toX += dx
      arrow.toY += dy
    } else if (shapeType === 'rect') {
      layer.rects[shapeIndex].x += dx
      layer.rects[shapeIndex].y += dy
    } else if (shapeType === 'ellipse') {
      layer.ellipses[shapeIndex].x += dx
      layer.ellipses[shapeIndex].y += dy
    } else if (shapeType === 'text') {
      layer.texts[shapeIndex].x += dx
      layer.texts[shapeIndex].y += dy
    }

    this.dragStartPos = pos
    this.layerManager.updateLayer(layer.id, layer)
  }

  /**
   * Release object
   */
  releaseObject() {
    this.isDragging = false
    this.isResizing = false
    this.dragStartPos = null
    this.resizeHandle = null
    this.resizeStartPos = null
    this.resizeStartBounds = null
  }

  /**
   * Get selected shape info
   */
  getSelectedShape() {
    return this.selectedShape
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedShape = null
  }
}
