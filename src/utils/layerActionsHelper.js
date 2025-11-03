/**
 * Layer Actions Helper
 * Utility functions for layer operations
 */

/**
 * Check if a layer can move up
 */
export const canMoveUp = (actualIndex) => {
  return actualIndex > 0
}

/**
 * Check if a layer can move down
 */
export const canMoveDown = (actualIndex, totalLayers) => {
  return actualIndex < totalLayers - 1
}

/**
 * Get layer action handlers
 */
export const createLayerActionHandlers = (layerManagerRef, layerId, callbacks) => ({
  toggleVisibility: () => {
    layerManagerRef.current.toggleVisibility(layerId)
    callbacks.onLayerUpdated()
  },

  moveUp: () => {
    layerManagerRef.current.moveLayer(layerId, 'up')
    callbacks.onLayerUpdated()
  },

  moveDown: () => {
    layerManagerRef.current.moveLayer(layerId, 'down')
    callbacks.onLayerUpdated()
  },

  delete: () => {
    layerManagerRef.current.deleteLayer(layerId)
    callbacks.onLayerUpdated()
    callbacks.onLayerDeleted(layerManagerRef.current.selectedId)
  },
})
