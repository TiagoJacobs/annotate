/**
 * Canvas Renderer Hook
 * Handles all canvas rendering logic
 */

import { useRef, useCallback } from 'react'
import { GRID_SIZE, SELECTION_PADDING, RESIZE_HANDLE_SIZE, HANDLE_HIT_THRESHOLD } from '../config/uiConstants'
import { ShapeOperations } from '../services/ShapeOperations'

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
        // Render image FIRST (so it's in the background)
        if (layer.image) {
          shapeRendererRef.current.renderShape(ctx, 'image', layer.image)
        }

        // Render shapes ON TOP of image
        layer.strokes?.forEach(stroke => shapeRendererRef.current.renderShape(ctx, 'stroke', stroke, '#000000'))
        layer.arrows?.forEach(arrow => shapeRendererRef.current.renderShape(ctx, 'arrow', arrow, '#000000'))
        layer.rects?.forEach(rect => shapeRendererRef.current.renderShape(ctx, 'rect', rect, '#000000'))
        layer.ellipses?.forEach(ellipse => shapeRendererRef.current.renderShape(ctx, 'ellipse', ellipse, '#000000'))
        layer.texts?.forEach(text => shapeRendererRef.current.renderShape(ctx, 'text', text, '#000000'))
        layer.connectors?.forEach(connector => shapeRendererRef.current.renderShape(ctx, 'connector', connector, '#000000'))
      }

      ctx.globalAlpha = 1
      canvasManager.resetTransform()
      canvasManager.restore()
    })

    // Draw marquee selection rectangle
    renderMarqueeSelection(canvasManager, ctx)

    // Draw selection box with resize handles
    renderSelectionBox(canvasManager, ctx)

    // Draw connector anchor dots and hover highlights
    renderConnectorFeedback(canvasManager, ctx)
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

    const isSingle = !Array.isArray(selectedShapeRef.current)
    const shapeType = isSingle ? selectedShapeRef.current.shapeType : null
    const isEndpointShape = shapeType === 'arrow' || shapeType === 'connector'

    // Draw dashed bounding box (skip for arrows/connectors -- they use endpoint handles)
    if (!isEndpointShape) {
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
    }

    // Draw resize handles
    ctx.fillStyle = '#667eea'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1 / canvasManager.zoom

    let handles = []

    // For arrows and connectors, show endpoint handles instead of corner resize handles
    if (isSingle && isEndpointShape) {
      const layer = layerManagerRef.current.getLayer(selectedShapeRef.current.layerId)
      const arrayName = shapeType === 'arrow' ? 'arrows' : 'connectors'
      const shape = layer?.[arrayName]?.[selectedShapeRef.current.shapeIndex]
      if (shape) {
        const size = shape.size || 2
        const headLength = Math.max(6, 8 + Math.log(size) * 6)
        const angle = Math.atan2(shape.toY - shape.fromY, shape.toX - shape.fromX)
        const headTipX = shape.toX + headLength * Math.cos(angle)
        const headTipY = shape.toY + headLength * Math.sin(angle)

        handles = [
          { x: shape.fromX, y: shape.fromY, cursor: 'crosshair' },
          { x: headTipX, y: headTipY, cursor: 'crosshair' },
        ]
      }
    } else {
      // Standard corner/edge handles for other shapes
      handles = [
        { x: bounds.x - padding, y: bounds.y - padding, cursor: 'nw-resize' },
        { x: bounds.x + bounds.width + padding, y: bounds.y - padding, cursor: 'ne-resize' },
        { x: bounds.x - padding, y: bounds.y + bounds.height + padding, cursor: 'sw-resize' },
        { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, cursor: 'se-resize' },
        { x: bounds.x + bounds.width / 2, y: bounds.y - padding, cursor: 'n-resize' },
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding, cursor: 's-resize' },
        { x: bounds.x - padding, y: bounds.y + bounds.height / 2, cursor: 'w-resize' },
        { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2, cursor: 'e-resize' },
      ]
    }

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

  /**
   * Render connector hover feedback: anchor dots on hovered shapes, highlight on target during drawing
   */
  const renderConnectorFeedback = useCallback((canvasManager, ctx) => {
    const handler = toolHandlerRef.current
    if (!handler) return

    const anchors = ['top', 'bottom', 'left', 'right', 'center']
    const getAnchorPt = (bounds, anchor) => {
      switch (anchor) {
        case 'top': return { x: bounds.x + bounds.width / 2, y: bounds.y }
        case 'bottom': return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
        case 'left': return { x: bounds.x, y: bounds.y + bounds.height / 2 }
        case 'right': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
        case 'center': return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      }
    }

    const drawAnchorDots = (bounds, highlightAnchor) => {
      const dotRadius = 4 / canvasManager.zoom
      for (const anchor of anchors) {
        const pt = getAnchorPt(bounds, anchor)
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2)
        if (anchor === highlightAnchor) {
          ctx.fillStyle = '#4a9eff'
          ctx.fill()
        } else {
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#4a9eff'
          ctx.lineWidth = 1.5 / canvasManager.zoom
          ctx.stroke()
        }
      }
    }

    // During connector drawing: highlight target shape + anchor dots
    if (handler.isDrawing && handler.connectorHoverTarget) {
      const target = handler.connectorHoverTarget
      const layer = layerManagerRef.current?.getLayer(target.layerId)
      if (layer) {
        const bounds = ShapeOperations.getShapeBounds(layer, target.shapeType, target.shapeIndex)
        if (bounds) {
          canvasManager.save()
          canvasManager.applyTransform()

          // Highlight rect around target shape
          ctx.strokeStyle = '#4a9eff'
          ctx.lineWidth = 2 / canvasManager.zoom
          ctx.setLineDash([])
          ctx.strokeRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6)

          // Anchor dots with the snapped anchor highlighted
          drawAnchorDots(bounds, target.anchor)

          canvasManager.resetTransform()
          canvasManager.restore()
        }
      }
      return
    }

    // Hover (not drawing): show anchor dots on shape under cursor
    if (handler.connectorHoverShape) {
      const shape = handler.connectorHoverShape
      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (layer) {
        const bounds = ShapeOperations.getShapeBounds(layer, shape.shapeType, shape.shapeIndex)
        if (bounds) {
          canvasManager.save()
          canvasManager.applyTransform()
          drawAnchorDots(bounds, null)
          canvasManager.resetTransform()
          canvasManager.restore()
        }
      }
    }
  }, [toolHandlerRef, layerManagerRef])

  /**
   * Render canvas for export (without selection UI)
   */
  const renderCanvasForExport = useCallback(() => {
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
        // Render image FIRST (so it's in the background)
        if (layer.image) {
          shapeRendererRef.current.renderShape(ctx, 'image', layer.image)
        }

        // Render shapes ON TOP of image
        layer.strokes?.forEach(stroke => shapeRendererRef.current.renderShape(ctx, 'stroke', stroke, '#000000'))
        layer.arrows?.forEach(arrow => shapeRendererRef.current.renderShape(ctx, 'arrow', arrow, '#000000'))
        layer.rects?.forEach(rect => shapeRendererRef.current.renderShape(ctx, 'rect', rect, '#000000'))
        layer.ellipses?.forEach(ellipse => shapeRendererRef.current.renderShape(ctx, 'ellipse', ellipse, '#000000'))
        layer.texts?.forEach(text => shapeRendererRef.current.renderShape(ctx, 'text', text, '#000000'))
      }

      ctx.globalAlpha = 1
      canvasManager.resetTransform()
      canvasManager.restore()
    })

    // Do NOT draw selection box or marquee for export
  }, [canvasManagerRef, layerManagerRef, shapeRendererRef])

  return {
    renderCanvas,
    renderCanvasForExport
  }
}
