/**
 * Tool Handler
 * Base class for tool behaviors
 * Extensible for adding new tools
 */

import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'
import { ShapeOperations } from '../services/ShapeOperations'
import { ShapeStrategyFactory, FreehandStrokeStrategy } from './strategies/ShapeCreationStrategies'
import {
  SELECTION_PADDING,
  RESIZE_HANDLE_SIZE,
  HANDLE_HIT_THRESHOLD,
  LINE_HIT_THRESHOLD,
  TEXT_WIDTH_FACTOR
} from '../config/uiConstants'

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
      // Increase threshold slightly to account for visual handle size
      if (dist < threshold + 2) {
        return handle.name
      }
    }

    return null
  }

  /**
   * Detect if click is near an arrow endpoint (for endpoint dragging)
   */
  getArrowEndpointHandle(pos, arrow) {
    const threshold = HANDLE_HIT_THRESHOLD

    // Check distance to 'from' endpoint
    const distFromStart = Math.sqrt((pos.x - arrow.fromX) ** 2 + (pos.y - arrow.fromY) ** 2)
    if (distFromStart < threshold + 2) {
      return 'from'
    }

    // Calculate the visual arrow head tip position for 'to' endpoint
    const size = arrow.size || 2
    const headLength = Math.max(6, 8 + Math.log(size) * 6)
    const angle = Math.atan2(arrow.toY - arrow.fromY, arrow.toX - arrow.fromX)
    const headTipX = arrow.toX + headLength * Math.cos(angle)
    const headTipY = arrow.toY + headLength * Math.sin(angle)

    // Check distance to visual arrow head tip
    const distFromEnd = Math.sqrt((pos.x - headTipX) ** 2 + (pos.y - headTipY) ** 2)
    if (distFromEnd < threshold + 2) {
      return 'to'
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
    // PRIORITY 1: Check if clicking on existing multi-shape selection bounds first
    // This ensures Ctrl+A selection takes priority for movement
    if (this.selectedShapes && !isShiftHeld && this.selectedShapes.length > 0) {
      const bounds = this.getMultiShapeBounds(this.selectedShapes)
      if (bounds) {
        // Check if clicking inside multi-selection bounds or on resize handles
        const handle = this.getResizeHandle(pos, bounds)
        if (handle) {
          // Clicking on a resize handle - start resizing the group
          this.resizeHandle = handle
          this.resizeStartPos = pos
          this.resizeStartBounds = { ...bounds }
          this.resizeGroupStartBounds = { ...bounds }
          this.isResizing = true
          return this.selectedShapes
        }

        // Add padding to be more forgiving
        const padding = 5
        const expandedBounds = {
          x: bounds.x - padding,
          y: bounds.y - padding,
          width: bounds.width + padding * 2,
          height: bounds.height + padding * 2
        }
        if (ShapeOperations.isPointInRect(pos.x, pos.y, expandedBounds)) {
          // Clicking inside multi-selection bounds, preserve for dragging
          this.isDragging = false
          this.isResizing = false
          this.resizeHandle = null
          return this.selectedShapes
        }
      }
    }

    // PRIORITY 2: Check single selection and handles
    if (this.selectedShape && !this.selectedShapes) {
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (layer) {
        const bounds = this.getShapeBounds(layer, this.selectedShape.shapeType, this.selectedShape.shapeIndex)

        if (bounds) {
          // Check if this is a single arrow and if clicking on an endpoint
          if (this.selectedShape.shapeType === 'arrow' && layer.arrows[this.selectedShape.shapeIndex]) {
            const arrow = layer.arrows[this.selectedShape.shapeIndex]
            const endpointHandle = this.getArrowEndpointHandle(pos, arrow)
            if (endpointHandle) {
              // Activate endpoint drag mode
              this.isArrowEndpointDragging = true
              this.arrowEndpointHandle = endpointHandle
              this.arrowEndpointStartPos = pos
              return this.selectedShape
            }
          }

          // Check if clicking on a resize handle
          const handle = this.getResizeHandle(pos, bounds)
          if (handle) {
            this.resizeHandle = handle
            this.resizeStartPos = pos
            this.resizeStartBounds = { ...bounds }
            this.isResizing = true
            return this.selectedShape
          }

          // Check if clicking inside the selected shape bounds (for dragging)
          if (!isShiftHeld && ShapeOperations.isPointInRect(pos.x, pos.y, bounds)) {
            this.isDragging = false
            this.isResizing = false
            this.resizeHandle = null
            return this.selectedShape
          }
        }
      }
    }

    // Also check if single selected shape is being clicked (for dragging)
    if (this.selectedShape && !isShiftHeld) {
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (layer) {
        const bounds = this.getShapeBounds(layer, this.selectedShape.shapeType, this.selectedShape.shapeIndex)
        if (bounds && ShapeOperations.isPointInRect(pos.x, pos.y, bounds)) {
          // Clicking on the selected shape, preserve selection for dragging
          this.isDragging = false
          this.isResizing = false
          this.resizeHandle = null
          return this.selectedShape
        }
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
  resizeShape(pos, isShiftHeld = false) {
    if ((!this.selectedShape && !this.selectedShapes) || !this.resizeHandle) return

    // Handle multi-shape group resize
    if (this.selectedShapes) {
      // Use the stored group bounds from when resize started
      const originalGroupBounds = this.resizeGroupStartBounds || this.resizeStartBounds
      if (!originalGroupBounds) return

      // Calculate new group bounds based on resize handle and current mouse position
      const dx = pos.x - this.resizeStartPos.x
      const dy = pos.y - this.resizeStartPos.y

      const { newX, newY, newWidth, newHeight } = ShapeOperations.calculateNewBounds(
        this.resizeHandle,
        originalGroupBounds,
        dx,
        dy,
        isShiftHeld
      )

      const newGroupBounds = { x: newX, y: newY, width: newWidth, height: newHeight }

      // Check if any shape in the group is an image - if so, always preserve aspect ratio
      const hasImage = this.selectedShapes.some(shape => shape.shapeType === 'image')
      const preserveAspectRatio = hasImage ? true : isShiftHeld

      // Resize all shapes as a group
      const updatedLayers = ShapeOperations.resizeShapeGroup(
        this.selectedShapes,
        this.layerManager,
        originalGroupBounds,
        newGroupBounds,
        this.resizeHandle,
        preserveAspectRatio
      )

      // Update all affected layers
      if (updatedLayers) {
        for (const [layerId, layer] of updatedLayers) {
          this.layerManager.updateLayer(layerId, layer)
        }
      }
    } else if (this.selectedShape) {
      // Single shape resize
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (!layer) return

      const { shapeType, shapeIndex } = this.selectedShape

      // Always preserve aspect ratio for images
      const preserveAspectRatio = shapeType === 'image' ? true : isShiftHeld

      ShapeOperations.resizeShape(
        layer,
        shapeType,
        shapeIndex,
        this.resizeHandle,
        this.resizeStartBounds,
        pos.x - this.resizeStartPos.x,
        pos.y - this.resizeStartPos.y,
        preserveAspectRatio
      )

      // Don't save history during resize, only update the layer
      this.layerManager.updateLayer(layer.id, layer)
    }
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
  dragObject(pos, isShiftHeld = false) {
    if (!this.selectedShape && !this.selectedShapes) return

    // Handle arrow endpoint dragging
    if (this.isArrowEndpointDragging && this.selectedShape) {
      const layer = this.layerManager.getLayer(this.selectedShape.layerId)
      if (layer && layer.arrows && layer.arrows[this.selectedShape.shapeIndex]) {
        const arrow = layer.arrows[this.selectedShape.shapeIndex]
        let newX = pos.x
        let newY = pos.y

        // If dragging the 'to' endpoint, convert from visual head tip to actual endpoint
        if (this.arrowEndpointHandle === 'to') {
          const size = arrow.size || 2
          const headLength = Math.max(6, 8 + Math.log(size) * 6)
          // We need to move backwards from the mouse position by headLength in the direction
          // Calculate what the direction should be from the new head tip
          // For now, use the current arrow direction as reference, but adjust as we drag
          const angle = Math.atan2(pos.y - arrow.fromY, pos.x - arrow.fromX)
          newX = pos.x - headLength * Math.cos(angle)
          newY = pos.y - headLength * Math.sin(angle)
        }

        // Update the endpoint to the calculated position
        ShapeOperations.modifyArrowEndpoint(
          layer,
          this.selectedShape.shapeIndex,
          this.arrowEndpointHandle,
          newX,
          newY
        )
        this.layerManager.updateLayer(layer.id, layer)
      }
      return
    }

    // If resizing, call resize instead
    if (this.isResizing) {
      this.resizeShape(pos, isShiftHeld)
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
    // Save to history when drag/resize/endpoint-drag is complete
    if (this.isDragging || this.isResizing || this.isArrowEndpointDragging) {
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
    this.isArrowEndpointDragging = false
    this.dragStartPos = null
    this.resizeHandle = null
    this.resizeStartPos = null
    this.resizeStartBounds = null
    this.arrowEndpointHandle = null
    this.arrowEndpointStartPos = null
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
