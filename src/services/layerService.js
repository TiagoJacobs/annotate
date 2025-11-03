/**
 * Layer Service
 * Handles all layer-related business logic
 */

/**
 * Get color from a layer based on its type
 */
export const getLayerColor = (layer) => {
  if (!layer) return '#000000'

  const colorAccessors = {
    text: () => layer.texts?.[0]?.color,
    image: () => '#808080',
    pen: () => layer.strokes?.[0]?.color,
    arrow: () => layer.arrows?.[0]?.color,
    rect: () => layer.rects?.[0]?.color,
    ellipse: () => layer.ellipses?.[0]?.color,
  }

  return colorAccessors[layer.type]?.() || '#000000'
}

/**
 * Update color for all items in a layer
 */
export const updateLayerColor = (layer, newColor) => {
  if (!layer) return null

  const updaters = {
    text: () => {
      if (layer.texts?.[0]) layer.texts[0].color = newColor
      return { texts: layer.texts }
    },
    pen: () => {
      layer.strokes?.forEach((s) => (s.color = newColor))
      return { strokes: layer.strokes }
    },
    arrow: () => {
      layer.arrows?.forEach((a) => (a.color = newColor))
      return { arrows: layer.arrows }
    },
    rect: () => {
      layer.rects?.forEach((r) => (r.color = newColor))
      return { rects: layer.rects }
    },
    ellipse: () => {
      layer.ellipses?.forEach((e) => (e.color = newColor))
      return { ellipses: layer.ellipses }
    },
  }

  return updaters[layer.type]?.()
}

/**
 * Get preview text for text layers
 */
export const getLayerPreviewText = (layer) => {
  if (layer.type === 'text' && layer.texts?.length > 0) {
    const text = layer.texts[0].content
    const maxLength = 30
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
  return null
}

/**
 * Get corresponding tool for a layer type
 */
export const getToolForLayerType = (layerType) => {
  const toolMap = {
    text: 'text',
    pen: 'pen',
    arrow: 'arrow',
    rect: 'rect',
    ellipse: 'ellipse',
  }
  return toolMap[layerType]
}
