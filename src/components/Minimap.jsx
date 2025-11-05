import { useEffect, useRef } from 'react'
import { Plus, Minus } from 'lucide-react'
import '../styles/Minimap.css'

export const Minimap = ({
  canvasManagerRef,
  layerManagerRef,
  shapeRendererRef,
  isVisible,
  onZoomIn,
  onZoomOut
}) => {
  const minimapCanvasRef = useRef(null)
  const minimapContainerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isDraggingRef = useRef(false)
  const lastContentBoundsRef = useRef(null)

  /**
   * Draw the minimap canvas
   */
  const drawMinimap = () => {
    const minimap = minimapCanvasRef.current
    const ctx = minimap?.getContext('2d')
    if (!ctx || !canvasManagerRef.current || !layerManagerRef.current) return

    const canvasManager = canvasManagerRef.current
    const layerManager = layerManagerRef.current
    const shapeRenderer = shapeRendererRef.current

    // Set minimap size (fixed)
    const minimapWidth = 200
    const minimapHeight = 150
    minimap.width = minimapWidth
    minimap.height = minimapHeight

    // Get all content bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let hasContent = false

    const allLayers = layerManager.getAllLayers()
    allLayers.forEach((layer) => {
      if (!layer.visible) return

      // Check image bounds
      if (layer.image) {
        hasContent = true
        minX = Math.min(minX, layer.image.x || 0)
        minY = Math.min(minY, layer.image.y || 0)
        maxX = Math.max(maxX, (layer.image.x || 0) + layer.image.width)
        maxY = Math.max(maxY, (layer.image.y || 0) + layer.image.height)
      }

      // Check shape bounds (simplified)
      layer.strokes?.forEach(stroke => {
        if (stroke.points && stroke.points.length > 0) {
          hasContent = true
          stroke.points.forEach(point => {
            minX = Math.min(minX, point.x)
            minY = Math.min(minY, point.y)
            maxX = Math.max(maxX, point.x)
            maxY = Math.max(maxY, point.y)
          })
        }
      })

      layer.arrows?.forEach(arrow => {
        if (arrow.x1 !== undefined && arrow.x2 !== undefined) {
          hasContent = true
          minX = Math.min(minX, Math.min(arrow.x1, arrow.x2))
          minY = Math.min(minY, Math.min(arrow.y1, arrow.y2))
          maxX = Math.max(maxX, Math.max(arrow.x1, arrow.x2))
          maxY = Math.max(maxY, Math.max(arrow.y1, arrow.y2))
        }
      })

      layer.rects?.forEach(rect => {
        if (rect.width && rect.height) {
          hasContent = true
          minX = Math.min(minX, rect.x)
          minY = Math.min(minY, rect.y)
          maxX = Math.max(maxX, rect.x + rect.width)
          maxY = Math.max(maxY, rect.y + rect.height)
        }
      })

      layer.ellipses?.forEach(ellipse => {
        if (ellipse.width && ellipse.height) {
          hasContent = true
          minX = Math.min(minX, ellipse.x)
          minY = Math.min(minY, ellipse.y)
          maxX = Math.max(maxX, ellipse.x + ellipse.width)
          maxY = Math.max(maxY, ellipse.y + ellipse.height)
        }
      })

      layer.texts?.forEach(text => {
        hasContent = true
        const textWidth = text.content.length * text.fontSize * 0.6
        minX = Math.min(minX, text.x)
        minY = Math.min(minY, text.y)
        maxX = Math.max(maxX, text.x + textWidth)
        maxY = Math.max(maxY, text.y + text.fontSize)
      })
    })

    if (!hasContent) {
      // Show empty canvas
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, minimapWidth, minimapHeight)
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, minimapWidth, minimapHeight)
      lastContentBoundsRef.current = null
      return
    }

    // Store content bounds for interaction
    lastContentBoundsRef.current = { minX, minY, maxX, maxY }

    // Get visible area in canvas coordinates
    // The canvas coordinate space maps screen pixels to content
    // panX, panY represent how much we've panned in screen coordinates
    // zoom represents the scale factor
    const canvasRect = canvasManager.canvas.getBoundingClientRect()
    const canvasWidth = canvasRect.width
    const canvasHeight = canvasRect.height

    const visibleMinX = -canvasManager.panX / canvasManager.zoom
    const visibleMinY = -canvasManager.panY / canvasManager.zoom
    const visibleMaxX = visibleMinX + canvasWidth / canvasManager.zoom
    const visibleMaxY = visibleMinY + canvasHeight / canvasManager.zoom

    // Calculate the world bounds that minimap should show
    // This includes both content and the current viewport
    const worldMinX = Math.min(minX, visibleMinX) - 50
    const worldMinY = Math.min(minY, visibleMinY) - 50
    const worldMaxX = Math.max(maxX, visibleMaxX) + 50
    const worldMaxY = Math.max(maxY, visibleMaxY) + 50

    const worldWidth = worldMaxX - worldMinX
    const worldHeight = worldMaxY - worldMinY

    // Calculate scale to fit world in minimap
    const scaleX = minimapWidth / worldWidth
    const scaleY = minimapHeight / worldHeight
    const scale = Math.min(scaleX, scaleY)

    // Offset to position world origin in minimap
    const offsetX = -worldMinX * scale
    const offsetY = -worldMinY * scale

    // Clear and draw background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, minimapWidth, minimapHeight)

    // Draw all content at absolute world positions
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    allLayers.forEach((layer) => {
      if (!layer.visible) return
      ctx.globalAlpha = layer.opacity

      if (shapeRenderer) {
        if (layer.image) {
          shapeRenderer.renderShape(ctx, 'image', layer.image)
        }
        layer.strokes?.forEach(stroke => shapeRenderer.renderShape(ctx, 'stroke', stroke, stroke.color || '#000000'))
        layer.arrows?.forEach(arrow => shapeRenderer.renderShape(ctx, 'arrow', arrow, arrow.color || '#000000'))
        layer.rects?.forEach(rect => shapeRenderer.renderShape(ctx, 'rect', rect, rect.color || '#000000'))
        layer.ellipses?.forEach(ellipse => shapeRenderer.renderShape(ctx, 'ellipse', ellipse, ellipse.color || '#000000'))
        layer.texts?.forEach(text => shapeRenderer.renderShape(ctx, 'text', text, text.color || '#000000'))
      }
    })

    ctx.globalAlpha = 1
    ctx.restore()

    // Draw viewport rectangle showing visible area
    // Convert viewport bounds from world space to minimap space
    const vpMinX = offsetX + visibleMinX * scale
    const vpMinY = offsetY + visibleMinY * scale
    const vpMaxX = offsetX + visibleMaxX * scale
    const vpMaxY = offsetY + visibleMaxY * scale

    const vpX = Math.min(vpMinX, vpMaxX)
    const vpY = Math.min(vpMinY, vpMaxY)
    const vpWidth = Math.abs(vpMaxX - vpMinX)
    const vpHeight = Math.abs(vpMaxY - vpMinY)

    ctx.strokeStyle = '#2196f3'
    ctx.lineWidth = 2
    ctx.strokeRect(vpX, vpY, vpWidth, vpHeight)

    // Draw border
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, minimapWidth, minimapHeight)
  }

  /**
   * Setup animation loop to continuously update minimap
   */
  useEffect(() => {
    if (!isVisible) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const updateMinimap = () => {
      drawMinimap()
      animationFrameRef.current = requestAnimationFrame(updateMinimap)
    }

    animationFrameRef.current = requestAnimationFrame(updateMinimap)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isVisible])

  /**
   * Handle mouse down on minimap - start dragging
   */
  const handleMouseDown = (e) => {
    const minimap = minimapCanvasRef.current
    if (!minimap || !lastContentBoundsRef.current) return

    isDraggingRef.current = true
  }

  /**
   * Handle mouse move - drag viewport on minimap
   */
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return

    const minimap = minimapCanvasRef.current
    const bounds = lastContentBoundsRef.current
    const canvasManager = canvasManagerRef.current
    const layerManager = layerManagerRef.current

    if (!minimap || !bounds || !canvasManager || !layerManager) return

    // Get minimap canvas position and dimensions
    const rect = minimap.getBoundingClientRect()
    const minimapX = e.clientX - rect.left
    const minimapY = e.clientY - rect.top

    const minimapWidth = 200
    const minimapHeight = 150

    // Only handle drag if mouse is over the minimap canvas
    if (minimapX < 0 || minimapX > minimapWidth || minimapY < 0 || minimapY > minimapHeight) {
      return
    }

    // Get current viewport bounds in world space
    const canvasRect = canvasManager.canvas.getBoundingClientRect()
    const canvasWidth = canvasRect.width
    const canvasHeight = canvasRect.height

    const visibleMinX = -canvasManager.panX / canvasManager.zoom
    const visibleMinY = -canvasManager.panY / canvasManager.zoom
    const visibleMaxX = visibleMinX + canvasWidth / canvasManager.zoom
    const visibleMaxY = visibleMinY + canvasHeight / canvasManager.zoom

    // Calculate the world bounds (same as in drawMinimap)
    const { minX, minY, maxX, maxY } = bounds
    const worldMinX = Math.min(minX, visibleMinX) - 50
    const worldMinY = Math.min(minY, visibleMinY) - 50
    const worldMaxX = Math.max(maxX, visibleMaxX) + 50
    const worldMaxY = Math.max(maxY, visibleMaxY) + 50

    const worldWidth = worldMaxX - worldMinX
    const worldHeight = worldMaxY - worldMinY

    // Calculate scale (same as in drawMinimap)
    const scaleX = minimapWidth / worldWidth
    const scaleY = minimapHeight / worldHeight
    const scale = Math.min(scaleX, scaleY)

    // Calculate offset (same as in drawMinimap)
    const offsetX = -worldMinX * scale
    const offsetY = -worldMinY * scale

    // Convert minimap coordinates to world coordinates
    const worldX = (minimapX - offsetX) / scale
    const worldY = (minimapY - offsetY) / scale

    // Center the viewport on the clicked position
    const viewportWidth = canvasWidth / canvasManager.zoom
    const viewportHeight = canvasHeight / canvasManager.zoom

    const newPanX = -(worldX - viewportWidth / 2) * canvasManager.zoom
    const newPanY = -(worldY - viewportHeight / 2) * canvasManager.zoom

    // Update canvas pan
    canvasManager.panX = newPanX
    canvasManager.panY = newPanY
  }

  /**
   * Handle mouse up - stop dragging
   */
  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  /**
   * Setup mouse event listeners
   */
  useEffect(() => {
    if (!isVisible) return

    const minimap = minimapCanvasRef.current
    if (!minimap) return

    minimap.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      minimap.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="minimap-container" ref={minimapContainerRef}>
      <div className="minimap-header">
        <span>Minimap</span>
        <div className="minimap-controls">
          <button
            className="minimap-btn"
            onClick={onZoomIn}
            title="Zoom in (+ key)"
          >
            <Plus size={14} />
          </button>
          <button
            className="minimap-btn"
            onClick={onZoomOut}
            title="Zoom out (- key)"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>
      <canvas ref={minimapCanvasRef} className="minimap-canvas" />
    </div>
  )
}
