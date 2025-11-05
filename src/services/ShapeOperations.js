/**
 * Shape Operations Service
 * Consolidates all shape-related operations (hit detection, bounds, movement, resize)
 */

import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'
import { LINE_HIT_THRESHOLD, TEXT_WIDTH_FACTOR } from '../config/uiConstants'

export class ShapeOperations {
  /**
   * Hit Detection
   */

  static isPointNearLine(px, py, x1, y1, x2, y2, threshold = LINE_HIT_THRESHOLD) {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = px - xx
    const dy = py - yy
    return Math.sqrt(dx * dx + dy * dy) < threshold
  }

  static isPointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height
  }

  static isPointInEllipse(px, py, ellipse) {
    const cx = ellipse.x + ellipse.width / 2
    const cy = ellipse.y + ellipse.height / 2
    const rx = ellipse.width / 2
    const ry = ellipse.height / 2

    const normalized = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2)
    return normalized <= 1
  }

  static isPointNearEllipse(px, py, ellipse, threshold = LINE_HIT_THRESHOLD) {
    const cx = ellipse.x + ellipse.width / 2
    const cy = ellipse.y + ellipse.height / 2
    const rx = ellipse.width / 2
    const ry = ellipse.height / 2

    // Calculate the ellipse equation value at the point
    const normalized = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2)

    // Check if point is reasonably close to the ellipse
    // Points should be detected if they're roughly within threshold of the edge
    // For a point at normalized value of 1, it's on the ellipse
    // We want to detect points from approximately (1 - margin) to (1 + margin)
    const marginRatio = threshold / Math.min(rx, ry)
    const lowerBound = Math.max(0.5, 1 - marginRatio)
    const upperBound = 1 + marginRatio

    return normalized >= lowerBound && normalized <= upperBound
  }

  static isPointNearRect(px, py, rect, threshold = LINE_HIT_THRESHOLD) {
    const left = rect.x
    const right = rect.x + rect.width
    const top = rect.y
    const bottom = rect.y + rect.height

    // Expand the rect bounds by the threshold to detect strokes outside the shape
    const expandedLeft = left - threshold
    const expandedRight = right + threshold
    const expandedTop = top - threshold
    const expandedBottom = bottom + threshold

    // Check if point is within expanded bounds
    if (px < expandedLeft || px > expandedRight || py < expandedTop || py > expandedBottom) {
      return false
    }

    // Calculate distance to the nearest edge of the rect
    let distToEdge = Infinity

    if (px >= left && px <= right) {
      // Inside or aligned horizontally
      distToEdge = Math.min(Math.abs(py - top), Math.abs(py - bottom))
    } else if (py >= top && py <= bottom) {
      // Inside or aligned vertically
      distToEdge = Math.min(Math.abs(px - left), Math.abs(px - right))
    } else {
      // At a corner - calculate distance to nearest corner
      const cornerDistances = [
        Math.hypot(px - left, py - top),    // top-left
        Math.hypot(px - right, py - top),   // top-right
        Math.hypot(px - left, py - bottom), // bottom-left
        Math.hypot(px - right, py - bottom) // bottom-right
      ]
      distToEdge = Math.min(...cornerDistances)
    }

    return distToEdge <= threshold
  }

  static isPointOnStroke(px, py, stroke, threshold = LINE_HIT_THRESHOLD) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i]
      const p2 = stroke.points[i + 1]
      if (this.isPointNearLine(px, py, p1.x, p1.y, p2.x, p2.y, threshold)) {
        return true
      }
    }
    return false
  }

  static isPointOnText(px, py, text) {
    const textWidth = text.content.length * text.fontSize * TEXT_WIDTH_FACTOR
    const textHeight = text.fontSize
    return px >= text.x && px <= text.x + textWidth &&
           py >= text.y - textHeight && py <= text.y
  }

  /**
   * Bounds Calculation
   */

  static getBoundsFromPoints(points) {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  static getShapeBounds(layer, shapeType, shapeIndex) {
    const boundsGetters = {
      stroke: () => this.getBoundsFromPoints(layer.strokes[shapeIndex].points),
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        return this.getBoundsFromPoints([
          { x: arrow.fromX, y: arrow.fromY },
          { x: arrow.toX, y: arrow.toY }
        ])
      },
      rect: () => {
        const rect = { ...layer.rects[shapeIndex] }
        // Normalize bounds to ensure width/height are always positive
        if (rect.width < 0) {
          rect.x += rect.width
          rect.width = -rect.width
        }
        if (rect.height < 0) {
          rect.y += rect.height
          rect.height = -rect.height
        }
        return rect
      },
      ellipse: () => {
        const ellipse = { ...layer.ellipses[shapeIndex] }
        // Normalize bounds to ensure width/height are always positive
        if (ellipse.width < 0) {
          ellipse.x += ellipse.width
          ellipse.width = -ellipse.width
        }
        if (ellipse.height < 0) {
          ellipse.y += ellipse.height
          ellipse.height = -ellipse.height
        }
        return ellipse
      },
      text: () => {
        const text = layer.texts[shapeIndex]
        const textWidth = text.content.length * text.fontSize * TEXT_WIDTH_FACTOR
        const textHeight = text.fontSize
        // For text, use the actual text position as the bounds
        // text.y represents the bottom of the text baseline
        // So the top of the bounding box is at text.y - fontSize
        return { x: text.x, y: text.y - textHeight, width: textWidth, height: textHeight }
      },
      image: () => {
        // Get actual image dimensions from layer.image
        if (layer.image) {
          if (typeof layer.image === 'object') {
            return {
              x: layer.image.x || 0,
              y: layer.image.y || 0,
              width: layer.image.width || 800,
              height: layer.image.height || 600
            }
          }
          // Old format fallback (string)
          return { x: 0, y: 0, width: 800, height: 600 }
        }
        return { x: 0, y: 0, width: 0, height: 0 }
      }
    }

    return boundsGetters[shapeType]?.() || { x: 0, y: 0, width: 0, height: 0 }
  }

  static boundsIntersect(bounds1, bounds2) {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    )
  }

  static getMultiShapeBounds(shapes, layerManager) {
    if (!shapes || shapes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const shape of shapes) {
      const layer = layerManager.getLayer(shape.layerId)
      if (!layer) continue

      const bounds = this.getShapeBounds(layer, shape.shapeType, shape.shapeIndex)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Shape Movement
   */

  static moveShape(layer, shapeType, shapeIndex, dx, dy) {
    const moveHandlers = {
      stroke: () => {
        layer.strokes[shapeIndex].points = layer.strokes[shapeIndex].points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }))
      },
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        arrow.fromX += dx
        arrow.fromY += dy
        arrow.toX += dx
        arrow.toY += dy
      },
      rect: () => {
        layer.rects[shapeIndex].x += dx
        layer.rects[shapeIndex].y += dy
      },
      ellipse: () => {
        layer.ellipses[shapeIndex].x += dx
        layer.ellipses[shapeIndex].y += dy
      },
      text: () => {
        layer.texts[shapeIndex].x += dx
        layer.texts[shapeIndex].y += dy
      },
      image: () => {
        // Images are stored as layer.image (not in an array)
        if (layer.image) {
          // Handle both old format (string) and new format (object)
          if (typeof layer.image === 'object') {
            layer.image.x = (layer.image.x || 0) + dx
            layer.image.y = (layer.image.y || 0) + dy
          }
        }
      }
    }

    moveHandlers[shapeType]?.()
  }

  /**
   * Shape Resize
   */

  static calculateNewBounds(handle, startBounds, dx, dy, preserveAspectRatio = false) {
    let newX = startBounds.x
    let newY = startBounds.y
    let newWidth = startBounds.width
    let newHeight = startBounds.height

    if (handle.includes('w')) {
      newX = startBounds.x + dx
      newWidth = startBounds.width - dx
    } else if (handle.includes('e')) {
      newWidth = startBounds.width + dx
    }

    if (handle.includes('n')) {
      newY = startBounds.y + dy
      newHeight = startBounds.height - dy
    } else if (handle.includes('s')) {
      newHeight = startBounds.height + dy
    }

    // Preserve aspect ratio if shift is held
    if (preserveAspectRatio && startBounds.width > 0 && startBounds.height > 0) {
      const aspectRatio = startBounds.width / startBounds.height

      // Determine which dimension changed more significantly
      const widthRatio = newWidth / startBounds.width
      const heightRatio = newHeight / startBounds.height

      // Use the dimension with the smallest change to maintain aspect ratio
      if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
        // Height changed more, adjust width
        newWidth = newHeight * aspectRatio
      } else {
        // Width changed more, adjust height
        newHeight = newWidth / aspectRatio
      }

      // For corner handles, adjust position if resizing from top/left
      if (handle.includes('w')) {
        newX = startBounds.x + startBounds.width - newWidth
      }
      if (handle.includes('n')) {
        newY = startBounds.y + startBounds.height - newHeight
      }
    }

    return { newX, newY, newWidth, newHeight }
  }

  static resizeShape(layer, shapeType, shapeIndex, handle, startBounds, dx, dy, preserveAspectRatio = false) {
    const { newX, newY, newWidth, newHeight } = this.calculateNewBounds(handle, startBounds, dx, dy, preserveAspectRatio)

    const resizeHandlers = {
      rect: () => {
        const rect = layer.rects[shapeIndex]
        rect.x = newX
        rect.y = newY
        rect.width = newWidth
        rect.height = newHeight
      },
      ellipse: () => {
        const ellipse = layer.ellipses[shapeIndex]
        ellipse.x = newX
        ellipse.y = newY
        ellipse.width = newWidth
        ellipse.height = newHeight
      },
      arrow: () => {
        const arrow = layer.arrows[shapeIndex]
        if (handle.includes('w')) arrow.fromX = newX
        else if (handle.includes('e')) arrow.toX = newX + newWidth

        if (handle.includes('n')) arrow.fromY = newY
        else if (handle.includes('s')) arrow.toY = newY + newHeight
      },
      image: () => {
        // Images are stored as layer.image (not in an array)
        if (layer.image && typeof layer.image === 'object') {
          layer.image.x = newX
          layer.image.y = newY
          layer.image.width = newWidth
          layer.image.height = newHeight
        }
      },
      text: () => {
        const text = layer.texts[shapeIndex]
        // For text, adjust font size and position if needed
        // text.y represents the baseline (bottom) of the text
        // startBounds.y represents the TOP of the bounding box

        // Original height equals original font size
        const originalFontSize = startBounds.height
        const heightRatio = newHeight / startBounds.height

        // Calculate new font size, minimum 8px
        const newFontSize = Math.max(8, Math.round(originalFontSize * heightRatio))
        text.fontSize = newFontSize

        // Adjust text position based on which edge is being resized
        // If resizing from top (north), keep the bottom position fixed
        // If resizing from bottom, keep the top position fixed
        if (handle.includes('n')) {
          // When dragging top edge, keep the bottom position fixed
          // New baseline = old bottom = startBounds.y + startBounds.height
          text.y = startBounds.y + startBounds.height
        } else {
          // When dragging bottom edge, keep the top position fixed
          // Baseline = top + newFontSize
          text.y = startBounds.y + newFontSize
        }

        // Adjust horizontal position if resizing from left (west handle)
        if (handle.includes('w')) {
          text.x = newX
        }
      }
    }

    resizeHandlers[shapeType]?.()
  }

  /**
   * Resize multiple shapes as a group while maintaining relative positions
   */
  static resizeShapeGroup(shapes, layerManager, groupBounds, newGroupBounds, handle, preserveAspectRatio = false) {
    // Guard against zero-sized original bounds
    if (groupBounds.width === 0 || groupBounds.height === 0) return

    // Get ACTUAL current bounds to detect how much scaling has already been applied
    const currentGroupBounds = this.getMultiShapeBounds(shapes, layerManager)

    // Calculate how much scaling has already been applied from the original groupBounds
    // This is crucial: if groupBounds (passed in) doesn't match currentGroupBounds,
    // it means shapes have been scaled already and we need to reverse-calculate original
    let alreadyScaledX = 1
    let alreadyScaledY = 1

    if (Math.abs(groupBounds.width) > 0.01) {
      alreadyScaledX = currentGroupBounds.width / groupBounds.width
    }
    if (Math.abs(groupBounds.height) > 0.01) {
      alreadyScaledY = currentGroupBounds.height / groupBounds.height
    }

    // Store original shape data, but reverse-scale from current state if needed
    const originalShapeData = new Map()

    for (const shape of shapes) {
      const layer = layerManager.getLayer(shape.layerId)
      if (!layer) continue

      const { shapeType, shapeIndex } = shape
      const shapeArrayName = SHAPE_ARRAY_MAP[shapeType]

      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const shapeData = layer[shapeArrayName][shapeIndex]
      if (!shapeData) continue

      // Store deep copy of ORIGINAL shape data (reverse-scaled if needed)
      const key = `${shape.layerId}-${shapeType}-${shapeIndex}`

      if (shapeType === 'stroke') {
        const reversedPoints = shapeData.points.map(p => ({
          x: groupBounds.x + (p.x - currentGroupBounds.x) / alreadyScaledX,
          y: groupBounds.y + (p.y - currentGroupBounds.y) / alreadyScaledY
        }))
        originalShapeData.set(key, { ...shapeData, points: reversedPoints })
      } else if (shapeType === 'arrow') {
        originalShapeData.set(key, {
          ...shapeData,
          fromX: groupBounds.x + (shapeData.fromX - currentGroupBounds.x) / alreadyScaledX,
          fromY: groupBounds.y + (shapeData.fromY - currentGroupBounds.y) / alreadyScaledY,
          toX: groupBounds.x + (shapeData.toX - currentGroupBounds.x) / alreadyScaledX,
          toY: groupBounds.y + (shapeData.toY - currentGroupBounds.y) / alreadyScaledY
        })
      } else if (shapeType === 'text') {
        originalShapeData.set(key, {
          ...shapeData,
          x: groupBounds.x + (shapeData.x - currentGroupBounds.x) / alreadyScaledX,
          y: groupBounds.y + (shapeData.y - currentGroupBounds.y) / alreadyScaledY,
          fontSize: shapeData.fontSize / Math.abs(alreadyScaledY)
        })
      } else {
        // Rect, ellipse, etc.
        originalShapeData.set(key, {
          ...shapeData,
          x: groupBounds.x + (shapeData.x - currentGroupBounds.x) / alreadyScaledX,
          y: groupBounds.y + (shapeData.y - currentGroupBounds.y) / alreadyScaledY,
          width: shapeData.width / alreadyScaledX,
          height: shapeData.height / alreadyScaledY
        })
      }
    }

    // Calculate scale factors for width and height independently
    let scaleX = groupBounds.width !== 0 ? newGroupBounds.width / groupBounds.width : 1
    let scaleY = groupBounds.height !== 0 ? newGroupBounds.height / groupBounds.height : 1

    // Preserve aspect ratio if shift is held
    if (preserveAspectRatio) {
      const uniformScale = Math.min(Math.abs(scaleX), Math.abs(scaleY))
      scaleX = scaleX < 0 ? -uniformScale : uniformScale
      scaleY = scaleY < 0 ? -uniformScale : uniformScale
    }

    const updatedLayers = new Map()

    // Apply transformation to each shape
    for (const shape of shapes) {
      const layer = layerManager.getLayer(shape.layerId)
      if (!layer) continue

      const { shapeType, shapeIndex } = shape
      const shapeArrayName = SHAPE_ARRAY_MAP[shapeType]

      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const key = `${shape.layerId}-${shapeType}-${shapeIndex}`
      const originalData = originalShapeData.get(key)
      if (!originalData) continue

      const shapeData = layer[shapeArrayName][shapeIndex]

      // For each point/corner in the shape, apply the transformation:
      // 1. Get its position relative to the original group
      // 2. Scale the relative position
      // 3. Add to the new group position

      if (shapeType === 'arrow') {
        const relFromX = originalData.fromX - groupBounds.x
        const relFromY = originalData.fromY - groupBounds.y
        const relToX = originalData.toX - groupBounds.x
        const relToY = originalData.toY - groupBounds.y

        let fromX = newGroupBounds.x + relFromX * scaleX
        let fromY = newGroupBounds.y + relFromY * scaleY
        let toX = newGroupBounds.x + relToX * scaleX
        let toY = newGroupBounds.y + relToY * scaleY

        // Handle flipped arrows (negative scale)
        if (scaleX < 0) {
          [fromX, toX] = [toX, fromX]
        }
        if (scaleY < 0) {
          [fromY, toY] = [toY, fromY]
        }

        shapeData.fromX = fromX
        shapeData.fromY = fromY
        shapeData.toX = toX
        shapeData.toY = toY
      } else if (shapeType === 'text') {
        // For text in a group, scale both position and font size
        // text.y is the baseline (bottom), so we need to scale it relative to the group bounds
        const relX = originalData.x - groupBounds.x
        const relY = originalData.y - groupBounds.y

        // Apply the same transformation as other shapes
        shapeData.x = newGroupBounds.x + relX * scaleX
        shapeData.y = newGroupBounds.y + relY * scaleY

        if (originalData.fontSize) {
          // Use vertical scale factor for font size (height-based)
          const fontScale = Math.abs(scaleY)
          shapeData.fontSize = Math.max(8, Math.round(originalData.fontSize * fontScale))
        }
      } else if (shapeType === 'stroke') {
        shapeData.points = originalData.points.map(point => ({
          x: newGroupBounds.x + (point.x - groupBounds.x) * scaleX,
          y: newGroupBounds.y + (point.y - groupBounds.y) * scaleY
        }))
      } else {
        // Rect, ellipse, etc.
        const relX = originalData.x - groupBounds.x
        const relY = originalData.y - groupBounds.y

        let newX = newGroupBounds.x + relX * scaleX
        let newY = newGroupBounds.y + relY * scaleY
        let newWidth = originalData.width * scaleX
        let newHeight = originalData.height * scaleY

        // Normalize negative dimensions so they're always positive in storage
        if (newWidth < 0) {
          newX += newWidth
          newWidth = -newWidth
        }
        if (newHeight < 0) {
          newY += newHeight
          newHeight = -newHeight
        }

        shapeData.x = newX
        shapeData.y = newY
        shapeData.width = newWidth
        shapeData.height = newHeight
      }

      if (!updatedLayers.has(layer.id)) {
        updatedLayers.set(layer.id, layer)
      }
    }

    return updatedLayers
  }

  /**
   * Selection Helpers
   */

  static findShapesInRect(rect, layerManager) {
    const selectedShapes = []
    const layers = layerManager.getAllLayers()

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      if (!layer.visible) continue

      // Check image first
      if (layer.image) {
        const imageBounds = this.getShapeBounds(layer, 'image', 0)
        if (this.boundsIntersect(imageBounds, rect)) {
          selectedShapes.push({
            layerId: layer.id,
            shapeType: 'image',
            shapeIndex: 0
          })
        }
      }

      const shapeArrays = [
        { type: 'stroke', array: layer.strokes },
        { type: 'arrow', array: layer.arrows },
        { type: 'rect', array: layer.rects },
        { type: 'ellipse', array: layer.ellipses },
        { type: 'text', array: layer.texts }
      ]

      for (const { type, array } of shapeArrays) {
        for (let j = 0; j < array.length; j++) {
          const shapeBounds = this.getShapeBounds(layer, type, j)
          if (this.boundsIntersect(shapeBounds, rect)) {
            selectedShapes.push({
              layerId: layer.id,
              shapeType: type,
              shapeIndex: j
            })
          }
        }
      }
    }

    return selectedShapes
  }

  static checkLayerShapes(pos, layer) {
    const shapeChecks = [
      { type: 'text', array: layer.texts, test: (shape) => this.isPointOnText(pos.x, pos.y, shape) },
      { type: 'ellipse', array: layer.ellipses, test: (shape) => {
        // Check if point is inside the ellipse (fill) OR near the stroke
        const isInside = this.isPointInEllipse(pos.x, pos.y, shape)
        if (isInside) return true
        // Also check the stroke if not inside
        const threshold = (shape.size || 3) / 2
        return this.isPointNearEllipse(pos.x, pos.y, shape, threshold)
      }},
      { type: 'rect', array: layer.rects, test: (shape) => {
        // Check if point is inside the rect (fill) OR near the stroke
        const isInside = this.isPointInRect(pos.x, pos.y, shape)
        if (isInside) return true
        // Also check the stroke if not inside
        const threshold = (shape.size || 3) / 2
        return this.isPointNearRect(pos.x, pos.y, shape, threshold)
      }},
      { type: 'arrow', array: layer.arrows, test: (arrow) => {
        // Use arrow's size (line weight) for hit detection threshold
        const threshold = (arrow.size || 3) / 2
        return this.isPointNearLine(pos.x, pos.y, arrow.fromX, arrow.fromY, arrow.toX, arrow.toY, threshold)
      }},
      { type: 'stroke', array: layer.strokes, test: (shape) => {
        // Use stroke's size (line weight) for hit detection threshold
        const threshold = (shape.size || 3) / 2
        return this.isPointOnStroke(pos.x, pos.y, shape, threshold)
      }},
    ]

    for (const { type, array, test } of shapeChecks) {
      for (let j = array.length - 1; j >= 0; j--) {
        if (test(array[j])) {
          return { layerId: layer.id, shapeType: type, shapeIndex: j }
        }
      }
    }

    // Check image last (it's in the background)
    if (layer.image) {
      const imageBounds = this.getShapeBounds(layer, 'image', 0)
      if (this.isPointInRect(pos.x, pos.y, imageBounds)) {
        return { layerId: layer.id, shapeType: 'image', shapeIndex: 0 }
      }
    }

    return null
  }

  static findShapeAtPosition(pos, layerManager) {
    const layers = layerManager.getAllLayers()

    // Search from top layer to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      if (!layer.visible) continue

      const result = this.checkLayerShapes(pos, layer)
      if (result) return result
    }

    return null
  }
}
