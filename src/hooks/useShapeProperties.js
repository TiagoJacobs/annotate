/**
 * Custom hook for managing selected shape properties
 * Consolidates color, size, and line style management for selected shapes
 * Reduces code duplication from App.jsx
 */

import { useCallback } from 'react'
import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'
import { DEFAULT_COLOR, DEFAULT_BRUSH_SIZE, DEFAULT_FONT_SIZE } from '../config/uiConstants'

export const useShapeProperties = ({
  selectedShape,
  layerManagerRef
}) => {
  const getShapeArrayName = (shapeType) => SHAPE_ARRAY_MAP[shapeType]

  /**
   * Get the shape data object
   */
  const getShapeData = useCallback((shape) => {
    if (!shape) return null
    const layer = layerManagerRef.current?.getLayer(shape.layerId)
    if (!layer) return null

    const shapeArrayName = getShapeArrayName(shape.shapeType)
    if (!shapeArrayName || !layer[shapeArrayName]) return null

    return layer[shapeArrayName][shape.shapeIndex]
  }, [getShapeArrayName])

  /**
   * Get color from selected shape(s)
   */
  const getColor = useCallback(() => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape
    const shapeData = getShapeData(shape)
    return shapeData?.color || DEFAULT_COLOR
  }, [selectedShape, getShapeData])

  /**
   * Get size/fontSize from selected shape(s)
   */
  const getSize = useCallback(() => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape
    const shapeData = getShapeData(shape)
    if (!shapeData) return null

    if (shape.shapeType === 'text') {
      return { type: 'fontSize', value: shapeData.fontSize || DEFAULT_FONT_SIZE }
    } else {
      return { type: 'size', value: shapeData.size || DEFAULT_BRUSH_SIZE }
    }
  }, [selectedShape, getShapeData])

  /**
   * Get fillColor from selected shape
   */
  const getFillColor = useCallback(() => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape
    if (shape.shapeType !== 'rect' && shape.shapeType !== 'ellipse') return null

    const shapeData = getShapeData(shape)
    return shapeData?.fillColor || ''
  }, [selectedShape, getShapeData])

  /**
   * Get lineStyle from selected shape
   */
  const getLineStyle = useCallback(() => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape

    // Text shapes don't support lineStyle
    if (shape.shapeType === 'text') return null

    const shapeData = getShapeData(shape)
    return shapeData?.lineStyle || 'solid'
  }, [selectedShape, getShapeData])

  /**
   * Update property for selected shape(s) - generalized function
   */
  const updateProperty = useCallback((propertyUpdater) => {
    if (!selectedShape) return

    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    const updatedLayers = new Set()

    for (const shape of shapes) {
      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (!layer) continue

      const shapeArrayName = getShapeArrayName(shape.shapeType)
      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const shapeData = layer[shapeArrayName][shape.shapeIndex]
      if (!shapeData) continue

      propertyUpdater(shapeData, shape.shapeType)
      updatedLayers.add(layer.id)
    }

    return updatedLayers
  }, [selectedShape, getShapeArrayName])

  /**
   * Update color for selected shape(s)
   */
  const updateColor = useCallback((newColor) => {
    const updatedLayers = updateProperty((shapeData) => {
      shapeData.color = newColor
    })
    return updatedLayers
  }, [updateProperty])

  /**
   * Update size/fontSize for selected shape(s)
   */
  const updateSize = useCallback((newSize) => {
    const updatedLayers = updateProperty((shapeData, shapeType) => {
      if (shapeType === 'text') {
        shapeData.fontSize = newSize
      } else {
        shapeData.size = newSize
      }
    })
    return updatedLayers
  }, [updateProperty])

  /**
   * Update fillColor for selected shape(s)
   */
  const updateFillColor = useCallback((newFillColor) => {
    const updatedLayers = updateProperty((shapeData, shapeType) => {
      if (shapeType === 'rect' || shapeType === 'ellipse') {
        shapeData.fillColor = newFillColor
      }
    })
    return updatedLayers
  }, [updateProperty])

  /**
   * Update lineStyle for selected shape(s)
   */
  const updateLineStyle = useCallback((newLineStyle) => {
    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    const updatedLayers = new Set()

    for (const shape of shapes) {
      // Skip text shapes
      if (shape.shapeType === 'text') continue

      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (!layer) continue

      const shapeArrayName = getShapeArrayName(shape.shapeType)
      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const shapeData = layer[shapeArrayName][shape.shapeIndex]
      if (shapeData) {
        shapeData.lineStyle = newLineStyle
        updatedLayers.add(layer.id)
      }
    }

    return updatedLayers
  }, [selectedShape, getShapeArrayName])

  return {
    getColor,
    getSize,
    getFillColor,
    getLineStyle,
    updateColor,
    updateSize,
    updateFillColor,
    updateLineStyle,
    getShapeData
  }
}
