/**
 * Canvas Export Utilities
 * Handles smart cropping and content bounds calculation for exports
 */

import { getRotatedBoundingBox } from './rotationUtils'
import { collectLayerShapes, sortByZOrder } from './shapeOrderUtils'

/**
 * Expand min/max bounds with a shape's bounding box, accounting for rotation
 */
function expandBounds(bounds, shapeBounds, rotation) {
  const effectiveBounds = rotation ? getRotatedBoundingBox(shapeBounds, rotation) : shapeBounds
  bounds.minX = Math.min(bounds.minX, effectiveBounds.x)
  bounds.minY = Math.min(bounds.minY, effectiveBounds.y)
  bounds.maxX = Math.max(bounds.maxX, effectiveBounds.x + effectiveBounds.width)
  bounds.maxY = Math.max(bounds.maxY, effectiveBounds.y + effectiveBounds.height)
  bounds.hasContent = true
}

/**
 * Get the bounding box of all visible content on the canvas
 * @param {Object} layerManager - The layer manager instance
 * @returns {Object|null} Bounds object {x, y, width, height} or null if no content
 */
export const getContentBounds = (layerManager) => {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, hasContent: false }

  const addRect = (x, y, w, h, rotation) => {
    const shapeBounds = { x, y, width: w, height: h }
    expandBounds(b, shapeBounds, rotation)
  }

  const allLayers = layerManager.getAllLayers()

  allLayers.forEach((layer) => {
    if (!layer.visible) return

    // Check image bounds
    if (layer.image) {
      addRect(layer.image.x, layer.image.y, layer.image.width, layer.image.height)
    }

    // Check shape bounds
    layer.strokes?.forEach(stroke => {
      if (stroke.points && stroke.points.length > 0) {
        // For strokes with rotation, get bounding box of points then apply rotation
        const padding = (stroke.size || 3) / 2
        const xs = stroke.points.map(p => p.x)
        const ys = stroke.points.map(p => p.y)
        addRect(
          Math.min(...xs) - padding, Math.min(...ys) - padding,
          Math.max(...xs) - Math.min(...xs) + padding * 2,
          Math.max(...ys) - Math.min(...ys) + padding * 2,
          stroke.rotation
        )
      }
    })

    layer.highlighterStrokes?.forEach(stroke => {
      if (stroke.points && stroke.points.length > 0) {
        const padding = (stroke.size || 20) / 2
        const xs = stroke.points.map(p => p.x)
        const ys = stroke.points.map(p => p.y)
        addRect(
          Math.min(...xs) - padding, Math.min(...ys) - padding,
          Math.max(...xs) - Math.min(...xs) + padding * 2,
          Math.max(...ys) - Math.min(...ys) + padding * 2,
          stroke.rotation
        )
      }
    })

    layer.arrows?.forEach(arrow => {
      if (arrow.fromX !== undefined && arrow.toX !== undefined) {
        const padding = (arrow.size || 2) / 2
        addRect(
          Math.min(arrow.fromX, arrow.toX) - padding, Math.min(arrow.fromY, arrow.toY) - padding,
          Math.abs(arrow.toX - arrow.fromX) + padding * 2, Math.abs(arrow.toY - arrow.fromY) + padding * 2,
          arrow.rotation
        )
      }
    })

    layer.lines?.forEach(line => {
      if (line.fromX !== undefined && line.toX !== undefined) {
        const padding = (line.size || 2) / 2
        addRect(
          Math.min(line.fromX, line.toX) - padding, Math.min(line.fromY, line.toY) - padding,
          Math.abs(line.toX - line.fromX) + padding * 2, Math.abs(line.toY - line.fromY) + padding * 2,
          line.rotation
        )
      }
    })

    layer.rects?.forEach(rect => {
      if (rect.width && rect.height) {
        const p = (rect.size || 2) / 2
        addRect(rect.x - p, rect.y - p, rect.width + p * 2, rect.height + p * 2, rect.rotation)
      }
    })

    layer.ellipses?.forEach(ellipse => {
      if (ellipse.width && ellipse.height) {
        const p = (ellipse.size || 2) / 2
        addRect(ellipse.x - p, ellipse.y - p, ellipse.width + p * 2, ellipse.height + p * 2, ellipse.rotation)
      }
    })

    layer.texts?.forEach(text => {
      const textWidth = text.content.length * text.fontSize * 0.6
      addRect(text.x, text.y - text.fontSize, textWidth, text.fontSize, text.rotation)
    })

    layer.connectors?.forEach(c => {
      if (c.fromX == null) return
      const allX = [c.fromX, c.toX, ...(c.waypoints || []).map(wp => wp.x)]
      const allY = [c.fromY, c.toY, ...(c.waypoints || []).map(wp => wp.y)]
      addRect(Math.min(...allX), Math.min(...allY),
        Math.max(...allX) - Math.min(...allX), Math.max(...allY) - Math.min(...allY))
    })

    layer.stamps?.forEach(stamp => {
      addRect(stamp.x, stamp.y, stamp.width, stamp.height, stamp.rotation)
    })
  })

  if (!b.hasContent) {
    return null
  }

  // Add padding around content (allow negative coordinates)
  const padding = 20
  return {
    x: b.minX - padding,
    y: b.minY - padding,
    width: b.maxX - b.minX + padding * 2,
    height: b.maxY - b.minY + padding * 2
  }
}

/**
 * Create a cropped canvas with only the content area
 * @param {Object} layerManager - The layer manager instance
 * @param {Object} shapeRenderer - The shape renderer instance
 * @returns {HTMLCanvasElement} Canvas element containing only content
 */
export const createCroppedCanvas = (layerManager, shapeRenderer) => {
  const bounds = getContentBounds(layerManager)

  if (!bounds) {
    // If no content, return a small 1x1 canvas
    const emptyCanvas = document.createElement('canvas')
    emptyCanvas.width = 1
    emptyCanvas.height = 1
    return emptyCanvas
  }

  // Create a temporary canvas with the content bounds size
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = bounds.width
  tempCanvas.height = bounds.height
  const tempCtx = tempCanvas.getContext('2d')

  // Fill with white background
  tempCtx.fillStyle = 'white'
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // Translate context to account for cropping
  tempCtx.translate(-bounds.x, -bounds.y)

  // Render all visible layers to the temp canvas
  const allLayers = layerManager.getAllLayers()
  allLayers.forEach((layer) => {
    if (!layer.visible) return

    tempCtx.globalAlpha = layer.opacity

    // Draw all shapes using ShapeRenderer, sorted by z-order
    if (shapeRenderer) {
      if (layer.image) {
        shapeRenderer.renderShape(tempCtx, 'image', layer.image)
      }
      const allShapes = sortByZOrder(collectLayerShapes(layer))
      for (const entry of allShapes) {
        shapeRenderer.renderShape(tempCtx, entry.type, entry.shape, entry.color)
      }
    }

    tempCtx.globalAlpha = 1
  })

  return tempCanvas
}
