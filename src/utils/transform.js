/**
 * Transform and Matrix Utilities
 * For advanced canvas transformations
 */

/**
 * 2D Transformation Matrix
 * Represents affine transformations
 */
export class Matrix {
  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
    this.a = a // scale x
    this.b = b // skew y
    this.c = c // skew x
    this.d = d // scale y
    this.e = e // translate x
    this.f = f // translate y
  }

  /**
   * Clone matrix
   */
  clone() {
    return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f)
  }

  /**
   * Multiply with another matrix
   */
  multiply(m) {
    return new Matrix(
      this.a * m.a + this.c * m.b,
      this.b * m.a + this.d * m.b,
      this.a * m.c + this.c * m.d,
      this.b * m.c + this.d * m.d,
      this.a * m.e + this.c * m.f + this.e,
      this.b * m.e + this.d * m.f + this.f
    )
  }

  /**
   * Apply translation
   */
  translate(tx, ty) {
    return this.multiply(new Matrix(1, 0, 0, 1, tx, ty))
  }

  /**
   * Apply scale
   */
  scale(sx, sy = sx) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0))
  }

  /**
   * Apply rotation (radians)
   */
  rotate(angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return this.multiply(new Matrix(cos, sin, -sin, cos, 0, 0))
  }

  /**
   * Apply skew
   */
  skew(sx, sy) {
    return this.multiply(new Matrix(1, Math.tan(sy), Math.tan(sx), 1, 0, 0))
  }

  /**
   * Get inverse matrix
   */
  inverse() {
    const det = this.a * this.d - this.b * this.c

    if (det === 0) {
      throw new Error('Matrix is not invertible')
    }

    return new Matrix(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det
    )
  }

  /**
   * Transform a point
   */
  transformPoint(x, y) {
    return {
      x: this.a * x + this.c * y + this.e,
      y: this.b * x + this.d * y + this.f
    }
  }

  /**
   * Apply to canvas context
   */
  applyToContext(ctx) {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f)
  }

  /**
   * Create identity matrix
   */
  static identity() {
    return new Matrix()
  }

  /**
   * Create translation matrix
   */
  static translation(tx, ty) {
    return new Matrix(1, 0, 0, 1, tx, ty)
  }

  /**
   * Create scale matrix
   */
  static scale(sx, sy = sx) {
    return new Matrix(sx, 0, 0, sy, 0, 0)
  }

  /**
   * Create rotation matrix
   */
  static rotation(angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Matrix(cos, sin, -sin, cos, 0, 0)
  }
}

/**
 * Viewport transform - converts between canvas and screen space
 */
export class ViewportTransform {
  constructor(zoom = 1, panX = 0, panY = 0) {
    this.zoom = zoom
    this.panX = panX
    this.panY = panY
  }

  /**
   * Convert screen to canvas coordinates
   */
  screenToCanvas(screenX, screenY, canvasRect) {
    return {
      x: (screenX - canvasRect.left - this.panX) / this.zoom,
      y: (screenY - canvasRect.top - this.panY) / this.zoom
    }
  }

  /**
   * Convert canvas to screen coordinates
   */
  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.zoom + this.panX,
      y: canvasY * this.zoom + this.panY
    }
  }

  /**
   * Get transformation matrix
   */
  toMatrix() {
    return Matrix.translation(this.panX, this.panY).scale(this.zoom)
  }

  /**
   * Apply to canvas context
   */
  applyToContext(ctx) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY)
  }

  /**
   * Clone viewport transform
   */
  clone() {
    return new ViewportTransform(this.zoom, this.panX, this.panY)
  }
}

/**
 * Bounding box transformer
 */
export class BoundsTransform {
  /**
   * Transform bounds by matrix
   */
  static transformBounds(bounds, matrix) {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    ]

    const transformed = corners.map(p => matrix.transformPoint(p.x, p.y))

    const xs = transformed.map(p => p.x)
    const ys = transformed.map(p => p.y)

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    }
  }

  /**
   * Scale bounds
   */
  static scale(bounds, scaleX, scaleY = scaleX) {
    return {
      x: bounds.x * scaleX,
      y: bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY
    }
  }

  /**
   * Translate bounds
   */
  static translate(bounds, dx, dy) {
    return {
      x: bounds.x + dx,
      y: bounds.y + dy,
      width: bounds.width,
      height: bounds.height
    }
  }

  /**
   * Expand bounds by padding
   */
  static expand(bounds, padding) {
    return {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    }
  }

  /**
   * Check if bounds intersect
   */
  static intersects(bounds1, bounds2) {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    )
  }

  /**
   * Get union of two bounds
   */
  static union(bounds1, bounds2) {
    const x = Math.min(bounds1.x, bounds2.x)
    const y = Math.min(bounds1.y, bounds2.y)
    const maxX = Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width)
    const maxY = Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height)

    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y
    }
  }

  /**
   * Get intersection of two bounds
   */
  static intersection(bounds1, bounds2) {
    const x = Math.max(bounds1.x, bounds2.x)
    const y = Math.max(bounds1.y, bounds2.y)
    const maxX = Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width)
    const maxY = Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height)

    if (maxX < x || maxY < y) {
      return null // No intersection
    }

    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y
    }
  }
}

/**
 * Coordinate system helper
 */
export class CoordinateSystem {
  /**
   * Convert degrees to radians
   */
  static degToRad(degrees) {
    return (degrees * Math.PI) / 180
  }

  /**
   * Convert radians to degrees
   */
  static radToDeg(radians) {
    return (radians * 180) / Math.PI
  }

  /**
   * Normalize angle to 0-2π range
   */
  static normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2
    while (angle >= Math.PI * 2) angle -= Math.PI * 2
    return angle
  }

  /**
   * Get angle between two points
   */
  static angleBetween(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x)
  }

  /**
   * Get point at angle and distance from origin
   */
  static polarToCartesian(angle, distance, origin = { x: 0, y: 0 }) {
    return {
      x: origin.x + Math.cos(angle) * distance,
      y: origin.y + Math.sin(angle) * distance
    }
  }

  /**
   * Get angle and distance from origin to point
   */
  static cartesianToPolar(point, origin = { x: 0, y: 0 }) {
    const dx = point.x - origin.x
    const dy = point.y - origin.y

    return {
      angle: Math.atan2(dy, dx),
      distance: Math.sqrt(dx * dx + dy * dy)
    }
  }
}
