/**
 * Custom hook for canvas event handling
 * Separates event handling logic from main component
 */

import { useCallback, useEffect, useRef } from 'react'
import { getToolConfig } from '../tools/toolRegistry'
import { RESIZE_HANDLE_SIZE, MIN_BRUSH_SIZE, MAX_BRUSH_SIZE } from '../config/uiConstants'

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
  renderCanvas,
  showSnackbar,
  setZoom,
  selectLayer,
  brushSize,
  setBrushSize,
  canvasReady
}) => {
  // Keep a ref to tool so the wheel handler always reads the current value
  const toolRef = useRef(tool)
  toolRef.current = tool

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

    // Check if user is trying to add text without any layers
    const allLayers = layerManagerRef.current?.getAllLayers() || []
    if (allLayers.length === 0) {
      showSnackbar('Please create a layer first to add text')
      return
    }

    const properties = getToolProperties()

    // Clear selection when creating text
    if (selectedShapeRef.current) {
      selectedShapeRef.current = null
      setSelectedShape(null)
    }

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
  }, [tool, getCanvasCoordinates, toolHandlerRef, layerManagerRef, canvasManagerRef, getToolProperties, setInlineEditingText, updateLayersState, renderCanvas, showSnackbar])

  /**
   * Handle canvas double click
   */
  const handleCanvasDoubleClick = useCallback((e) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const selectedShape = selectedShapeRef.current
    if (!selectedShape) return

    // Handle double-click on text shapes
    if (selectedShape.shapeType === 'text') {
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
      return
    }

    // Handle double-click on rect/ellipse/connector for label editing
    if (selectedShape.shapeType === 'rect' || selectedShape.shapeType === 'ellipse' || selectedShape.shapeType === 'connector') {
      const layer = toolHandlerRef.current?.layerManager.getLayer(selectedShape.layerId)
      if (!layer) return
      const arrayMap = { rect: 'rects', ellipse: 'ellipses', connector: 'connectors' }
      const shape = layer[arrayMap[selectedShape.shapeType]]?.[selectedShape.shapeIndex]
      if (!shape) return

      const label = prompt('Enter label:', shape.label || '')
      if (label !== null) {
        shape.label = label
        toolHandlerRef.current?.layerManager.updateLayerWithHistory(layer.id, layer)
        updateLayersState()
        renderCanvas()
      }
    }
  }, [getCanvasCoordinates, selectedShapeRef, toolHandlerRef, canvasManagerRef, setInlineEditingText, updateLayersState, renderCanvas])

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

    // Check if user is trying to draw without any layers
    const allLayers = layerManagerRef.current?.getAllLayers() || []
    if (allLayers.length === 0 && handler !== 'selectObject' && handler !== 'startPan') {
      showSnackbar('Please create a layer first to draw shapes')
      return
    }

    if (handler === 'startFreehandStroke') {
      // Clear selection when starting to draw
      if (selectedShapeRef.current) {
        selectedShapeRef.current = null
        setSelectedShape(null)
      }
      toolHandlerRef.current?.startFreehandStroke(coords, toolConfig, properties)
    } else if (handler === 'startShape') {
      // Clear selection when starting to draw
      if (selectedShapeRef.current) {
        selectedShapeRef.current = null
        setSelectedShape(null)
      }
      toolHandlerRef.current?.startShape(coords, toolConfig, properties)
    } else if (handler === 'startConnector') {
      if (selectedShapeRef.current) {
        selectedShapeRef.current = null
        setSelectedShape(null)
      }
      toolHandlerRef.current?.startConnector(coords, toolConfig, properties)
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

      // Focus the corresponding layer in the layers panel
      if (shape && !Array.isArray(shape) && shape.layerId) {
        selectLayer(shape.layerId)
      }

      // Update cursor immediately to show move cursor for selected shape
      updateCursor(coords, e.currentTarget)

      renderCanvas()
    }
  }, [getCanvasCoordinates, tool, getToolProperties, toolHandlerRef, selectedShapeRef, setSelectedShape, renderCanvas, updateCursor, layerManagerRef, showSnackbar, selectLayer])

  /**
   * Handle canvas mouse move (for drawing and dragging)
   */
  const handleCanvasMouseMove = useCallback((e) => {
    const canvas = e.currentTarget
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    // Always update cursor when hovering
    updateCursor(coords, canvas)

    // Connector tool hover detection (show anchor dots on shapes)
    if (toolRef.current === 'connector' && toolHandlerRef.current) {
      if (e.buttons === 0) {
        // Not drawing -- detect shape under cursor for anchor dot rendering
        const shape = toolHandlerRef.current.findShapeAtPosition(coords)
        toolHandlerRef.current.connectorHoverShape = shape || null
        renderCanvas()
      }
    }

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
    } else if (handler === 'previewConnector') {
      toolHandlerRef.current?.previewConnector(coords, toolConfig, properties)
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
    } else if (handler === 'finishConnector') {
      toolHandlerRef.current?.finishConnector()
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
          // Focus the layer of the first selected shape
          if (selectedShapes.length > 0 && selectedShapes[0].layerId) {
            selectLayer(selectedShapes[0].layerId)
          }
        }
        renderCanvas()
      } else {
        toolHandlerRef.current?.releaseObject()
      }
    }

    updateLayersState()
  }, [tool, toolHandlerRef, selectedShapeRef, setSelectedShape, renderCanvas, updateLayersState, selectLayer])

  /**
   * Setup wheel event listener with passive: false to allow preventDefault
   */
  useEffect(() => {
    const canvas = canvasManagerRef.current?.canvas
    if (!canvas) return

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+scroll = zoom at mouse cursor position
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const currentZoom = canvasManagerRef.current.zoom
        const newZoom = currentZoom + delta
        canvasManagerRef.current.setZoom(newZoom, mouseX, mouseY)
        setZoom(canvasManagerRef.current.zoom)
        renderCanvas()
      } else {
        // Plain scroll = adjust brush size for drawing tools
        const drawingTools = ['pen', 'arrow', 'rect', 'ellipse']
        if (drawingTools.includes(toolRef.current)) {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -1 : 1
          setBrushSize(prev => {
            const newSize = Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, prev + delta))
            // Update in-progress shape size if actively drawing
            const handler = toolHandlerRef.current
            if (handler && handler.isDrawing && handler.currentLayer) {
              // Update freehand stroke
              if (handler.currentStroke) {
                handler.currentStroke.size = newSize
              }
              // Update preview shapes (arrow, rect, ellipse)
              const layer = handler.currentLayer
              const previewArrays = ['arrows', 'rects', 'ellipses']
              for (const arr of previewArrays) {
                if (layer[arr]) {
                  const preview = layer[arr].find(s => s.isPreview)
                  if (preview) preview.size = newSize
                }
              }
            }
            return newSize
          })
          renderCanvas()
        }
      }
    }

    // Add listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [canvasManagerRef, renderCanvas, setZoom, setBrushSize, canvasReady])

  /**
   * Handle middle-mouse button drag for panning (regardless of tool)
   */
  const handleCanvasMiddleMouseDown = useCallback((e) => {
    // Only handle middle mouse button (button === 1)
    if (e.button !== 1) return

    e.preventDefault()
    toolHandlerRef.current?.startPan(getCanvasCoordinates(e))
    toolHandlerRef.current.panLastScreenX = e.clientX
    toolHandlerRef.current.panLastScreenY = e.clientY
  }, [getCanvasCoordinates, toolHandlerRef])

  const handleCanvasMiddleMouseMove = useCallback((e) => {
    // Only pan if we're actively panning (triggered by middle mouse down)
    if (e.buttons !== 4) return // 4 is the bitmask for middle mouse button

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    toolHandlerRef.current?.continuePan(coords, e.clientX, e.clientY)
    toolHandlerRef.current.panLastScreenX = e.clientX
    toolHandlerRef.current.panLastScreenY = e.clientY
    renderCanvas()
  }, [getCanvasCoordinates, toolHandlerRef, renderCanvas])

  const handleCanvasMiddleMouseUp = useCallback((e) => {
    // Only handle middle mouse button release
    if (e.button !== 1) return

    toolHandlerRef.current?.finishPan()
  }, [toolHandlerRef])

  return {
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMiddleMouseDown,
    handleCanvasMiddleMouseMove,
    handleCanvasMiddleMouseUp
  }
}
