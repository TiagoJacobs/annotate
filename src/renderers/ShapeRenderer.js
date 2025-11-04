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
}

/**
 * Stroke renderer
 */
class StrokeRenderer extends BaseShapeRenderer {
  render(ctx, stroke, layerColor) {
    if (!stroke.points || stroke.points.length === 0) return

    ctx.strokeStyle = layerColor
    ctx.lineWidth = stroke.size
    ctx.lineCap = STROKE_RENDER_CONFIG.lineCap
    ctx.lineJoin = STROKE_RENDER_CONFIG.lineJoin

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }

    ctx.stroke()
  }
}

/**
 * Arrow renderer
 */
class ArrowRenderer extends BaseShapeRenderer {
  render(ctx, arrow, layerColor) {
    const { fromX, fromY, toX, toY, size = 2 } = arrow
    const { headLength, headAngle } = ARROW_RENDER_CONFIG
    const angle = Math.atan2(toY - fromY, toX - fromX)

    ctx.strokeStyle = layerColor
    ctx.lineWidth = size

    // Draw arrow line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Draw arrow head
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle - headAngle),
      toY - headLength * Math.sin(angle - headAngle)
    )
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle + headAngle),
      toY - headLength * Math.sin(angle + headAngle)
    )
    ctx.stroke()
  }
}

/**
 * Rectangle renderer
 */
class RectRenderer extends BaseShapeRenderer {
  render(ctx, rect, layerColor) {
    ctx.strokeStyle = layerColor
    ctx.lineWidth = rect.size
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }
}

/**
 * Ellipse renderer
 */
class EllipseRenderer extends BaseShapeRenderer {
  render(ctx, ellipse, layerColor) {
    ctx.strokeStyle = layerColor
    ctx.lineWidth = ellipse.size

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
  }
}

/**
 * Text renderer
 */
class TextRenderer extends BaseShapeRenderer {
  render(ctx, text, layerColor) {
    const { defaultFontFamily } = TEXT_RENDER_CONFIG

    ctx.fillStyle = layerColor
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

    let img = this.imageCache.get(imageData)

    if (!img) {
      // Create and cache the image
      img = new Image()
      img.onload = () => {
        this.imageCache.set(imageData, img)
        if (this.onImageLoaded) {
          this.onImageLoaded()
        }
      }
      img.src = imageData
    } else if (img.complete) {
      ctx.drawImage(img, 0, 0)
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
