/**
 * Canvas Manager
 * Handles canvas rendering, zoom, pan, and coordinate transformations
 */

// Zoom limits
const MIN_ZOOM = 0.1  // 10% minimum zoom
const MAX_ZOOM = 10   // 1000% maximum zoom

export class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement
    this.ctx = canvasElement.getContext('2d')
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.width = canvasElement.width
    this.height = canvasElement.height
  }

  /**
   * Set canvas dimensions
   */
  setDimensions(width, height) {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * Zoom in/out (relative to center)
   */
  setZoom(zoomLevel, centerX = this.width / 2, centerY = this.height / 2) {
    const oldZoom = this.zoom
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel))

    // Adjust pan to zoom towards center point
    const zoomDiff = this.zoom - oldZoom
    this.panX -= (centerX - this.panX) * (zoomDiff / oldZoom)
    this.panY -= (centerY - this.panY) * (zoomDiff / oldZoom)
  }

  /**
   * Zoom in by percentage
   */
  zoomIn(amount = 0.1) {
    this.setZoom(this.zoom + amount)
  }

  /**
   * Zoom out by percentage
   */
  zoomOut(amount = 0.1) {
    this.setZoom(this.zoom - amount)
  }

  /**
   * Reset zoom and pan
   */
  resetView() {
    this.zoom = 1
    this.panX = 0
    this.panY = 0
  }

  /**
   * Pan the canvas
   */
  pan(deltaX, deltaY) {
    this.panX += deltaX
    this.panY += deltaY
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = (screenX - rect.left - this.panX) / this.zoom
    const y = (screenY - rect.top - this.panY) / this.zoom
    return { x, y }
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX, canvasY) {
    const screenX = canvasX * this.zoom + this.panX
    const screenY = canvasY * this.zoom + this.panY
    return { screenX, screenY }
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Save context state
   */
  save() {
    this.ctx.save()
  }

  /**
   * Restore context state
   */
  restore() {
    this.ctx.restore()
  }

  /**
   * Apply transform (pan and zoom)
   */
  applyTransform() {
    this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY)
  }

  /**
   * Reset transform
   */
  resetTransform() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  /**
   * Get the context
   */
  getContext() {
    return this.ctx
  }

  /**
   * Draw grid background
   */
  drawGrid(gridSize = 50) {
    this.ctx.save()
    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)'
    this.ctx.lineWidth = 1

    this.applyTransform()

    // Draw vertical grid lines
    const startX = Math.floor(-this.panX / this.zoom / gridSize) * gridSize
    const endX = startX + Math.ceil(this.width / this.zoom / gridSize) * gridSize + gridSize

    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, -this.panY / this.zoom - gridSize)
      this.ctx.lineTo(x, -this.panY / this.zoom + this.height / this.zoom + gridSize)
      this.ctx.stroke()
    }

    // Draw horizontal grid lines
    const startY = Math.floor(-this.panY / this.zoom / gridSize) * gridSize
    const endY = startY + Math.ceil(this.height / this.zoom / gridSize) * gridSize + gridSize

    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(-this.panX / this.zoom - gridSize, y)
      this.ctx.lineTo(-this.panX / this.zoom + this.width / this.zoom + gridSize, y)
      this.ctx.stroke()
    }

    this.resetTransform()
    this.ctx.restore()
  }

  /**
   * Draw on canvas with automatic transform handling
   * Usage: canvasManager.draw((ctx) => { ctx.fillRect(...) })
   */
  draw(callback) {
    this.save()
    this.applyTransform()
    callback(this.ctx)
    this.resetTransform()
    this.restore()
  }

  /**
   * Get visible bounds (what's currently on screen)
   */
  getVisibleBounds() {
    return {
      x: -this.panX / this.zoom,
      y: -this.panY / this.zoom,
      width: this.width / this.zoom,
      height: this.height / this.zoom,
    }
  }

  /**
   * Check if a point is within visible bounds
   */
  isPointVisible(x, y) {
    const bounds = this.getVisibleBounds()
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    )
  }
}
