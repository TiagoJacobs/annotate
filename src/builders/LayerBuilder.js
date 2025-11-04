/**
 * Builder Pattern Implementation
 * Provides fluent interface for creating complex objects
 */

/**
 * Layer Builder - Fluent interface for creating layers
 */
export class LayerBuilder {
  constructor() {
    this.reset()
  }

  reset() {
    this.layer = {
      id: Date.now(),
      name: 'Layer',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#000000',
      arrows: [],
      rects: [],
      ellipses: [],
      strokes: [],
      texts: [],
      image: null
    }
    return this
  }

  setId(id) {
    this.layer.id = id
    return this
  }

  setName(name) {
    this.layer.name = name
    return this
  }

  setColor(color) {
    this.layer.color = color
    return this
  }

  setVisible(visible) {
    this.layer.visible = visible
    return this
  }

  setLocked(locked) {
    this.layer.locked = locked
    return this
  }

  setOpacity(opacity) {
    this.layer.opacity = Math.max(0, Math.min(1, opacity))
    return this
  }

  addArrow(arrow) {
    this.layer.arrows.push(arrow)
    return this
  }

  addRect(rect) {
    this.layer.rects.push(rect)
    return this
  }

  addEllipse(ellipse) {
    this.layer.ellipses.push(ellipse)
    return this
  }

  addStroke(stroke) {
    this.layer.strokes.push(stroke)
    return this
  }

  addText(text) {
    this.layer.texts.push(text)
    return this
  }

  setImage(imageData) {
    this.layer.image = imageData
    return this
  }

  build() {
    const result = { ...this.layer }
    this.reset()
    return result
  }
}

/**
 * Shape Builder - Fluent interface for creating shapes
 */
export class ShapeBuilder {
  constructor(type) {
    this.type = type
    this.reset()
  }

  reset() {
    this.shape = {}
    return this
  }

  at(x, y) {
    this.shape.x = x
    this.shape.y = y
    return this
  }

  from(x, y) {
    this.shape.fromX = x
    this.shape.fromY = y
    return this
  }

  to(x, y) {
    this.shape.toX = x
    this.shape.toY = y
    return this
  }

  withSize(width, height = null) {
    this.shape.width = width
    if (height !== null) {
      this.shape.height = height
    }
    return this
  }

  withLineWidth(width) {
    this.shape.size = width
    return this
  }

  withContent(content) {
    this.shape.content = content
    return this
  }

  withFontSize(fontSize) {
    this.shape.fontSize = fontSize
    return this
  }

  withFontFamily(fontFamily) {
    this.shape.fontFamily = fontFamily
    return this
  }

  withPoints(points) {
    this.shape.points = points
    return this
  }

  addPoint(x, y) {
    if (!this.shape.points) {
      this.shape.points = []
    }
    this.shape.points.push({ x, y })
    return this
  }

  build() {
    const result = { ...this.shape }
    this.reset()
    return result
  }
}

/**
 * Arrow Builder
 */
export class ArrowBuilder extends ShapeBuilder {
  constructor() {
    super('arrow')
  }

  fromPoint(point) {
    return this.from(point.x, point.y)
  }

  toPoint(point) {
    return this.to(point.x, point.y)
  }

  withAngle(angle, length) {
    if (!this.shape.fromX || !this.shape.fromY) {
      throw new Error('Must set from point before using withAngle')
    }

    this.shape.toX = this.shape.fromX + Math.cos(angle) * length
    this.shape.toY = this.shape.fromY + Math.sin(angle) * length
    return this
  }
}

/**
 * Rectangle Builder
 */
export class RectBuilder extends ShapeBuilder {
  constructor() {
    super('rect')
  }

  withDimensions(width, height) {
    return this.withSize(width, height)
  }

  fromCorners(x1, y1, x2, y2) {
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    return this.at(x, y).withSize(width, height)
  }

  centered(centerX, centerY, width, height) {
    const x = centerX - width / 2
    const y = centerY - height / 2
    return this.at(x, y).withSize(width, height)
  }
}

/**
 * Ellipse Builder
 */
export class EllipseBuilder extends ShapeBuilder {
  constructor() {
    super('ellipse')
  }

  withRadii(rx, ry) {
    this.shape.width = rx * 2
    this.shape.height = ry * 2
    return this
  }

  asCircle(radius) {
    return this.withRadii(radius, radius)
  }

  centered(centerX, centerY, width, height) {
    const x = centerX - width / 2
    const y = centerY - height / 2
    return this.at(x, y).withSize(width, height)
  }
}

/**
 * Text Builder
 */
export class TextBuilder extends ShapeBuilder {
  constructor() {
    super('text')
  }

  withText(text) {
    return this.withContent(text)
  }

  withFont(fontSize, fontFamily = 'Arial') {
    return this.withFontSize(fontSize).withFontFamily(fontFamily)
  }

  alignLeft() {
    this.shape.align = 'left'
    return this
  }

  alignCenter() {
    this.shape.align = 'center'
    return this
  }

  alignRight() {
    this.shape.align = 'right'
    return this
  }
}

/**
 * Stroke Builder
 */
export class StrokeBuilder extends ShapeBuilder {
  constructor() {
    super('stroke')
    this.shape.points = []
  }

  startAt(x, y) {
    this.shape.points = [{ x, y }]
    return this
  }

  lineTo(x, y) {
    this.addPoint(x, y)
    return this
  }

  smoothCurve(controlPoints) {
    // Add bezier curve points
    for (const point of controlPoints) {
      this.addPoint(point.x, point.y)
    }
    return this
  }
}

/**
 * Builder Director - Provides common building patterns
 */
export class BuilderDirector {
  /**
   * Create a simple layer with default settings
   */
  static createSimpleLayer(name, color) {
    return new LayerBuilder()
      .setName(name)
      .setColor(color)
      .build()
  }

  /**
   * Create a layer from image
   */
  static createImageLayer(imageData, name = 'Image') {
    return new LayerBuilder()
      .setName(name)
      .setImage(imageData)
      .setColor('#808080')
      .build()
  }

  /**
   * Create a horizontal arrow
   */
  static createHorizontalArrow(startX, y, length, lineWidth = 2) {
    return new ArrowBuilder()
      .from(startX, y)
      .to(startX + length, y)
      .withLineWidth(lineWidth)
      .build()
  }

  /**
   * Create a vertical arrow
   */
  static createVerticalArrow(x, startY, length, lineWidth = 2) {
    return new ArrowBuilder()
      .from(x, startY)
      .to(x, startY + length)
      .withLineWidth(lineWidth)
      .build()
  }

  /**
   * Create a square
   */
  static createSquare(x, y, size, lineWidth = 2) {
    return new RectBuilder()
      .at(x, y)
      .withSize(size, size)
      .withLineWidth(lineWidth)
      .build()
  }

  /**
   * Create a circle
   */
  static createCircle(centerX, centerY, radius, lineWidth = 2) {
    return new EllipseBuilder()
      .centered(centerX, centerY, radius * 2, radius * 2)
      .withLineWidth(lineWidth)
      .build()
  }

  /**
   * Create centered text
   */
  static createCenteredText(x, y, text, fontSize = 20) {
    return new TextBuilder()
      .at(x, y)
      .withText(text)
      .withFont(fontSize)
      .alignCenter()
      .build()
  }
}
