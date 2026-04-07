/**
 * Shape Renderer - Strategy Pattern
 * Encapsulates rendering logic for different shape types
 */

import { ARROW_RENDER_CONFIG, STROKE_RENDER_CONFIG, TEXT_RENDER_CONFIG } from '../config/renderConfig'
import { getShapeCenterForType } from '../services/ShapeOperations'
import { STAMPS, generateCounterSvg } from '../assets/stamps'

/**
 * Base shape renderer interface
 */
class BaseShapeRenderer {
  render(_ctx, _shape, _layerColor) {
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
 * Highlighter stroke renderer
 */
class HighlighterStrokeRenderer extends BaseShapeRenderer {
  render(ctx, stroke, layerColor) {
    if (!stroke.points || stroke.points.length === 0) return

    ctx.save()
    ctx.globalAlpha = stroke.opacity || 0.4
    ctx.globalCompositeOperation = 'multiply'
    ctx.strokeStyle = this.getShapeColor(stroke, layerColor)
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }

    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Line renderer (straight line without arrowhead)
 */
class LineRenderer extends BaseShapeRenderer {
  render(ctx, line, layerColor) {
    const { fromX, fromY, toX, toY, size = 2 } = line
    const color = this.getShapeColor(line, layerColor)

    ctx.strokeStyle = color
    ctx.lineWidth = size

    this.applyLineStyle(ctx, line.lineStyle)

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
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
 * Connector renderer - line with arrowhead between shapes
 */
class ConnectorRenderer extends BaseShapeRenderer {
  render(ctx, connector, layerColor) {
    const { fromX, fromY, toX, toY, size = 2 } = connector
    if (fromX == null || toX == null) return

    const { headAngle } = ARROW_RENDER_CONFIG
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const color = this.getShapeColor(connector, layerColor)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = size

    this.applyLineStyle(ctx, connector.lineStyle)

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Arrowhead at the 'to' end
    const headLength = Math.max(6, 8 + Math.log(size) * 6)
    const leftX = toX - headLength * Math.cos(angle - headAngle)
    const leftY = toY - headLength * Math.sin(angle - headAngle)
    const rightX = toX - headLength * Math.cos(angle + headAngle)
    const rightY = toY - headLength * Math.sin(angle + headAngle)

    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(leftX, leftY)
    ctx.lineTo(rightX, rightY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    this.resetLineStyle(ctx)

    // Render label at midpoint
    if (connector.label) {
      const midX = (fromX + toX) / 2
      const midY = (fromY + toY) / 2
      const labelFontSize = Math.max(12, size * 3)
      ctx.save()
      ctx.font = `${labelFontSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const metrics = ctx.measureText(connector.label)
      const pad = 4
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(midX - metrics.width / 2 - pad, midY - labelFontSize / 2 - pad,
                   metrics.width + pad * 2, labelFontSize + pad * 2)
      ctx.fillStyle = color
      ctx.fillText(connector.label, midX, midY)
      ctx.restore()
    }
  }
}

/**
 * Rectangle renderer
 */
class RectRenderer extends BaseShapeRenderer {
  render(ctx, rect, layerColor) {
    if (rect.fillColor) {
      ctx.fillStyle = rect.fillColor
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.strokeStyle = this.getShapeColor(rect, layerColor)
    ctx.lineWidth = rect.size
    this.applyLineStyle(ctx, rect.lineStyle)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    this.resetLineStyle(ctx)

    // Render label if set
    if (rect.label) {
      const fontSize = Math.min(rect.height * 0.4, 20)
      ctx.fillStyle = this.getShapeColor(rect, layerColor)
      ctx.font = `${fontSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(rect.label, rect.x + rect.width / 2, rect.y + rect.height / 2)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    }
  }
}

/**
 * Ellipse renderer
 */
class EllipseRenderer extends BaseShapeRenderer {
  render(ctx, ellipse, layerColor) {
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

    if (ellipse.fillColor) {
      ctx.fillStyle = ellipse.fillColor
      ctx.fill()
    }

    ctx.strokeStyle = this.getShapeColor(ellipse, layerColor)
    ctx.lineWidth = ellipse.size
    this.applyLineStyle(ctx, ellipse.lineStyle)
    ctx.stroke()

    this.resetLineStyle(ctx)

    // Render label if set
    if (ellipse.label) {
      const fontSize = Math.min(ellipse.height * 0.4, 20)
      ctx.fillStyle = this.getShapeColor(ellipse, layerColor)
      ctx.font = `${fontSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ellipse.label, ellipse.x + ellipse.width / 2, ellipse.y + ellipse.height / 2)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    }
  }
}

/**
 * Text renderer
 */
class TextRenderer extends BaseShapeRenderer {
  render(ctx, text, layerColor) {
    const { defaultFontFamily } = TEXT_RENDER_CONFIG
    const fontFamily = text.fontFamily || defaultFontFamily
    const weight = text.fontWeight === 'bold' ? 'bold ' : ''
    const style = text.fontStyle === 'italic' ? 'italic ' : ''

    ctx.font = `${style}${weight}${text.fontSize}px ${fontFamily}`

    // Draw highlight background
    if (text.highlightColor) {
      const metrics = ctx.measureText(text.content)
      const textHeight = text.fontSize
      ctx.fillStyle = text.highlightColor
      ctx.fillRect(text.x, text.y - textHeight, metrics.width, textHeight * 1.15)
    }

    // Draw text
    ctx.fillStyle = this.getShapeColor(text, layerColor)
    ctx.fillText(text.content, text.x, text.y)

    // Draw underline
    if (text.textDecoration === 'underline') {
      const metrics = ctx.measureText(text.content)
      ctx.strokeStyle = this.getShapeColor(text, layerColor)
      ctx.lineWidth = Math.max(1, text.fontSize / 15)
      ctx.beginPath()
      ctx.moveTo(text.x, text.y + text.fontSize * 0.1)
      ctx.lineTo(text.x + metrics.width, text.y + text.fontSize * 0.1)
      ctx.stroke()
    }
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
 * Stamp renderer - renders SVG stamps via cached Image
 */
class StampRenderer extends BaseShapeRenderer {
  constructor() {
    super()
    this.stampImageCache = new Map()
  }

  getStampImage(cacheKey, svgString) {
    if (this.stampImageCache.has(cacheKey)) {
      return this.stampImageCache.get(cacheKey)
    }

    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    img.src = url

    img.onload = () => {
      this.stampImageCache.set(cacheKey, img)
    }

    this.stampImageCache.set(cacheKey, img)
    return img
  }

  render(ctx, stamp) {
    let cacheKey = stamp.stampId
    let svgString

    if (stamp.stampId === 'counter' && stamp.counterValue != null) {
      cacheKey = `counter_${stamp.counterValue}`
      svgString = generateCounterSvg(stamp.counterValue)
    } else {
      const stampDef = STAMPS[stamp.stampId]
      if (!stampDef) return
      svgString = stampDef.svg
    }

    const img = this.getStampImage(cacheKey, svgString)
    if (!img || !img.complete) return

    ctx.drawImage(img, stamp.x, stamp.y, stamp.width, stamp.height)
  }
}

/**
 * Shape Renderer Factory
 */
class ShapeRendererFactory {
  constructor(imageCache) {
    this.renderers = {
      stroke: new StrokeRenderer(),
      highlighterStroke: new HighlighterStrokeRenderer(),
      arrow: new ArrowRenderer(),
      line: new LineRenderer(),
      connector: new ConnectorRenderer(),
      rect: new RectRenderer(),
      ellipse: new EllipseRenderer(),
      text: new TextRenderer(),
      stamp: new StampRenderer(),
      image: new ImageRenderer(imageCache)
    }
  }

  getRenderer(shapeType) {
    return this.renderers[shapeType]
  }

  renderShape(ctx, shapeType, shape, layerColor) {
    const renderer = this.getRenderer(shapeType)
    if (!renderer) return

    const rotation = shape?.rotation || 0
    if (rotation !== 0) {
      const center = getShapeCenterForType(shape, shapeType)
      if (center) {
        ctx.save()
        ctx.translate(center.x, center.y)
        ctx.rotate(rotation)
        ctx.translate(-center.x, -center.y)
        renderer.render(ctx, shape, layerColor)
        ctx.restore()
        return
      }
    }
    renderer.render(ctx, shape, layerColor)
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
  HighlighterStrokeRenderer,
  ArrowRenderer,
  LineRenderer,
  RectRenderer,
  EllipseRenderer,
  TextRenderer,
  ImageRenderer,
  ShapeRendererFactory
}
