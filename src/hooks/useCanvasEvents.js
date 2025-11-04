/**
 * Custom hook for canvas event handling
 * Separates event handling logic from main component
 */

import { useCallback } from 'react'
import { getToolConfig } from '../tools/toolRegistry'

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
      setTimeout(() => renderCanvas(), 0)
    }
  }, [getCanvasCoordinates, tool, getToolProperties, toolHandlerRef, selectedShapeRef, setSelectedShape, renderCanvas])

  /**
   * Handle mouse move
   */
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

    // Default cursor based on tool
    if (tool === 'select') {
      canvas.style.cursor = 'pointer'
    } else if (tool === 'pan') {
      canvas.style.cursor = 'grab'
    } else {
      canvas.style.cursor = 'crosshair'
    }
  }, [tool, selectedShapeRef, layerManagerRef, toolHandlerRef])

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
