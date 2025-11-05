/**
 * Layer Manager
 * Manages layer creation, deletion, ordering, and retrieval
 */

export class LayerManager {
  constructor() {
    this.layers = []
    this.selectedId = null
    this.history = []
    this.historyIndex = -1
    this.layerCounter = 0
  }

  /**
   * Create a new layer
   */
  createLayer(name = null, data = {}) {
    this.layerCounter++
    const layer = {
      id: Date.now(),
      name: name || `Layer ${this.layerCounter}`,
      visible: true,
      locked: false,
      opacity: 1,
      arrows: [],
      rects: [],
      ellipses: [],
      strokes: [],
      texts: [],
      ...data,
    }

    this.layers.push(layer)
    this.selectedId = layer.id
    this.saveHistory()
    return layer
  }

  /**
   * Get layer by ID
   */
  getLayer(id) {
    return this.layers.find((l) => l.id === id)
  }

  /**
   * Get all layers
   */
  getAllLayers() {
    return [...this.layers]
  }

  /**
   * Update layer without saving to history (for intermediate drawing steps)
   */
  updateLayer(id, updates) {
    const layer = this.getLayer(id)
    if (layer) {
      Object.assign(layer, updates)
    }
  }

  /**
   * Update layer and save to history (for completed actions)
   */
  updateLayerWithHistory(id, updates) {
    const layer = this.getLayer(id)
    if (layer) {
      Object.assign(layer, updates)
      this.saveHistory()
    }
  }

  /**
   * Delete layer
   */
  deleteLayer(id) {
    const index = this.layers.findIndex((l) => l.id === id)
    if (index !== -1) {
      this.layers.splice(index, 1)
      if (this.selectedId === id) {
        this.selectedId = this.layers.length > 0 ? this.layers[this.layers.length - 1].id : null
      }
      this.saveHistory()
    }
  }

  /**
   * Reorder layers
   */
  moveLayer(id, direction) {
    const index = this.layers.findIndex((l) => l.id === id)
    if (index === -1) return

    let newIndex = index
    if (direction === 'up' && index > 0) {
      newIndex = index - 1
    } else if (direction === 'down' && index < this.layers.length - 1) {
      newIndex = index + 1
    }

    if (newIndex !== index) {
      const [layer] = this.layers.splice(index, 1)
      this.layers.splice(newIndex, 0, layer)
      this.saveHistory()
    }
  }

  /**
   * Select layer
   */
  selectLayer(id) {
    if (this.getLayer(id)) {
      this.selectedId = id
    }
  }

  /**
   * Get selected layer
   */
  getSelectedLayer() {
    const layer = this.getLayer(this.selectedId)

    // If no layer is selected but layers exist, auto-select the last layer
    if (!layer && this.layers.length > 0) {
      this.selectedId = this.layers[this.layers.length - 1].id
      return this.layers[this.layers.length - 1]
    }

    return layer
  }

  /**
   * Toggle layer visibility
   */
  toggleVisibility(id) {
    const layer = this.getLayer(id)
    if (layer) {
      layer.visible = !layer.visible
      this.saveHistory()
    }
  }

  /**
   * Toggle layer lock
   */
  toggleLock(id) {
    const layer = this.getLayer(id)
    if (layer) {
      layer.locked = !layer.locked
      this.saveHistory()
    }
  }

  /**
   * Clear all layers
   */
  clear() {
    this.layers = []
    this.selectedId = null
    this.saveHistory()
  }

  /**
   * Add a shape to an existing layer
   */
  addShapeToLayer(layerId, shapeType, shapeData) {
    const layer = this.getLayer(layerId)
    if (!layer) return

    if (shapeType === 'arrow') {
      layer.arrows.push(shapeData)
    } else if (shapeType === 'rect') {
      layer.rects.push(shapeData)
    } else if (shapeType === 'ellipse') {
      layer.ellipses.push(shapeData)
    } else if (shapeType === 'stroke') {
      layer.strokes.push(shapeData)
    } else if (shapeType === 'text') {
      layer.texts.push(shapeData)
    }

    this.saveHistory()
  }

  /**
   * Rename layer
   */
  renameLayer(id, newName) {
    const layer = this.getLayer(id)
    if (layer) {
      layer.name = newName
      this.saveHistory()
    }
  }

  /**
   * Save state to history
   */
  saveHistory() {
    // Remove any history after current index (for redo)
    this.history = this.history.slice(0, this.historyIndex + 1)
    // Save current state
    this.history.push(JSON.parse(JSON.stringify(this.layers)))
    this.historyIndex++
  }

  /**
   * Undo
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this.layers = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
      // Ensure a layer is selected after undo
      if (this.layers.length > 0) {
        this.selectedId = this.layers[this.layers.length - 1].id
      } else {
        this.selectedId = null
      }
    }
  }

  /**
   * Redo
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.layers = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
      // Ensure a layer is selected after redo
      if (this.layers.length > 0) {
        this.selectedId = this.layers[this.layers.length - 1].id
      } else {
        this.selectedId = null
      }
    }
  }

  /**
   * Check if can undo
   */
  canUndo() {
    return this.historyIndex > 0
  }

  /**
   * Check if can redo
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1
  }
}
