/**
 * Tool Handler
 * Base class for tool behaviors
 * Extensible for adding new tools
 */

import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'
import { ShapeOperations } from '../services/ShapeOperations'
import { ShapeStrategyFactory, FreehandStrokeStrategy } from './strategies/ShapeCreationStrategies'

// Constants
const SELECTION_PADDING = 5
const RESIZE_HANDLE_SIZE = 8
const HANDLE_HIT_THRESHOLD = 10
const LINE_HIT_THRESHOLD = 10
const TEXT_WIDTH_FACTOR = 0.6  // Approximate width per character relative to font size

export class ToolHandler {
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager
    this.layerManager = layerManager
    this.isDrawing = false
    this.currentLayer = null
    this.startPos = { x: 0, y: 0 }
    this.isMarqueeSelecting = false
    this.marqueeStart = null
    this.marqueeCurrent = null
  }

  /**
   * Start freehand stroke (pen, hand) - Using Strategy Pattern
   */
  startFreehandStroke(pos, toolConfig, properties) {
    // Require a selected layer - don't auto-create
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) return

    this.isDrawing = true
    this.startPos = pos
    this.currentLayer = layer

    // Use strategy to start stroke
    const strategy = ShapeStrategyFactory.getStrategy('pen')
    this.currentStroke = strategy.start(layer, pos, properties)
    this.currentStrategy = strategy
  }

  /**
   * Continue freehand stroke - Using Strategy Pattern
   */
  continueFreehandStroke(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentStroke || !this.currentStrategy) return

    this.currentStrategy.continue(this.currentStroke, pos)
    // Don't save history during drawing, only update the layer
    this.layerManager.updateLayer(this.currentLayer.id, { strokes: this.currentLayer.strokes })
  }

  /**
   * Finish freehand stroke - Using Strategy Pattern
   */
  finishFreehandStroke() {
    if (this.currentStrategy) {
      this.currentStrategy.finish(this.currentLayer)
    }
    // Save to history when stroke is complete
    this.layerManager.updateLayerWithHistory(this.currentLayer.id, this.currentLayer)
    this.isDrawing = false
    this.currentStroke = null
    this.currentStrategy = null
  }

  /**
   * Start shape (arrow, rect, ellipse) - Using Strategy Pattern
   */
  startShape(pos, toolConfig, properties) {
    // Require a selected layer - don't auto-create
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) return

    this.isDrawing = true
    this.startPos = pos
    this.currentLayer = layer
    this.currentShapeType = toolConfig.id

    // Get strategy for this shape type
    this.currentStrategy = ShapeStrategyFactory.getStrategy(toolConfig.id)
  }

  /**
   * Preview shape (during drag) - Using Strategy Pattern
   */
  previewShape(pos, toolConfig, properties) {
    if (!this.isDrawing || !this.currentLayer || !this.currentStrategy) return

    this.currentStrategy.preview(this.currentLayer, this.startPos, pos, properties)
    // Don't save history during preview, only update the layer
    this.layerManager.updateLayer(this.currentLayer.id, this.currentLayer)
  }

  /**
   * Finish shape - Using Strategy Pattern
   */
  finishShape() {
    if (!this.currentLayer) {
      this.isDrawing = false
      this.currentShapeType = null
      this.currentStrategy = null
      return
    }

    if (this.currentStrategy) {
      this.currentStrategy.finish(this.currentLayer)
    }

    // Save to history when shape is complete
    this.layerManager.updateLayerWithHistory(this.currentLayer.id, this.currentLayer)
    this.isDrawing = false
    this.currentShapeType = null
    this.currentStrategy = null
  }

  /**
   * Place text - Using Strategy Pattern
   */
  placeText(pos, toolConfig, properties, textContent) {
    if (!textContent) return

    // Require a selected layer - don't auto-create
    let layer = this.layerManager.getSelectedLayer()
    if (!layer) return

    // Use strategy to place text
    const strategy = ShapeStrategyFactory.getStrategy('text')
    strategy.place(layer, pos, properties, textContent)

    // Save to history when text is placed
    this.layerManager.updateLayerWithHistory(layer.id, { texts: layer.texts })
  }

  /**
   * Find shape at position (delegated to ShapeOperations)
   */
  findShapeAtPosition(pos) {
    return ShapeOperations.findShapeAtPosition(pos, this.layerManager)
  }

  /**
   * Get bounding box for a shape (delegated to ShapeOperations)
   */
  getShapeBounds(layer, shapeType, shapeIndex) {
    return ShapeOperations.getShapeBounds(layer, shapeType, shapeIndex)
  }

  /**
   * Check if point is on a resize handle
   */
  getResizeHandle(pos, bounds) {
    const padding = SELECTION_PADDING
    const threshold = HANDLE_HIT_THRESHOLD

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
   * Start marquee selection
   */
  startMarqueeSelection(pos) {
    this.isMarqueeSelecting = true
    this.marqueeStart = { ...pos }
    this.marqueeCurrent = { ...pos }
  }

  /**
   * Update marquee selection
   */
  updateMarqueeSelection(pos) {
    if (!this.isMarqueeSelecting) return
    this.marqueeCurrent = { ...pos }
  }

  /**
   * Finish marquee selection and select shapes
   */
  finishMarqueeSelection() {
    if (!this.isMarqueeSelecting || !this.marqueeStart || !this.marqueeCurrent) {
      this.isMarqueeSelecting = false
      return null
    }

    const selectionRect = this.getMarqueeRect()
    const selectedShapes = this.findShapesInRect(selectionRect)

    this.isMarqueeSelecting = false
    this.marqueeStart = null
    this.marqueeCurrent = null

    if (selectedShapes.length > 0) {
      this.selectedShapes = selectedShapes
      return selectedShapes
    }

    return null
  }

  /**
   * Get marquee rectangle bounds
   */
  getMarqueeRect() {
    if (!this.marqueeStart || !this.marqueeCurrent) return null

    const x = Math.min(this.marqueeStart.x, this.marqueeCurrent.x)
    const y = Math.min(this.marqueeStart.y, this.marqueeCurrent.y)
    const width = Math.abs(this.marqueeCurrent.x - this.marqueeStart.x)
    const height = Math.abs(this.marqueeCurrent.y - this.marqueeStart.y)

    return { x, y, width, height }
  }

  /**
   * Find all shapes within or touching rectangle (delegated to ShapeOperations)
   */
  findShapesInRect(rect) {
    return ShapeOperations.findShapesInRect(rect, this.layerManager)
  }

  /**
   * Get unified bounding box for multiple shapes (delegated to ShapeOperations)
   */
  getMultiShapeBounds(shapes) {
    return ShapeOperations.getMultiShapeBounds(shapes, this.layerManager)
  }

  /**
   * Select object with optional shift-click multi-selection
   */
  selectObject(pos, isShiftHeld = false) {
    // First check if clicking on a resize handle
    if (this.selectedShape || this.selectedShapes) {
      const bounds = this.selectedShapes
        ? this.getMultiShapeBounds(this.selectedShapes)
        : (() => {
            const layer = this.layerManager.getLayer(this.selectedShape.layerId)
            return layer ? this.getShapeBounds(layer, this.selectedShape.shapeType, this.selectedShape.shapeIndex) : null
          })()

      if (bounds) {
        const handle = this.getResizeHandle(pos, bounds)
        if (handle) {
          this.resizeHandle = handle
          this.resizeStartPos = pos
          this.resizeStartBounds = { ...bounds }
          this.isResizing = true
          return this.selectedShape || this.selectedShapes
        }
      }
    }

    // Check if clicking on existing selection (only if not shift-clicking)
    if (this.selectedShapes && !isShiftHeld) {
      const bounds = this.getMultiShapeBounds(this.selectedShapes)
      if (bounds && ShapeOperations.isPointInRect(pos.x, pos.y, bounds)) {
        // Clicking inside multi-selection, start dragging
        this.isDragging = false
        this.isResizing = false
        this.resizeHandle = null
        return this.selectedShapes
      }
    }

    // Find shape at position
    const clickedShape = this.findShapeAtPosition(pos)

    // Handle shift-click multi-selection
    if (isShiftHeld && clickedShape) {
      return this.toggleShapeInSelection(clickedShape)
    }

    // Normal single selection (no shift)
    this.selectedShape = clickedShape
    this.selectedShapes = null
    this.isDragging = false
    this.isResizing = false
    this.resizeHandle = null
    return clickedShape
  }

  /**
   * Toggle a shape in/out of multi-selection (for shift-click)
   */
  toggleShapeInSelection(clickedShape) {
    // Helper to compare shapes
    const isSameShape = (s1, s2) => {
      return s1.layerId === s2.layerId &&
             s1.shapeType === s2.shapeType &&
             s1.shapeIndex === s2.shapeIndex
    }

    // No current selection, select the clicked shape
    if (!this.selectedShape && !this.selectedShapes) {
      this.selectedShape = clickedShape
      this.selectedShapes = null
      return clickedShape
    }

    // Single shape selected
    if (this.selectedShape && !this.selectedShapes) {
      // If clicking the same shape, deselect it
      if (isSameShape(this.selectedShape, clickedShape)) {
        this.selectedShape = null
        this.selectedShapes = null
        return null
      }

      // Convert to multi-selection with both shapes
      this.selectedShapes = [this.selectedShape, clickedShape]
      this.selectedShape = null
      return this.selectedShapes
    }

    // Multi-selection already exists
    if (this.selectedShapes) {
      // Check if clicked shape is already in selection
      const existingIndex = this.selectedShapes.findIndex(s => isSameShape(s, clickedShape))

      if (existingIndex !== -1) {
        // Remove from selection (toggle off)
        const newSelection = [...this.selectedShapes]
        newSelection.splice(existingIndex, 1)

        // If only one shape left, convert back to single selection
        if (newSelection.length === 1) {
          this.selectedShape = newSelection[0]
          this.selectedShapes = null
          return this.selectedShape
        }

        // If no shapes left, clear selection
        if (newSelection.length === 0) {
          this.selectedShape = null
          this.selectedShapes = null
          return null
        }

        this.selectedShapes = newSelection
        return this.selectedShapes
      } else {
        // Add to selection
        this.selectedShapes = [...this.selectedShapes, clickedShape]
        return this.selectedShapes
      }
    }

    return null
  }

  /**
   * Resize shape (delegated to ShapeOperations)
   */
  resizeShape(pos) {
    if (!this.selectedShape || !this.resizeHandle) return

    const layer = this.layerManager.getLayer(this.selectedShape.layerId)
    if (!layer) return

    const { shapeType, shapeIndex } = this.selectedShape
    const dx = pos.x - this.resizeStartPos.x
    const dy = pos.y - this.resizeStartPos.y

    ShapeOperations.resizeShape(
      layer,
      shapeType,
      shapeIndex,
      this.resizeHandle,
      this.resizeStartBounds,
      dx,
      dy
    )

    // Don't save history during resize, only update the layer
    this.layerManager.updateLayer(layer.id, layer)
  }

  /**
   * Move shape by delta (delegated to ShapeOperations)
   */
  moveShape(layer, shapeType, shapeIndex, dx, dy) {
    ShapeOperations.moveShape(layer, shapeType, shapeIndex, dx, dy)
  }

  /**
   * Drag object
   */
  dragObject(pos) {
    if (!this.selectedShape && !this.selectedShapes) return

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

    const dx = pos.x - this.dragStartPos.x
    const dy = pos.y - this.dragStartPos.y

    // Handle multi-shape drag
    if (this.selectedShapes) {
      const updatedLayers = new Set()

      for (const shape of this.selectedShapes) {
        const layer = this.layerManager.getLayer(shape.layerId)
        if (!layer) continue

        this.moveShape(layer, shape.shapeType, shape.shapeIndex, dx, dy)
        updatedLayers.add(layer.id)
      }

      // Update all affected layers (without saving to history during drag)
      for (const layerId of updatedLayers) {
        const layer = this.layerManager.getLayer(layerId)
        if (layer) {
          this.layerManager.updateLayer(layerId, layer)
        }
      }
    } else if (this.selectedShape) {
      // Single shape drag
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (layer) {
        this.moveShape(layer, this.selectedShape.shapeType, this.selectedShape.shapeIndex, dx, dy)
        this.layerManager.updateLayer(layer.id, layer)
      }
    }

    this.dragStartPos = pos
  }

  /**
   * Release object
   */
  releaseObject() {
    // Save to history when drag/resize is complete
    if (this.isDragging || this.isResizing) {
      if (this.selectedShapes) {
        const updatedLayers = new Set()
        for (const shape of this.selectedShapes) {
          updatedLayers.add(shape.layerId)
        }
        for (const layerId of updatedLayers) {
          const layer = this.layerManager.getLayer(layerId)
          if (layer) {
            this.layerManager.updateLayerWithHistory(layerId, layer)
          }
        }
      } else if (this.selectedShape) {
        const layer = this.layerManager.getLayer(this.selectedShape.layerId)
        if (layer) {
          this.layerManager.updateLayerWithHistory(this.selectedShape.layerId, layer)
        }
      }
    }

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
   * Get selected shapes (multiple)
   */
  getSelectedShapes() {
    return this.selectedShapes
  }

  /**
   * Get marquee selection state
   */
  getMarqueeSelection() {
    if (!this.isMarqueeSelecting || !this.marqueeStart || !this.marqueeCurrent) {
      return null
    }
    return this.getMarqueeRect()
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedShape = null
    this.selectedShapes = null
    this.isMarqueeSelecting = false
    this.marqueeStart = null
    this.marqueeCurrent = null
  }

  /**
   * Start panning
   */
  startPan(pos) {
    this.isPanning = true
    this.panStartPos = { ...pos }
  }

  /**
   * Continue panning
   */
  continuePan(pos, screenX, screenY) {
    if (!this.isPanning || !this.panStartPos) return

    const dx = screenX - this.panLastScreenX
    const dy = screenY - this.panLastScreenY

    this.canvasManager.pan(dx, dy)
  }

  /**
   * Finish panning
   */
  finishPan() {
    this.isPanning = false
    this.panStartPos = null
    this.panLastScreenX = null
    this.panLastScreenY = null
  }

  /**
   * Check if currently panning
   */
  isPanningActive() {
    return this.isPanning
  }
}
