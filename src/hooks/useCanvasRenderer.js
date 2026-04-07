/**
 * Canvas Renderer Hook
 * Handles all canvas rendering logic
 */

import { useCallback } from 'react'
import { GRID_SIZE, SELECTION_PADDING, RESIZE_HANDLE_SIZE, HANDLE_HIT_THRESHOLD, ROTATION_HANDLE_OFFSET, ROTATION_HANDLE_RADIUS } from '../config/uiConstants'
import { ShapeOperations } from '../services/ShapeOperations'
import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'

import { collectLayerShapes, sortByZOrder } from '../utils/shapeOrderUtils'
import { rotatePoint } from '../utils/rotationUtils'

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

        // Collect and sort all shapes by z-order
        const allShapes = sortByZOrder(collectLayerShapes(layer))

        // Render in z-order
        for (const entry of allShapes) {
          shapeRendererRef.current.renderShape(ctx, entry.type, entry.shape, entry.color)
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

    const selected = selectedShapeRef.current
    const effectiveShape = Array.isArray(selected) && selected.length === 1 ? selected[0] : selected
    const isSingle = !Array.isArray(effectiveShape)
    const shapeType = isSingle ? effectiveShape.shapeType : null
    const isEndpointShape = shapeType === 'arrow' || shapeType === 'connector'

    // Get rotation for selection box
    let shapeRotation = 0
    if (isSingle && !isEndpointShape) {
      const layer = layerManagerRef.current.getLayer(effectiveShape.layerId)
      const arrayName = SHAPE_ARRAY_MAP[effectiveShape.shapeType]
      const shapeData = arrayName ? layer?.[arrayName]?.[effectiveShape.shapeIndex]
        : (effectiveShape.shapeType === 'image' ? layer?.image : null)
      shapeRotation = shapeData?.rotation || 0
    }

    // For group rotation, use the live rotation delta and original bounds
    let drawBounds = bounds
    const handler = toolHandlerRef.current
    if (!isSingle && handler?.isRotating && handler.groupRotationDelta && handler.groupRotationBounds) {
      shapeRotation = handler.groupRotationDelta
      drawBounds = handler.groupRotationBounds
    }

    // Apply rotation transform for selection box
    const centerX = drawBounds.x + drawBounds.width / 2
    const centerY = drawBounds.y + drawBounds.height / 2
    if (shapeRotation) {
      ctx.translate(centerX, centerY)
      ctx.rotate(shapeRotation)
      ctx.translate(-centerX, -centerY)
    }

    // Draw dashed bounding box (skip for arrows/connectors -- they use endpoint handles)
    if (!isEndpointShape) {
      ctx.strokeStyle = '#667eea'
      ctx.lineWidth = 2 / canvasManager.zoom
      ctx.setLineDash([SELECTION_PADDING / canvasManager.zoom, SELECTION_PADDING / canvasManager.zoom])
      ctx.strokeRect(
        drawBounds.x - padding,
        drawBounds.y - padding,
        drawBounds.width + padding * 2,
        drawBounds.height + padding * 2
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
      const layer = layerManagerRef.current.getLayer(effectiveShape.layerId)
      const arrayName = shapeType === 'arrow' ? 'arrows' : 'connectors'
      const shape = layer?.[arrayName]?.[effectiveShape.shapeIndex]
      if (shape) {
        const size = shape.size || 2
        const headLength = Math.max(6, 8 + Math.log(size) * 6)
        const waypoints = shape.waypoints || []
        const lastPt = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: shape.fromX, y: shape.fromY }
        const angle = Math.atan2(shape.toY - lastPt.y, shape.toX - lastPt.x)
        const headTipX = shape.toX + headLength * Math.cos(angle)
        const headTipY = shape.toY + headLength * Math.sin(angle)

        handles = [
          { x: shape.fromX, y: shape.fromY, cursor: 'crosshair' },
          { x: headTipX, y: headTipY, cursor: 'crosshair' },
        ]

        // Add waypoint handles for connectors
        if (shapeType === 'connector' && waypoints.length > 0) {
          for (const wp of waypoints) {
            handles.push({ x: wp.x, y: wp.y, cursor: 'move', isWaypoint: true })
          }
        }
      }
    } else {
      // Standard corner/edge handles for other shapes
      handles = [
        { x: drawBounds.x - padding, y: drawBounds.y - padding, cursor: 'nw-resize' },
        { x: drawBounds.x + drawBounds.width + padding, y: drawBounds.y - padding, cursor: 'ne-resize' },
        { x: drawBounds.x - padding, y: drawBounds.y + drawBounds.height + padding, cursor: 'sw-resize' },
        { x: drawBounds.x + drawBounds.width + padding, y: drawBounds.y + drawBounds.height + padding, cursor: 'se-resize' },
        { x: drawBounds.x + drawBounds.width / 2, y: drawBounds.y - padding, cursor: 'n-resize' },
        { x: drawBounds.x + drawBounds.width / 2, y: drawBounds.y + drawBounds.height + padding, cursor: 's-resize' },
        { x: drawBounds.x - padding, y: drawBounds.y + drawBounds.height / 2, cursor: 'w-resize' },
        { x: drawBounds.x + drawBounds.width + padding, y: drawBounds.y + drawBounds.height / 2, cursor: 'e-resize' },
      ]
    }

    handles.forEach(handle => {
      if (handle.isWaypoint) {
        // Draw waypoint as circle
        ctx.beginPath()
        ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
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
      }
    })


    // Draw rotation handle (skip for arrows/connectors)
    if (!isEndpointShape) {
      const rotHandleX = drawBounds.x + drawBounds.width / 2
      const rotHandleY = drawBounds.y - padding - ROTATION_HANDLE_OFFSET
      const rotRadius = ROTATION_HANDLE_RADIUS / canvasManager.zoom

      // Draw line from top-center to rotation handle
      ctx.strokeStyle = '#667eea'
      ctx.lineWidth = 1.5 / canvasManager.zoom
      ctx.beginPath()
      ctx.moveTo(rotHandleX, drawBounds.y - padding)
      ctx.lineTo(rotHandleX, rotHandleY)
      ctx.stroke()

      // Draw rotation handle circle
      ctx.fillStyle = '#667eea'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5 / canvasManager.zoom
      ctx.beginPath()
      ctx.arc(rotHandleX, rotHandleY, rotRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    canvasManager.resetTransform()
    canvasManager.restore()
  }, [layerManagerRef, toolHandlerRef, selectedShapeRef])

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

    // Get rotation for a shape
    const getShapeRotation = (layer, shapeType, shapeIndex) => {
      const arrayName = SHAPE_ARRAY_MAP[shapeType]
      const shapeData = arrayName ? layer[arrayName]?.[shapeIndex] : null
      return shapeData?.rotation || 0
    }

    const drawAnchorDots = (bounds, highlightAnchor, rotation) => {
      const dotRadius = 4 / canvasManager.zoom
      const center = rotation ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 } : null
      for (const anchor of anchors) {
        let pt = getAnchorPt(bounds, anchor)
        if (rotation && center) {
          pt = rotatePoint(pt.x, pt.y, center.x, center.y, rotation)
        }
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

    // During connector drawing or endpoint dragging: highlight target shape + anchor dots
    if ((handler.isDrawing || handler.isConnectorEndpointDragging) && handler.connectorHoverTarget) {
      const target = handler.connectorHoverTarget
      const layer = layerManagerRef.current?.getLayer(target.layerId)
      if (layer) {
        const bounds = ShapeOperations.getShapeBounds(layer, target.shapeType, target.shapeIndex)
        if (bounds) {
          canvasManager.save()
          canvasManager.applyTransform()

          const rotation = getShapeRotation(layer, target.shapeType, target.shapeIndex)

          // Highlight rect around target shape (with rotation)
          ctx.strokeStyle = '#4a9eff'
          ctx.lineWidth = 2 / canvasManager.zoom
          ctx.setLineDash([])
          if (rotation) {
            const cx = bounds.x + bounds.width / 2
            const cy = bounds.y + bounds.height / 2
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(rotation)
            ctx.translate(-cx, -cy)
            ctx.strokeRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6)
            ctx.restore()
          } else {
            ctx.strokeRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6)
          }

          // Anchor dots with the snapped anchor highlighted (rotated to world space)
          drawAnchorDots(bounds, target.anchor, rotation)

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
          const rotation = getShapeRotation(layer, shape.shapeType, shape.shapeIndex)
          canvasManager.save()
          canvasManager.applyTransform()
          drawAnchorDots(bounds, null, rotation)
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

        // Collect and sort shapes by z-order
        const allShapes = collectLayerShapes(layer)
        allShapes.sort((a, b) => {
          const za = a.shape.zOrder ?? -1
          const zb = b.shape.zOrder ?? -1
          if (za === zb) return a.legacyOrder - b.legacyOrder
          return za - zb
        })

        for (const entry of allShapes) {
          shapeRendererRef.current.renderShape(ctx, entry.type, entry.shape, entry.color)
        }
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
