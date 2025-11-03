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
  }

  /**
   * Create a new layer
   */
  createLayer(type, name = null, data = {}) {
    const layer = {
      id: Date.now(),
      type,
      name: name || this.getDefaultLayerName(type),
      visible: true,
      locked: false,
      opacity: 1,
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
   * Update layer
   */
  updateLayer(id, updates) {
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
    return this.getLayer(this.selectedId)
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
   * Get default layer name based on type
   */
  getDefaultLayerName(type) {
    const typeNames = {
      image: 'Image',
      pen: 'Pen',
      hand: 'Hand',
      eraser: 'Eraser',
      arrow: 'Arrow',
      rect: 'Rectangle',
      ellipse: 'Ellipse',
      text: 'Text',
    }
    return typeNames[type] || 'Layer'
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
      this.selectedId = null
    }
  }

  /**
   * Redo
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.layers = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
      this.selectedId = null
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
