/**
 * Canvas Export Utilities
 * Handles smart cropping and content bounds calculation for exports
 */

/**
 * Get the bounding box of all visible content on the canvas
 * @param {Object} layerManager - The layer manager instance
 * @returns {Object|null} Bounds object {x, y, width, height} or null if no content
 */
export const getContentBounds = (layerManager) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let hasContent = false

  const allLayers = layerManager.getAllLayers()

  allLayers.forEach((layer) => {
    if (!layer.visible) return

    // Check image bounds
    if (layer.image) {
      hasContent = true
      minX = Math.min(minX, layer.image.x)
      minY = Math.min(minY, layer.image.y)
      maxX = Math.max(maxX, layer.image.x + layer.image.width)
      maxY = Math.max(maxY, layer.image.y + layer.image.height)
    }

    // Check shape bounds
    layer.strokes?.forEach(stroke => {
      if (stroke.points && stroke.points.length > 0) {
        hasContent = true
        const padding = (stroke.size || 3) / 2
        stroke.points.forEach(point => {
          minX = Math.min(minX, point.x - padding)
          minY = Math.min(minY, point.y - padding)
          maxX = Math.max(maxX, point.x + padding)
          maxY = Math.max(maxY, point.y + padding)
        })
      }
    })

    layer.arrows?.forEach(arrow => {
      if (arrow.x1 !== undefined && arrow.x2 !== undefined) {
        hasContent = true
        const padding = (arrow.size || 2) / 2
        minX = Math.min(minX, Math.min(arrow.x1, arrow.x2) - padding)
        minY = Math.min(minY, Math.min(arrow.y1, arrow.y2) - padding)
        maxX = Math.max(maxX, Math.max(arrow.x1, arrow.x2) + padding)
        maxY = Math.max(maxY, Math.max(arrow.y1, arrow.y2) + padding)
      }
    })

    layer.rects?.forEach(rect => {
      if (rect.width && rect.height) {
        hasContent = true
        const padding = (rect.size || 2) / 2
        minX = Math.min(minX, rect.x - padding)
        minY = Math.min(minY, rect.y - padding)
        maxX = Math.max(maxX, rect.x + rect.width + padding)
        maxY = Math.max(maxY, rect.y + rect.height + padding)
      }
    })

    layer.ellipses?.forEach(ellipse => {
      if (ellipse.width && ellipse.height) {
        hasContent = true
        const padding = (ellipse.size || 2) / 2
        minX = Math.min(minX, ellipse.x - padding)
        minY = Math.min(minY, ellipse.y - padding)
        maxX = Math.max(maxX, ellipse.x + ellipse.width + padding)
        maxY = Math.max(maxY, ellipse.y + ellipse.height + padding)
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
    return null
  }

  // Add padding around content (allow negative coordinates)
  const padding = 20
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
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

    // Draw all shapes using ShapeRenderer
    if (shapeRenderer) {
      if (layer.image) {
        shapeRenderer.renderShape(tempCtx, 'image', layer.image)
      }
      layer.strokes?.forEach(stroke => shapeRenderer.renderShape(tempCtx, 'stroke', stroke, stroke.color || '#000000'))
      layer.arrows?.forEach(arrow => shapeRenderer.renderShape(tempCtx, 'arrow', arrow, arrow.color || '#000000'))
      layer.rects?.forEach(rect => shapeRenderer.renderShape(tempCtx, 'rect', rect, rect.color || '#000000'))
      layer.ellipses?.forEach(ellipse => shapeRenderer.renderShape(tempCtx, 'ellipse', ellipse, ellipse.color || '#000000'))
      layer.texts?.forEach(text => shapeRenderer.renderShape(tempCtx, 'text', text, text.color || '#000000'))
    }

    tempCtx.globalAlpha = 1
  })

  return tempCanvas
}
