/**
 * Shape Renderer - Strategy Pattern
 * Encapsulates rendering logic for different shape types
 */

import { ARROW_RENDER_CONFIG, STROKE_RENDER_CONFIG, TEXT_RENDER_CONFIG } from '../config/renderConfig'

/**
 * Base shape renderer interface
 */
class BaseShapeRenderer {
  render(ctx, shape, layerColor) {
    throw new Error('render() must be implemented by subclass')
  }

  // Helper to get shape color with fallback to layerColor
  getShapeColor(shape, layerColor) {
    return shape?.color || layerColor || '#000000'
  }

  // Helper to apply line style (dash pattern)
  applyLineStyle(ctx, lineStyle) {
    switch (lineStyle) {
      case 'dashed':
        ctx.setLineDash([8, 4])
        break
      case 'dotted':
        ctx.setLineDash([2, 4])
        break
      case 'dashdot':
        ctx.setLineDash([8, 4, 2, 4])
        break
      case 'solid':
      default:
        ctx.setLineDash([])
        break
    }
  }

  // Helper to reset line style
  resetLineStyle(ctx) {
    ctx.setLineDash([])
  }
}

/**
 * Stroke renderer
 */
class StrokeRenderer extends BaseShapeRenderer {
  render(ctx, stroke, layerColor) {
    if (!stroke.points || stroke.points.length === 0) return

    ctx.strokeStyle = this.getShapeColor(stroke, layerColor)
    ctx.lineWidth = stroke.size
    ctx.lineCap = STROKE_RENDER_CONFIG.lineCap
    ctx.lineJoin = STROKE_RENDER_CONFIG.lineJoin

    this.applyLineStyle(ctx, stroke.lineStyle)

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }

    ctx.stroke()
    this.resetLineStyle(ctx)
  }
}

/**
 * Arrow renderer
 */
class ArrowRenderer extends BaseShapeRenderer {
  render(ctx, arrow, layerColor) {
    const { fromX, fromY, toX, toY, size = 2 } = arrow
    const { headAngle } = ARROW_RENDER_CONFIG
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const color = this.getShapeColor(arrow, layerColor)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = size

    this.applyLineStyle(ctx, arrow.lineStyle)

    // Draw arrow line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Scale arrow head proportionally to line width
    // Use logarithmic scaling for better proportionality at all sizes
    const headLength = Math.max(6, 8 + Math.log(size) * 6)

    // Calculate arrow head points
    const leftX = toX - headLength * Math.cos(angle - headAngle)
    const leftY = toY - headLength * Math.sin(angle - headAngle)
    const rightX = toX - headLength * Math.cos(angle + headAngle)
    const rightY = toY - headLength * Math.sin(angle + headAngle)

    // Draw filled arrow head triangle
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(leftX, leftY)
    ctx.lineTo(rightX, rightY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    this.resetLineStyle(ctx)
  }
}

/**
 * Rectangle renderer
 */
class RectRenderer extends BaseShapeRenderer {
  render(ctx, rect, layerColor) {
    ctx.strokeStyle = this.getShapeColor(rect, layerColor)
    ctx.lineWidth = rect.size
    this.applyLineStyle(ctx, rect.lineStyle)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.resetLineStyle(ctx)
  }
}

/**
 * Ellipse renderer
 */
class EllipseRenderer extends BaseShapeRenderer {
  render(ctx, ellipse, layerColor) {
    ctx.strokeStyle = this.getShapeColor(ellipse, layerColor)
    ctx.lineWidth = ellipse.size

    this.applyLineStyle(ctx, ellipse.lineStyle)

    ctx.beginPath()
    ctx.ellipse(
      ellipse.x + ellipse.width / 2,
      ellipse.y + ellipse.height / 2,
      Math.abs(ellipse.width) / 2,
      Math.abs(ellipse.height) / 2,
      0,
      0,
      Math.PI * 2
    )
    ctx.stroke()

    this.resetLineStyle(ctx)
  }
}

/**
 * Text renderer
 */
class TextRenderer extends BaseShapeRenderer {
  render(ctx, text, layerColor) {
    const { defaultFontFamily } = TEXT_RENDER_CONFIG

    ctx.fillStyle = this.getShapeColor(text, layerColor)
    ctx.font = `${text.fontSize}px ${text.fontFamily || defaultFontFamily}`
    ctx.fillText(text.content, text.x, text.y)
  }
}

/**
 * Image renderer
 */
class ImageRenderer extends BaseShapeRenderer {
  constructor(imageCache) {
    super()
    this.imageCache = imageCache
    this.onImageLoaded = null
  }

  render(ctx, imageData) {
    if (!imageData) return

    // Handle both old format (string) and new format (object with position)
    const data = typeof imageData === 'string' ? imageData : imageData.data
    const x = typeof imageData === 'object' ? (imageData.x || 0) : 0
    const y = typeof imageData === 'object' ? (imageData.y || 0) : 0
    const width = typeof imageData === 'object' ? imageData.width : undefined
    const height = typeof imageData === 'object' ? imageData.height : undefined

    let img = this.imageCache.get(data)

    if (!img) {
      // Create and cache the image
      img = new Image()
      img.onload = () => {
        this.imageCache.set(data, img)
        if (this.onImageLoaded) {
          this.onImageLoaded()
        }
      }
      img.src = data
    } else if (img.complete) {
      if (width && height) {
        ctx.drawImage(img, x, y, width, height)
      } else {
        ctx.drawImage(img, x, y)
      }
    }
  }

  setOnImageLoaded(callback) {
    this.onImageLoaded = callback
  }
}

/**
 * Shape Renderer Factory
 */
class ShapeRendererFactory {
  constructor(imageCache) {
    this.renderers = {
      stroke: new StrokeRenderer(),
      arrow: new ArrowRenderer(),
      rect: new RectRenderer(),
      ellipse: new EllipseRenderer(),
      text: new TextRenderer(),
      image: new ImageRenderer(imageCache)
    }
  }

  getRenderer(shapeType) {
    return this.renderers[shapeType]
  }

  renderShape(ctx, shapeType, shape, layerColor) {
    const renderer = this.getRenderer(shapeType)
    if (renderer) {
      renderer.render(ctx, shape, layerColor)
    }
  }

  renderShapesInLayer(ctx, layer, shapeTypes) {
    for (const shapeType of shapeTypes) {
      const shapes = layer[`${shapeType}s`] || layer[shapeType]
      if (!shapes || !Array.isArray(shapes)) continue

      shapes.forEach(shape => {
        this.renderShape(ctx, shapeType, shape, layer.color)
      })
    }

    // Render image separately
    if (layer.image) {
      this.renderShape(ctx, 'image', layer.image)
    }
  }
}

export {
  BaseShapeRenderer,
  StrokeRenderer,
  ArrowRenderer,
  RectRenderer,
  EllipseRenderer,
  TextRenderer,
  ImageRenderer,
  ShapeRendererFactory
}
