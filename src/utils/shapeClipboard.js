/**
 * Shape clipboard utilities for copy/paste operations
 */

import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'

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

  /**
   * Decrement paste count (called on undo after a paste)
   */
  decrementIfPositive() {
    if (this.pasteCount > 0) {
      this.pasteCount--
    }
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
      color: shapeData.color,
      originalRef: { layerId: shape.layerId, shapeType, shapeIndex }
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
  } catch {
    return null
  }
}

/**
 * Get the array name for a shape type
 */
export const getShapeArrayName = (shapeType) => {
  return SHAPE_ARRAY_MAP[shapeType] || null
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
  // Map from "layerId:shapeType:shapeIndex" of original to pasted ref
  const refMap = new Map()

  for (const item of shapes) {
    const { shapeType, shapeData, originalRef } = item
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
        // Offset arrow endpoints (arrows use fromX/fromY/toX/toY)
        newShape.fromX = (newShape.fromX || 0) + offsetX
        newShape.fromY = (newShape.fromY || 0) + offsetY
        newShape.toX = (newShape.toX || 0) + offsetX
        newShape.toY = (newShape.toY || 0) + offsetY
      } else if (shapeType === 'rect' || shapeType === 'ellipse') {
        // Offset position
        newShape.x = (newShape.x || 0) + offsetX
        newShape.y = (newShape.y || 0) + offsetY
      } else if (shapeType === 'connector') {
        // Offset connector endpoints (same coordinate scheme as arrows)
        newShape.fromX = (newShape.fromX || 0) + offsetX
        newShape.fromY = (newShape.fromY || 0) + offsetY
        newShape.toX = (newShape.toX || 0) + offsetX
        newShape.toY = (newShape.toY || 0) + offsetY
      } else if (shapeType === 'text' || shapeType === 'stamp') {
        // Offset position
        newShape.x = (newShape.x || 0) + offsetX
        newShape.y = (newShape.y || 0) + offsetY
      }

      if (!layer[arrayName]) {
        layer[arrayName] = []
      }
      const index = layer[arrayName].length
      layer[arrayName].push(newShape)

      const pastedRef = {
        layerId: layer.id,
        shapeType,
        shapeIndex: index
      }
      pastedShapeRefs.push(pastedRef)

      // Record mapping from original ref to pasted ref for connector remapping
      if (originalRef) {
        const key = `${originalRef.layerId}:${originalRef.shapeType}:${originalRef.shapeIndex}`
        refMap.set(key, pastedRef)
      }
    }
  }

  // Remap connector references to point to pasted shapes instead of originals
  const connectorArrayName = getShapeArrayName('connector')
  for (const pastedRef of pastedShapeRefs) {
    if (pastedRef.shapeType !== 'connector') continue
    const connector = layer[connectorArrayName]?.[pastedRef.shapeIndex]
    if (!connector) continue

    for (const endpoint of ['fromRef', 'toRef']) {
      const ref = connector[endpoint]
      if (!ref) continue
      const key = `${ref.layerId}:${ref.shapeType}:${ref.shapeIndex}`
      const mapped = refMap.get(key)
      if (mapped) {
        connector[endpoint] = { layerId: mapped.layerId, shapeType: mapped.shapeType, shapeIndex: mapped.shapeIndex }
      } else {
        // Referenced shape wasn't part of the paste — clear dangling ref
        connector[endpoint] = null
      }
    }
  }

  return pastedShapeRefs
}
