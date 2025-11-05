/**
 * Shape clipboard utilities for copy/paste operations
 */

/**
 * Clipboard state manager - tracks paste count to enable incremental offsets
 */
class ClipboardStateManager {
  constructor() {
    this.pasteCount = 0
    this.lastClipboardContent = null
  }

  /**
   * Reset paste counter (called when new content is copied)
   */
  reset() {
    this.pasteCount = 0
    this.lastClipboardContent = null
  }

  /**
   * Check if clipboard content has changed
   */
  hasChanged(newContent) {
    return newContent !== this.lastClipboardContent
  }

  /**
   * Update clipboard content and reset counter if changed
   */
  updateContent(newContent) {
    if (this.hasChanged(newContent)) {
      this.reset()
      this.lastClipboardContent = newContent
    }
  }

  /**
   * Get and increment paste count
   */
  getAndIncrement() {
    return this.pasteCount++
  }
}

// Global clipboard state instance
export const clipboardStateManager = new ClipboardStateManager()

/**
 * Serialize selected shapes to JSON for clipboard storage
 */
export const serializeShapesToClipboard = (selectedShapes, layerManager) => {
  if (!selectedShapes || !layerManager) return null

  const shapes = Array.isArray(selectedShapes) ? selectedShapes : [selectedShapes]
  const serialized = []

  for (const shape of shapes) {
    const layer = layerManager.getLayer(shape.layerId)
    if (!layer) continue

    const { shapeType, shapeIndex } = shape
    const arrayName = getShapeArrayName(shapeType)

    let shapeData
    if (shapeType === 'image') {
      shapeData = { ...layer.image }
    } else if (arrayName && layer[arrayName]) {
      shapeData = { ...layer[arrayName][shapeIndex] }
    } else {
      continue
    }

    serialized.push({
      shapeType,
      shapeData,
      color: shapeData.color
    })
  }

  return JSON.stringify(serialized)
}

/**
 * Deserialize shapes from clipboard JSON
 */
export const deserializeShapesFromClipboard = (clipboardData) => {
  try {
    return JSON.parse(clipboardData)
  } catch (e) {
    return null
  }
}

/**
 * Get the array name for a shape type
 */
export const getShapeArrayName = (shapeType) => {
  const arrayMap = {
    'stroke': 'strokes',
    'arrow': 'arrows',
    'rect': 'rects',
    'ellipse': 'ellipses',
    'text': 'texts'
  }
  return arrayMap[shapeType] || null
}

/**
 * Calculate incremental offset for paste operations
 * Each paste gets progressively larger offset
 */
export const calculateIncrementalOffset = (baseOffset = 20) => {
  const pasteCount = clipboardStateManager.getAndIncrement()
  const multiplier = pasteCount + 1
  return {
    offsetX: baseOffset * multiplier,
    offsetY: baseOffset * multiplier
  }
}

/**
 * Paste shapes into a layer with offset
 */
export const pasteShapesIntoLayer = (layer, shapes, offsetX = 20, offsetY = 20, layerManager = null) => {
  if (!layer || !shapes) return []

  const pastedShapeRefs = []

  for (const item of shapes) {
    const { shapeType, shapeData } = item
    const arrayName = getShapeArrayName(shapeType)

    if (shapeType === 'image') {
      // If the layer already has an image, create a new layer for this image
      if (layer.image && layerManager) {
        const newLayer = layerManager.createLayer(`Image ${new Date().getTime()}`, {
          image: {
            data: shapeData.data,
            x: (shapeData.x || 0) + offsetX,
            y: (shapeData.y || 0) + offsetY,
            width: shapeData.width,
            height: shapeData.height
          }
        })
        pastedShapeRefs.push({
          layerId: newLayer.id,
          shapeType: 'image',
          shapeIndex: 0
        })
      } else {
        // If no existing image or no layer manager, paste into current layer
        const newImage = {
          ...shapeData,
          x: (shapeData.x || 0) + offsetX,
          y: (shapeData.y || 0) + offsetY
        }
        layer.image = newImage
        pastedShapeRefs.push({
          layerId: layer.id,
          shapeType: 'image',
          shapeIndex: 0
        })
      }
    } else if (arrayName && layer[arrayName]) {
      // Clone shape with offset
      const newShape = JSON.parse(JSON.stringify(shapeData))

      if (shapeType === 'stroke') {
        // Offset all points in stroke
        newShape.points = newShape.points.map(p => ({
          x: p.x + offsetX,
          y: p.y + offsetY
        }))
      } else if (shapeType === 'arrow') {
        // Offset arrow endpoints
        newShape.x1 = (newShape.x1 || 0) + offsetX
        newShape.y1 = (newShape.y1 || 0) + offsetY
        newShape.x2 = (newShape.x2 || 0) + offsetX
        newShape.y2 = (newShape.y2 || 0) + offsetY
        // Handle alternative property names
        if (newShape.fromX !== undefined) {
          newShape.fromX += offsetX
          newShape.fromY += offsetY
          newShape.toX += offsetX
          newShape.toY += offsetY
        }
      } else if (shapeType === 'rect' || shapeType === 'ellipse') {
        // Offset position
        newShape.x = (newShape.x || 0) + offsetX
        newShape.y = (newShape.y || 0) + offsetY
      } else if (shapeType === 'text') {
        // Offset position
        newShape.x = (newShape.x || 0) + offsetX
        newShape.y = (newShape.y || 0) + offsetY
      }

      if (!layer[arrayName]) {
        layer[arrayName] = []
      }
      const index = layer[arrayName].length
      layer[arrayName].push(newShape)

      pastedShapeRefs.push({
        layerId: layer.id,
        shapeType,
        shapeIndex: index
      })
    }
  }

  return pastedShapeRefs
}
