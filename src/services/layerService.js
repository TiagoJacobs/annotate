/**
 * Layer Service
 * Handles all layer-related business logic
 */

/**
 * Get color from a layer
 */
export const getLayerColor = (layer) => {
  return layer?.color || '#000000'
}

/**
 * Update color for a layer
 */
export const updateLayerColor = (layer, newColor) => {
  if (!layer) return null

  layer.color = newColor
  return { color: newColor }
}

/**
 * Get preview text for text layers
 */
export const getLayerPreviewText = (layer) => {
  if (layer.texts?.length > 0) {
    const text = layer.texts[0].content
    const maxLength = 30
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
  return null
}

/**
 * Get layer type description based on content
 */
export const getLayerTypeDescription = (layer) => {
  const types = []
  if (layer.strokes?.length > 0) types.push('strokes')
  if (layer.arrows?.length > 0) types.push('arrows')
  if (layer.rects?.length > 0) types.push('rectangles')
  if (layer.ellipses?.length > 0) types.push('ellipses')
  if (layer.texts?.length > 0) types.push('text')
  if (layer.image) types.push('image')

  return types.length > 0 ? types.join(', ') : 'empty'
}
