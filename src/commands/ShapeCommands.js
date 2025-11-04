/**
 * Command Pattern Implementation
 * Encapsulates actions as objects for undo/redo functionality
 */

/**
 * Base Command Interface
 */
class Command {
  execute() {
    throw new Error('execute() must be implemented')
  }

  undo() {
    throw new Error('undo() must be implemented')
  }

  redo() {
    this.execute()
  }
}

/**
 * Add Shape Command
 */
class AddShapeCommand extends Command {
  constructor(layerManager, layerId, shapeType, shapeData) {
    super()
    this.layerManager = layerManager
    this.layerId = layerId
    this.shapeType = shapeType
    this.shapeData = shapeData
  }

  execute() {
    this.layerManager.addShapeToLayer(this.layerId, this.shapeType, this.shapeData)
  }

  undo() {
    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    const arrayName = this.shapeType + 's'
    if (layer[arrayName] && layer[arrayName].length > 0) {
      layer[arrayName].pop()
      this.layerManager.updateLayer(this.layerId, layer)
    }
  }
}

/**
 * Delete Shape Command
 */
class DeleteShapeCommand extends Command {
  constructor(layerManager, layerId, shapeType, shapeIndex) {
    super()
    this.layerManager = layerManager
    this.layerId = layerId
    this.shapeType = shapeType
    this.shapeIndex = shapeIndex
    this.deletedShape = null
  }

  execute() {
    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    const arrayName = this.shapeType + 's'
    if (layer[arrayName] && layer[arrayName][this.shapeIndex]) {
      this.deletedShape = layer[arrayName][this.shapeIndex]
      layer[arrayName].splice(this.shapeIndex, 1)
      this.layerManager.updateLayer(this.layerId, layer)
    }
  }

  undo() {
    if (!this.deletedShape) return

    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    const arrayName = this.shapeType + 's'
    if (layer[arrayName]) {
      layer[arrayName].splice(this.shapeIndex, 0, this.deletedShape)
      this.layerManager.updateLayer(this.layerId, layer)
    }
  }
}

/**
 * Move Shape Command
 */
class MoveShapeCommand extends Command {
  constructor(layerManager, layerId, shapeType, shapeIndex, dx, dy) {
    super()
    this.layerManager = layerManager
    this.layerId = layerId
    this.shapeType = shapeType
    this.shapeIndex = shapeIndex
    this.dx = dx
    this.dy = dy
  }

  execute() {
    this.moveShape(this.dx, this.dy)
  }

  undo() {
    this.moveShape(-this.dx, -this.dy)
  }

  moveShape(dx, dy) {
    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    const arrayName = this.shapeType + 's'
    const shape = layer[arrayName]?.[this.shapeIndex]
    if (!shape) return

    // Apply movement based on shape type
    if (this.shapeType === 'stroke') {
      shape.points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
    } else if (this.shapeType === 'arrow') {
      shape.fromX += dx
      shape.fromY += dy
      shape.toX += dx
      shape.toY += dy
    } else if (['rect', 'ellipse', 'text'].includes(this.shapeType)) {
      shape.x += dx
      shape.y += dy
    }

    this.layerManager.updateLayer(this.layerId, layer)
  }
}

/**
 * Create Layer Command
 */
class CreateLayerCommand extends Command {
  constructor(layerManager, name, color) {
    super()
    this.layerManager = layerManager
    this.name = name
    this.color = color
    this.createdLayerId = null
  }

  execute() {
    const layer = this.layerManager.createLayer(this.name, this.color)
    this.createdLayerId = layer.id
  }

  undo() {
    if (this.createdLayerId) {
      this.layerManager.deleteLayer(this.createdLayerId)
    }
  }
}

/**
 * Delete Layer Command
 */
class DeleteLayerCommand extends Command {
  constructor(layerManager, layerId) {
    super()
    this.layerManager = layerManager
    this.layerId = layerId
    this.deletedLayer = null
    this.layerIndex = -1
  }

  execute() {
    const layers = this.layerManager.getAllLayers()
    this.layerIndex = layers.findIndex(l => l.id === this.layerId)
    this.deletedLayer = this.layerManager.getLayer(this.layerId)
    this.layerManager.deleteLayer(this.layerId)
  }

  undo() {
    if (!this.deletedLayer || this.layerIndex === -1) return

    // Re-insert layer at original position
    const layers = this.layerManager.getAllLayers()
    layers.splice(this.layerIndex, 0, this.deletedLayer)
    this.layerManager.layers = layers
  }
}

/**
 * Update Layer Property Command
 */
class UpdateLayerPropertyCommand extends Command {
  constructor(layerManager, layerId, property, newValue) {
    super()
    this.layerManager = layerManager
    this.layerId = layerId
    this.property = property
    this.newValue = newValue
    this.oldValue = null
  }

  execute() {
    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    this.oldValue = layer[this.property]
    layer[this.property] = this.newValue
    this.layerManager.updateLayer(this.layerId, layer)
  }

  undo() {
    const layer = this.layerManager.getLayer(this.layerId)
    if (!layer) return

    layer[this.property] = this.oldValue
    this.layerManager.updateLayer(this.layerId, layer)
  }
}

/**
 * Command Manager - Manages command history
 */
class CommandManager {
  constructor() {
    this.history = []
    this.currentIndex = -1
  }

  execute(command) {
    // Remove any commands after current index
    this.history = this.history.slice(0, this.currentIndex + 1)

    command.execute()
    this.history.push(command)
    this.currentIndex++
  }

  undo() {
    if (!this.canUndo()) return

    const command = this.history[this.currentIndex]
    command.undo()
    this.currentIndex--
  }

  redo() {
    if (!this.canRedo()) return

    this.currentIndex++
    const command = this.history[this.currentIndex]
    command.redo()
  }

  canUndo() {
    return this.currentIndex >= 0
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  clear() {
    this.history = []
    this.currentIndex = -1
  }

  getHistorySize() {
    return this.history.length
  }
}

export {
  Command,
  AddShapeCommand,
  DeleteShapeCommand,
  MoveShapeCommand,
  CreateLayerCommand,
  DeleteLayerCommand,
  UpdateLayerPropertyCommand,
  CommandManager
}
