/**
 * Custom hook for canvas event handling
 * Separates event handling logic from main component
 */

import { useCallback } from 'react'
import { getToolConfig } from '../tools/toolRegistry'
import { RESIZE_HANDLE_SIZE } from '../config/uiConstants'

/**
 * Map resize handle names to CSS cursor values
 */
const RESIZE_CURSOR_MAP = {
  nw: 'nwse-resize',  // northwest-southeast
  ne: 'nesw-resize',  // northeast-southwest
  sw: 'nesw-resize',  // northeast-southwest
  se: 'nwse-resize',  // northwest-southeast
  n: 'ns-resize',     // north-south
  s: 'ns-resize',     // north-south
  w: 'ew-resize',     // east-west
  e: 'ew-resize',     // east-west
}

export const useCanvasEvents = ({
  tool,
  canvasManagerRef,
  toolHandlerRef,
  layerManagerRef,
  getToolProperties,
  selectedShapeRef,
  setSelectedShape,
  setInlineEditingText,
  updateLayersState,
  renderCanvas
}) => {
  /**
   * Get coordinates from canvas event
   */
  const getCanvasCoordinates = useCallback((e) => {
    return canvasManagerRef.current?.screenToCanvas(e.clientX, e.clientY)
  }, [canvasManagerRef])

  /**
   * Handle canvas click for text tool - start inline editing
   */
  const handleCanvasClick = useCallback((e) => {
    if (tool !== 'text') return

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const properties = getToolProperties()

    // Place an empty text shape
    toolHandlerRef.current?.placeText(coords, getToolConfig(tool), properties, ' ')

    // Get the layer that was just updated
    const layer = layerManagerRef.current?.getSelectedLayer() ||
                  layerManagerRef.current?.getAllLayers().slice(-1)[0]

    if (!layer || !layer.texts || layer.texts.length === 0) return

    // Get the text we just added (last one)
    const textIndex = layer.texts.length - 1
    const text = layer.texts[textIndex]

    // Convert canvas coordinates to screen coordinates
    const screenPos = canvasManagerRef.current?.canvasToScreen(coords.x, coords.y)
    if (!screenPos) return

    // Trigger inline editing for the new text
    setInlineEditingText({
      layerId: layer.id,
      textIndex: textIndex,
      x: screenPos.screenX,
      y: screenPos.screenY - properties.fontSize, // Adjust for text baseline
      content: ' ',
      fontSize: properties.fontSize
    })

    updateLayersState()
    renderCanvas()
  }, [tool, getCanvasCoordinates, toolHandlerRef, layerManagerRef, canvasManagerRef, getToolProperties, setInlineEditingText, updateLayersState, renderCanvas])

  /**
   * Handle canvas double click
   */
  const handleCanvasDoubleClick = useCallback((e) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const selectedShape = selectedShapeRef.current
    if (!selectedShape || selectedShape.shapeType !== 'text') return

    const layer = toolHandlerRef.current?.layerManager.getLayer(selectedShape.layerId)
    if (!layer || !layer.texts?.[selectedShape.shapeIndex]) return

    const text = layer.texts[selectedShape.shapeIndex]
    const screenPos = canvasManagerRef.current?.canvasToScreen(text.x, text.y)
    if (!screenPos) return

    setInlineEditingText({
      layerId: selectedShape.layerId,
      textIndex: selectedShape.shapeIndex,
      x: screenPos.screenX,
      y: screenPos.screenY - text.fontSize,
      content: text.content,
      fontSize: text.fontSize
    })
  }, [getCanvasCoordinates, selectedShapeRef, toolHandlerRef, canvasManagerRef, setInlineEditingText])

  /**
   * Update cursor based on hover state and selected shapes
   */
  const updateCursor = useCallback((coords, canvas) => {
    if (!canvas) return

    // Only show resize cursor when select tool is active and something is selected
    if (tool === 'select' && selectedShapeRef.current) {
      const shapes = Array.isArray(selectedShapeRef.current)
        ? selectedShapeRef.current
        : [selectedShapeRef.current]

      const selectedShape = shapes[0]
      const layer = layerManagerRef.current?.getLayer(selectedShape.layerId)
      if (layer) {
        // Get bounds of selected shape(s) for resize detection
        const bounds = shapes.length > 1
          ? toolHandlerRef.current?.getMultiShapeBounds?.(shapes)
          : toolHandlerRef.current?.getShapeBounds?.(layer, selectedShape.shapeType, selectedShape.shapeIndex)

        if (bounds) {
          const handle = toolHandlerRef.current?.getResizeHandle(coords, bounds)
          if (handle && RESIZE_CURSOR_MAP[handle]) {
            canvas.style.cursor = RESIZE_CURSOR_MAP[handle]
            return
          }
        }
      }
    }

    // Check if hovering over any shape when select tool is active
    if (tool === 'select') {
      // Check if clicking here would allow dragging/moving
      // This uses the same logic as selectObject to ensure consistency

      let canDrag = false

      // First check if clicking inside multi-selection bounds allows dragging
      if (selectedShapeRef.current && Array.isArray(selectedShapeRef.current)) {
        const bounds = toolHandlerRef.current?.getMultiShapeBounds?.(selectedShapeRef.current)
        if (bounds) {
          const { ShapeOperations } = toolHandlerRef.current?.constructor.prototype || {}
          // Import needed for isPointInRect - check if point is in bounds
          const x = coords.x, y = coords.y
          if (x >= bounds.x && x <= bounds.x + bounds.width &&
              y >= bounds.y && y <= bounds.y + bounds.height) {
            canDrag = true
          }
        }
      }

      // If not in multi-selection bounds, check if hovering over a shape at all
      const shape = toolHandlerRef.current?.findShapeAtPosition?.(coords)
      if (shape) {
        // Check if this is a selected shape (can drag it)
        const isSelectedShape = selectedShapeRef.current &&
          ((Array.isArray(selectedShapeRef.current) &&
            selectedShapeRef.current.some(s =>
              s.layerId === shape.layerId &&
              s.shapeType === shape.shapeType &&
              s.shapeIndex === shape.shapeIndex
            )) ||
          (!Array.isArray(selectedShapeRef.current) &&
            selectedShapeRef.current.layerId === shape.layerId &&
            selectedShapeRef.current.shapeType === shape.shapeType &&
            selectedShapeRef.current.shapeIndex === shape.shapeIndex))

        if (isSelectedShape) {
          canvas.style.cursor = 'move'  // Move cursor when hovering over selected shape
          return
        } else {
          canvas.style.cursor = 'pointer'  // Regular cursor when hovering over an unselected shape
          return
        }
      }

      // Show move cursor if we're inside multi-selection bounds
      if (canDrag) {
        canvas.style.cursor = 'move'
        return
      }

      canvas.style.cursor = 'crosshair'  // Thin crosshair when not hovering over anything
      return
    }

    // Default cursor based on tool
    if (tool === 'pan') {
      canvas.style.cursor = 'grab'
    } else {
      canvas.style.cursor = 'crosshair'
    }
  }, [tool, selectedShapeRef, layerManagerRef, toolHandlerRef])

  /**
   * Handle mouse down
   */
  const handleCanvasMouseDown = useCallback((e) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return

    const handler = toolConfig.handlers?.onMouseDown
    const properties = getToolProperties()

    if (handler === 'startFreehandStroke') {
      toolHandlerRef.current?.startFreehandStroke(coords, toolConfig, properties)
    } else if (handler === 'startShape') {
      toolHandlerRef.current?.startShape(coords, toolConfig, properties)
    } else if (handler === 'startPan') {
      toolHandlerRef.current?.startPan(coords)
      toolHandlerRef.current.panLastScreenX = e.clientX
      toolHandlerRef.current.panLastScreenY = e.clientY
    } else if (handler === 'selectObject') {
      const isShiftHeld = e.shiftKey
      const shape = toolHandlerRef.current?.selectObject(coords, isShiftHeld)

      // If no shape clicked and not shift-clicking, start marquee selection
      if (!shape && !isShiftHeld) {
        toolHandlerRef.current?.startMarqueeSelection(coords)
      }

      selectedShapeRef.current = shape
      setSelectedShape(shape)

      // Update cursor immediately to show move cursor for selected shape
      updateCursor(coords, e.currentTarget)

      renderCanvas()
    }
  }, [getCanvasCoordinates, tool, getToolProperties, toolHandlerRef, selectedShapeRef, setSelectedShape, renderCanvas, updateCursor])

  /**
   * Handle canvas mouse move (for drawing and dragging)
   */
  const handleCanvasMouseMove = useCallback((e) => {
    const canvas = e.currentTarget
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    // Always update cursor when hovering
    updateCursor(coords, canvas)

    // Only handle drag operations when mouse button is pressed
    if (e.buttons === 0) return

    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return

    const handler = toolConfig.handlers?.onMouseMove
    const properties = getToolProperties()

    if (handler === 'continueFreehandStroke') {
      toolHandlerRef.current?.continueFreehandStroke(coords, toolConfig, properties)
      updateLayersState()
    } else if (handler === 'previewShape') {
      toolHandlerRef.current?.previewShape(coords, toolConfig, properties)
      updateLayersState()
    } else if (handler === 'continuePan') {
      toolHandlerRef.current?.continuePan(coords, e.clientX, e.clientY)
      toolHandlerRef.current.panLastScreenX = e.clientX
      toolHandlerRef.current.panLastScreenY = e.clientY
      renderCanvas()
    } else if (handler === 'dragObject') {
      // Check if we're doing marquee selection
      if (toolHandlerRef.current?.isMarqueeSelecting) {
        toolHandlerRef.current?.updateMarqueeSelection(coords)
        renderCanvas()
      } else {
        toolHandlerRef.current?.dragObject(coords, e.shiftKey)
        updateLayersState()
        renderCanvas()
      }
    }
  }, [getCanvasCoordinates, tool, getToolProperties, toolHandlerRef, updateLayersState, renderCanvas, updateCursor])

  /**
   * Handle mouse up
   */
  const handleCanvasMouseUp = useCallback(() => {
    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return

    const handler = toolConfig.handlers?.onMouseUp

    if (handler === 'finishFreehandStroke') {
      toolHandlerRef.current?.finishFreehandStroke()
    } else if (handler === 'finishShape') {
      toolHandlerRef.current?.finishShape()
    } else if (handler === 'finishPan') {
      toolHandlerRef.current?.finishPan()
      return // Don't update layers for pan
    } else if (handler === 'releaseObject') {
      // Check if we're finishing marquee selection
      if (toolHandlerRef.current?.isMarqueeSelecting) {
        const selectedShapes = toolHandlerRef.current?.finishMarqueeSelection()
        if (selectedShapes) {
          selectedShapeRef.current = selectedShapes
          setSelectedShape(selectedShapes)
        }
        renderCanvas()
      } else {
        toolHandlerRef.current?.releaseObject()
      }
    }

    updateLayersState()
  }, [tool, toolHandlerRef, selectedShapeRef, setSelectedShape, renderCanvas, updateLayersState])

  /**
   * Handle mouse wheel for zoom
   */
  const handleMouseWheel = useCallback((e, zoomIn) => {
    if (!e.ctrlKey && !e.metaKey) return

    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    zoomIn(delta)
  }, [])

  return {
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleMouseWheel
  }
}
