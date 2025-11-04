/**
 * Custom hook for shape operations
 * Handles shape selection, deletion, and manipulation
 */

import { useCallback } from 'react'

export const useShapeOperations = ({
  selectedShape,
  setSelectedShape,
  selectedShapeRef,
  toolHandlerRef,
  layerManagerRef,
  updateLayersState,
  removeShapeFromLayer
}) => {
  /**
   * Delete selected shape
   */
  const deleteSelectedShape = useCallback(() => {
    if (!selectedShape) return

    const layer = layerManagerRef.current?.getLayer(selectedShape.layerId)
    if (!layer) return

    removeShapeFromLayer(layer, selectedShape.shapeType, selectedShape.shapeIndex)
    layerManagerRef.current?.updateLayer(layer.id, layer)

    setSelectedShape(null)
    selectedShapeRef.current = null
    toolHandlerRef.current?.clearSelection()
    updateLayersState()
  }, [selectedShape, layerManagerRef, removeShapeFromLayer, setSelectedShape, selectedShapeRef, toolHandlerRef, updateLayersState])

  /**
   * Clear shape selection
   */
  const clearSelection = useCallback(() => {
    setSelectedShape(null)
    selectedShapeRef.current = null
    toolHandlerRef.current?.clearSelection()
  }, [setSelectedShape, selectedShapeRef, toolHandlerRef])

  /**
   * Select shape
   */
  const selectShape = useCallback((shape) => {
    setSelectedShape(shape)
    selectedShapeRef.current = shape
  }, [setSelectedShape, selectedShapeRef])

  return {
    deleteSelectedShape,
    clearSelection,
    selectShape
  }
}
