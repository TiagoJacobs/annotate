/**
 * Rotation utility functions
 * Pure math helpers for shape rotation
 */

/**
 * Rotate a point around a center
 */
export function rotatePoint(px, py, cx, cy, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

/**
 * Inverse-rotate a point around a center (for hit detection)
 */
export function inverseRotatePoint(px, py, cx, cy, angle) {
  return rotatePoint(px, py, cx, cy, -angle)
}

/**
 * Get center of a bounding box
 */
export function getBoundsCenter(bounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

/**
 * Compute axis-aligned bounding box of a rotated rectangle
 */
export function getRotatedBoundingBox(bounds, rotation) {
  if (!rotation) return bounds

  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2

  const corners = [
    rotatePoint(bounds.x, bounds.y, cx, cy, rotation),
    rotatePoint(bounds.x + bounds.width, bounds.y, cx, cy, rotation),
    rotatePoint(bounds.x + bounds.width, bounds.y + bounds.height, cx, cy, rotation),
    rotatePoint(bounds.x, bounds.y + bounds.height, cx, cy, rotation),
  ]

  const xs = corners.map(c => c.x)
  const ys = corners.map(c => c.y)

  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Snap angle to nearest increment (e.g., 15 degrees)
 */
export function snapAngle(angle, increment = Math.PI / 12) {
  return Math.round(angle / increment) * increment
}
