/**
 * Shape Order Utilities
 * Collects and sorts shapes by z-order for consistent rendering
 */

const LEGACY_TYPE_ORDER = {
  highlighterStroke: 0,
  stroke: 1,
  arrow: 2,
  line: 3,
  rect: 4,
  ellipse: 5,
  text: 6,
  connector: 7,
  stamp: 8,
}

/**
 * Collect all shapes from a layer into a flat array with type and legacy order info.
 * Used for z-order sorted rendering across all shape types.
 */
export function collectLayerShapes(layer) {
  const shapes = []
  let legacyCounter = 0

  const addShapes = (array, type, defaultColor) => {
    if (!array) return
    for (const shape of array) {
      shapes.push({
        shape,
        type,
        color: defaultColor,
        legacyOrder: LEGACY_TYPE_ORDER[type] * 100000 + legacyCounter++,
      })
    }
  }

  addShapes(layer.highlighterStrokes, 'highlighterStroke', '#ffff00')
  addShapes(layer.strokes, 'stroke', '#000000')
  addShapes(layer.arrows, 'arrow', '#000000')
  addShapes(layer.lines, 'line', '#000000')
  addShapes(layer.rects, 'rect', '#000000')
  addShapes(layer.ellipses, 'ellipse', '#000000')
  addShapes(layer.texts, 'text', '#000000')
  addShapes(layer.connectors, 'connector', '#000000')
  addShapes(layer.stamps, 'stamp', undefined)

  return shapes
}

/**
 * Sort shapes by z-order. Shapes without zOrder render first in legacy order.
 */
export function sortByZOrder(shapes) {
  return shapes.sort((a, b) => {
    const za = a.shape.zOrder ?? -1
    const zb = b.shape.zOrder ?? -1
    if (za === zb) return a.legacyOrder - b.legacyOrder
    return za - zb
  })
}
