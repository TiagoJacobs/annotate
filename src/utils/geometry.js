/**
 * Pure Geometry Helper Functions
 * No side effects, just pure calculations
 */

/**
 * Calculate distance between two points
 */
export const distance = (p1, p2) => {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate angle between two points
 */
export const angle = (from, to) => {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

/**
 * Calculate midpoint between two points
 */
export const midpoint = (p1, p2) => ({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2
})

/**
 * Clamp a value between min and max
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}

/**
 * Check if point is inside rectangle
 */
export const isPointInRect = (point, rect) => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/**
 * Check if point is inside ellipse
 */
export const isPointInEllipse = (point, ellipse) => {
  const cx = ellipse.x + ellipse.width / 2
  const cy = ellipse.y + ellipse.height / 2
  const rx = ellipse.width / 2
  const ry = ellipse.height / 2

  const normalized = ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2)
  return normalized <= 1
}

/**
 * Calculate point on line at parameter t (0 to 1)
 */
export const pointOnLine = (start, end, t) => ({
  x: start.x + t * (end.x - start.x),
  y: start.y + t * (end.y - start.y)
})

/**
 * Calculate closest point on line segment to given point
 */
export const closestPointOnLine = (point, lineStart, lineEnd) => {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return lineStart

  const t = clamp(
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq,
    0,
    1
  )

  return pointOnLine(lineStart, lineEnd, t)
}
