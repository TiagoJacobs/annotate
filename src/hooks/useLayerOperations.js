/**
 * Custom hook for layer operations
 * Handles layer management and manipulation
 */

import { useCallback } from 'react'
import { SHAPE_ARRAY_MAP } from '../config/shapeConfig'

export const useLayerOperations = ({
  layerManagerRef,
  selectedLayerId,
  setSelectedLayerId,
  updateLayersState
}) => {
  /**
   * Get color from a layer
   */
  const getLayerColor = useCallback((layer) => {
    return layer?.color || '#000000'
  }, [])

  /**
   * Update color for a layer
   */
  const updateLayerColor = useCallback((layerId, newColor) => {
    const layer = layerManagerRef.current?.getLayer(layerId)
    if (!layer) return

    layer.color = newColor
    layerManagerRef.current?.updateLayer(layerId, { color: newColor })
    updateLayersState()
  }, [layerManagerRef, updateLayersState])

  /**
   * Get preview text for text layers
   */
  const getLayerPreviewText = useCallback((layer, maxLength = 30) => {
    if (!layer.texts?.length) return null

    const text = layer.texts[0].content
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }, [])

  /**
   * Select a layer
   */
  const selectLayer = useCallback((layerId) => {
    if (selectedLayerId === layerId) {
      layerManagerRef.current?.selectLayer(null)
      setSelectedLayerId(null)
    } else {
      layerManagerRef.current?.selectLayer(layerId)
      setSelectedLayerId(layerId)
    }
  }, [selectedLayerId, layerManagerRef, setSelectedLayerId])

  /**
   * Delete selected layer
   */
  const deleteSelectedLayer = useCallback(() => {
    if (!selectedLayerId) return

    layerManagerRef.current?.deleteLayer(selectedLayerId)
    updateLayersState()
    setSelectedLayerId(layerManagerRef.current?.selectedId || null)
  }, [selectedLayerId, layerManagerRef, updateLayersState, setSelectedLayerId])

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = useCallback((layerId) => {
    layerManagerRef.current?.toggleVisibility(layerId)
    updateLayersState()
  }, [layerManagerRef, updateLayersState])

  /**
   * Move layer in stack
   */
  const moveLayerInStack = useCallback((layerId, direction) => {
    layerManagerRef.current?.moveLayer(layerId, direction)
    updateLayersState()
  }, [layerManagerRef, updateLayersState])

  /**
   * Remove shape from layer
   */
  const removeShapeFromLayer = useCallback((layer, shapeType, shapeIndex) => {
    const arrayName = SHAPE_ARRAY_MAP[shapeType]
    if (!arrayName || !layer[arrayName]) return

    layer[arrayName].splice(shapeIndex, 1)
  }, [])

  /**
   * Clear all layers
   */
  const clearCanvas = useCallback(() => {
    layerManagerRef.current?.clear()
    updateLayersState()
    setSelectedLayerId(null)
  }, [layerManagerRef, updateLayersState, setSelectedLayerId])

  return {
    getLayerColor,
    updateLayerColor,
    getLayerPreviewText,
    selectLayer,
    deleteSelectedLayer,
    toggleLayerVisibility,
    moveLayerInStack,
    removeShapeFromLayer,
    clearCanvas
  }
}
