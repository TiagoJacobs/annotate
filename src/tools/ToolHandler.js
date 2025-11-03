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

    // Create new layer for this stroke
    this.currentLayer = this.layerManager.createLayer(toolConfig.id, null, {
      strokes: [
        {
          color: properties.color,
          size: properties.size,
          points: [pos],
        },
      ],
    })
  }

  /**
   * Continue freehand stroke
   */
  continueFreehandStroke(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentLayer) return

    const layer = this.layerManager.getLayer(this.currentLayer.id)
    if (layer && layer.strokes) {
      const lastStroke = layer.strokes[layer.strokes.length - 1]
      lastStroke.points.push(pos)
      this.layerManager.updateLayer(layer.id, { strokes: layer.strokes })
    }
  }

  /**
   * Finish freehand stroke
   */
  finishFreehandStroke() {
    this.isDrawing = false
    this.currentLayer = null
  }

  /**
   * Start shape (arrow, rect, ellipse)
   */
  startShape(pos, toolConfig, properties) {
    this.isDrawing = true
    this.startPos = pos

    this.currentLayer = this.layerManager.createLayer(toolConfig.id, null, {
      arrows: [],
      rects: [],
      ellipses: [],
    })
  }

  /**
   * Preview shape (during drag)
   */
  previewShape(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentLayer) return

    const layer = this.layerManager.getLayer(this.currentLayer.id)
    if (!layer) return

    const width = pos.x - this.startPos.x
    const height = pos.y - this.startPos.y

    if (toolConfig.id === 'arrow') {
      layer.arrows = [
        {
          fromX: this.startPos.x,
          fromY: this.startPos.y,
          toX: pos.x,
          toY: pos.y,
          color: properties.color,
          size: properties.size,
        },
      ]
    } else if (toolConfig.id === 'rect') {
      layer.rects = [
        {
          x: width < 0 ? pos.x : this.startPos.x,
          y: height < 0 ? pos.y : this.startPos.y,
          width: Math.abs(width),
          height: Math.abs(height),
          color: properties.color,
          size: properties.size,
        },
      ]
    } else if (toolConfig.id === 'ellipse') {
      layer.ellipses = [
        {
          x: this.startPos.x,
          y: this.startPos.y,
          width: Math.abs(width),
          height: Math.abs(height),
          color: properties.color,
          size: properties.size,
        },
      ]
    }

    this.layerManager.updateLayer(layer.id, layer)
  }

  /**
   * Finish shape
   */
  finishShape() {
    this.isDrawing = false
    this.currentLayer = null
  }

  /**
   * Place text
   */
  placeText(pos, toolConfig, properties, textContent) {
    if (!textContent) return

    this.layerManager.createLayer('text', null, {
      texts: [
        {
          content: textContent,
          x: pos.x,
          y: pos.y,
          color: properties.color,
          fontSize: properties.fontSize,
          fontFamily: 'Arial',
        },
      ],
    })
  }

  /**
   * Select object
   */
  selectObject(pos) {
    // TODO: Implement object selection
  }

  /**
   * Drag object
   */
  dragObject(pos) {
    // TODO: Implement object dragging
  }

  /**
   * Release object
   */
  releaseObject() {
    // TODO: Implement object release
  }
}
