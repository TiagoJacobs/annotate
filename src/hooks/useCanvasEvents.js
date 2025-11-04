/**
 * Custom hook for canvas event handling
 * Separates event handling logic from main component
 */

import { useCallback } from 'react'
import { getToolConfig } from '../tools/toolRegistry'

export const useCanvasEvents = ({
  tool,
  canvasManagerRef,
  toolHandlerRef,
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
   * Handle canvas click
   */
  const handleCanvasClick = useCallback((e) => {
    if (tool !== 'text') return

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const textContent = prompt('Enter text:')
    if (!textContent) return

    toolHandlerRef.current?.placeText(coords, getToolConfig(tool), getToolProperties(), textContent)
    updateLayersState()
  }, [tool, getCanvasCoordinates, toolHandlerRef, getToolProperties, updateLayersState])

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
    } else if (handler === 'selectObject') {
      const shape = toolHandlerRef.current?.selectObject(coords)

      // If no shape clicked, start marquee selection
      if (!shape) {
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
  const handleCanvasMouseMove = useCallback((e) => {
    if (e.buttons === 0) return

    const coords = getCanvasCoordinates(e)
    if (!coords) return

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
    } else if (handler === 'dragObject') {
      // Check if we're doing marquee selection
      if (toolHandlerRef.current?.isMarqueeSelecting) {
        toolHandlerRef.current?.updateMarqueeSelection(coords)
        renderCanvas()
      } else {
        toolHandlerRef.current?.dragObject(coords)
        updateLayersState()
        renderCanvas()
      }
    }
  }, [getCanvasCoordinates, tool, getToolProperties, toolHandlerRef, updateLayersState, renderCanvas])

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
