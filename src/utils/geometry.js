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
 * Calculate bounding box from array of points
 */
export const getBoundingBox = (points) => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
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
 * Check if point is inside circle
 */
export const isPointInCircle = (point, center, radius) => {
  return distance(point, center) <= radius
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

/**
 * Calculate distance from point to line segment
 */
export const distanceToLine = (point, lineStart, lineEnd) => {
  const closest = closestPointOnLine(point, lineStart, lineEnd)
  return distance(point, closest)
}

/**
 * Rotate point around center
 */
export const rotatePoint = (point, center, angle) => {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

/**
 * Scale point relative to center
 */
export const scalePoint = (point, center, scaleX, scaleY = scaleX) => {
  return {
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY
  }
}

/**
 * Translate point by offset
 */
export const translatePoint = (point, dx, dy) => ({
  x: point.x + dx,
  y: point.y + dy
})

/**
 * Linear interpolation between two values
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * clamp(t, 0, 1)
}

/**
 * Normalize bounds (ensure positive width/height)
 */
export const normalizeBounds = (x, y, width, height) => {
  return {
    x: width < 0 ? x + width : x,
    y: height < 0 ? y + height : y,
    width: Math.abs(width),
    height: Math.abs(height)
  }
}
