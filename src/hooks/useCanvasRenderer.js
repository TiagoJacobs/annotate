/**
 * Canvas Renderer Hook
 * Handles all canvas rendering logic
 */

import { useRef, useCallback } from 'react'

const GRID_SIZE = 50
const SELECTION_PADDING = 5
const RESIZE_HANDLE_SIZE = 8

export const useCanvasRenderer = (
  canvasManagerRef,
  layerManagerRef,
  toolHandlerRef,
  shapeRendererRef,
  selectedShapeRef
) => {
  /**
   * Render the entire canvas with all layers and decorations
   */
  const renderCanvas = useCallback(() => {
    if (!canvasManagerRef.current) return

    const canvasManager = canvasManagerRef.current
    const ctx = canvasManager.getContext()

    // Draw grid background
    canvasManager.drawGrid(GRID_SIZE)

    // Draw all visible layers
    const allLayers = layerManagerRef.current.getAllLayers()
    allLayers.forEach((layer) => {
      if (!layer.visible) return

      canvasManager.save()
      canvasManager.applyTransform()
      ctx.globalAlpha = layer.opacity

      // Draw all shapes using ShapeRenderer
      if (shapeRendererRef.current) {
        // Render each shape type
        layer.strokes?.forEach(stroke => shapeRendererRef.current.renderShape(ctx, 'stroke', stroke, layer.color))
        layer.arrows?.forEach(arrow => shapeRendererRef.current.renderShape(ctx, 'arrow', arrow, layer.color))
        layer.rects?.forEach(rect => shapeRendererRef.current.renderShape(ctx, 'rect', rect, layer.color))
        layer.ellipses?.forEach(ellipse => shapeRendererRef.current.renderShape(ctx, 'ellipse', ellipse, layer.color))
        layer.texts?.forEach(text => shapeRendererRef.current.renderShape(ctx, 'text', text, layer.color))

        // Render image
        if (layer.image) {
          shapeRendererRef.current.renderShape(ctx, 'image', layer.image)
        }
      }

      ctx.globalAlpha = 1
      canvasManager.resetTransform()
      canvasManager.restore()
    })

    // Draw marquee selection rectangle
    renderMarqueeSelection(canvasManager, ctx)

    // Draw selection box with resize handles
    renderSelectionBox(canvasManager, ctx)
  }, [canvasManagerRef, layerManagerRef, toolHandlerRef, shapeRendererRef, selectedShapeRef])

  /**
   * Render marquee selection rectangle
   */
  const renderMarqueeSelection = useCallback((canvasManager, ctx) => {
    const marqueeRect = toolHandlerRef.current?.getMarqueeSelection()
    if (!marqueeRect) return

    canvasManager.save()
    canvasManager.applyTransform()

    ctx.strokeStyle = '#667eea'
    ctx.fillStyle = 'rgba(102, 126, 234, 0.1)'
    ctx.lineWidth = 1 / canvasManager.zoom
    ctx.setLineDash([5 / canvasManager.zoom, 5 / canvasManager.zoom])

    ctx.fillRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height)
    ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height)

    ctx.setLineDash([])
    canvasManager.resetTransform()
    canvasManager.restore()
  }, [toolHandlerRef])

  /**
   * Render selection box with resize handles
   */
  const renderSelectionBox = useCallback((canvasManager, ctx) => {
    if (!selectedShapeRef.current || !toolHandlerRef.current) return

    let bounds = null

    // Handle multi-shape selection
    if (Array.isArray(selectedShapeRef.current)) {
      bounds = toolHandlerRef.current.getMultiShapeBounds(selectedShapeRef.current)
    } else {
      // Single shape selection
      const layer = layerManagerRef.current.getLayer(selectedShapeRef.current.layerId)
      if (layer) {
        bounds = toolHandlerRef.current.getShapeBounds(layer, selectedShapeRef.current.shapeType, selectedShapeRef.current.shapeIndex)
      }
    }

    if (!bounds) return

    canvasManager.save()
    canvasManager.applyTransform()

    const padding = SELECTION_PADDING
    const handleSize = RESIZE_HANDLE_SIZE / canvasManager.zoom

    // Draw dashed bounding box
    ctx.strokeStyle = '#667eea'
    ctx.lineWidth = 2 / canvasManager.zoom
    ctx.setLineDash([SELECTION_PADDING / canvasManager.zoom, SELECTION_PADDING / canvasManager.zoom])
    ctx.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    )
    ctx.setLineDash([])

    // Draw resize handles
    ctx.fillStyle = '#667eea'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1 / canvasManager.zoom

    const handles = [
      // Corners
      { x: bounds.x - padding, y: bounds.y - padding, cursor: 'nw-resize' }, // top-left
      { x: bounds.x + bounds.width + padding, y: bounds.y - padding, cursor: 'ne-resize' }, // top-right
      { x: bounds.x - padding, y: bounds.y + bounds.height + padding, cursor: 'sw-resize' }, // bottom-left
      { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, cursor: 'se-resize' }, // bottom-right
      // Edges
      { x: bounds.x + bounds.width / 2, y: bounds.y - padding, cursor: 'n-resize' }, // top
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding, cursor: 's-resize' }, // bottom
      { x: bounds.x - padding, y: bounds.y + bounds.height / 2, cursor: 'w-resize' }, // left
      { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2, cursor: 'e-resize' }, // right
    ]

    handles.forEach(handle => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })

    canvasManager.resetTransform()
    canvasManager.restore()
  }, [canvasManagerRef, layerManagerRef, toolHandlerRef, selectedShapeRef])

  return {
    renderCanvas
  }
}
