/**
 * Canvas Event Service
 * Handles canvas event coordinate transformations and utility functions
 */

/**
 * Get canvas coordinates from a canvas event
 */
export const getCanvasCoordinatesFromEvent = (event, canvasRef, canvasManager) => {
  const rect = canvasRef.current.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  return canvasManager.screenToCanvas(screenX, screenY)
}

/**
 * Check if canvas has layers
 */
export const canvasHasLayers = (layers) => {
  return layers.length > 0
}
