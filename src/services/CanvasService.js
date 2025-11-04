/**
 * Canvas Service
 * High-level service for canvas operations
 * Provides abstraction over CanvasManager
 */

import { safeExecute } from '../utils/errorHandling'
import { CANVAS_RENDER_CONFIG } from '../config/renderConfig'

export class CanvasService {
  constructor(canvasManager) {
    this.canvasManager = canvasManager
    this.renderQueue = []
    this.isRendering = false
  }

  /**
   * Initialize canvas with dimensions
   */
  initialize(width, height) {
    return safeExecute(
      () => {
        this.canvasManager.setDimensions(width, height)
        return true
      },
      false,
      { operation: 'initialize', width, height }
    )
  }

  /**
   * Set zoom level with validation
   */
  setZoom(zoom) {
    const clampedZoom = Math.max(0.1, Math.min(10, zoom))
    return safeExecute(
      () => {
        this.canvasManager.setZoom(clampedZoom)
        return clampedZoom
      },
      null,
      { operation: 'setZoom', zoom }
    )
  }

  /**
   * Reset view to default state
   */
  resetView() {
    return safeExecute(
      () => {
        this.canvasManager.resetView()
        return true
      },
      false,
      { operation: 'resetView' }
    )
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX, screenY) {
    return safeExecute(
      () => this.canvasManager.screenToCanvas(screenX, screenY),
      { x: 0, y: 0 },
      { operation: 'screenToCanvas', screenX, screenY }
    )
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX, canvasY) {
    return safeExecute(
      () => this.canvasManager.canvasToScreen(canvasX, canvasY),
      { screenX: 0, screenY: 0 },
      { operation: 'canvasToScreen', canvasX, canvasY }
    )
  }

  /**
   * Get canvas context
   */
  getContext() {
    return this.canvasManager.getContext()
  }

  /**
   * Clear canvas
   */
  clear() {
    return safeExecute(
      () => {
        const ctx = this.getContext()
        const canvas = ctx.canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return true
      },
      false,
      { operation: 'clear' }
    )
  }

  /**
   * Draw grid with configuration
   */
  drawGrid(gridSize = CANVAS_RENDER_CONFIG.gridSize) {
    return safeExecute(
      () => {
        this.canvasManager.drawGrid(gridSize)
        return true
      },
      false,
      { operation: 'drawGrid', gridSize }
    )
  }

  /**
   * Save canvas state
   */
  save() {
    this.canvasManager.save()
  }

  /**
   * Restore canvas state
   */
  restore() {
    this.canvasManager.restore()
  }

  /**
   * Apply transform
   */
  applyTransform() {
    this.canvasManager.applyTransform()
  }

  /**
   * Reset transform
   */
  resetTransform() {
    this.canvasManager.resetTransform()
  }

  /**
   * Export canvas as data URL
   */
  exportAsDataURL(format = 'image/png', quality = 1.0) {
    return safeExecute(
      () => {
        const ctx = this.getContext()
        return ctx.canvas.toDataURL(format, quality)
      },
      null,
      { operation: 'exportAsDataURL', format, quality }
    )
  }

  /**
   * Export canvas as blob (async)
   */
  async exportAsBlob(format = 'image/png', quality = 1.0) {
    return new Promise((resolve, reject) => {
      try {
        const ctx = this.getContext()
        ctx.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          format,
          quality
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Queue a render operation
   */
  queueRender(renderFn) {
    this.renderQueue.push(renderFn)
    this.processRenderQueue()
  }

  /**
   * Process queued render operations
   */
  processRenderQueue() {
    if (this.isRendering || this.renderQueue.length === 0) return

    this.isRendering = true

    requestAnimationFrame(() => {
      while (this.renderQueue.length > 0) {
        const renderFn = this.renderQueue.shift()
        safeExecute(renderFn, null, { operation: 'queuedRender' })
      }
      this.isRendering = false
    })
  }

  /**
   * Get canvas dimensions
   */
  getDimensions() {
    const ctx = this.getContext()
    return {
      width: ctx.canvas.width,
      height: ctx.canvas.height
    }
  }

  /**
   * Get current zoom level
   */
  getZoom() {
    return this.canvasManager.zoom
  }

  /**
   * Check if point is visible in viewport
   */
  isPointVisible(x, y) {
    const { width, height } = this.getDimensions()
    const zoom = this.getZoom()

    return (
      x >= 0 &&
      x <= width / zoom &&
      y >= 0 &&
      y <= height / zoom
    )
  }

  /**
   * Get visible area bounds
   */
  getVisibleBounds() {
    const { width, height } = this.getDimensions()
    const zoom = this.getZoom()

    return {
      x: 0,
      y: 0,
      width: width / zoom,
      height: height / zoom
    }
  }
}
