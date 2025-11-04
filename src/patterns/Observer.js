/**
 * Observer Pattern Implementation
 * Enables pub/sub architecture for state changes
 */

/**
 * Event Emitter - Base observer implementation
 */
export class EventEmitter {
  constructor() {
    this.listeners = new Map()
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Subscribe to an event once
   */
  once(event, callback) {
    const wrappedCallback = (...args) => {
      callback(...args)
      this.off(event, wrappedCallback)
    }

    return this.on(event, wrappedCallback)
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return

    this.listeners.get(event).delete(callback)

    if (this.listeners.get(event).size === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Emit an event
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return

    this.listeners.get(event).forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error)
      }
    })
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).size : 0
  }

  /**
   * Get all events that have listeners
   */
  eventNames() {
    return Array.from(this.listeners.keys())
  }
}

/**
 * Observable - Manages state with observer notifications
 */
export class Observable {
  constructor(initialValue) {
    this.value = initialValue
    this.emitter = new EventEmitter()
  }

  /**
   * Get current value
   */
  get() {
    return this.value
  }

  /**
   * Set new value and notify observers
   */
  set(newValue) {
    const oldValue = this.value
    this.value = newValue

    if (oldValue !== newValue) {
      this.emitter.emit('change', newValue, oldValue)
    }
  }

  /**
   * Update value with function
   */
  update(updateFn) {
    this.set(updateFn(this.value))
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback) {
    return this.emitter.on('change', callback)
  }

  /**
   * Subscribe once
   */
  subscribeOnce(callback) {
    return this.emitter.once('change', callback)
  }

  /**
   * Unsubscribe
   */
  unsubscribe(callback) {
    this.emitter.off('change', callback)
  }
}

/**
 * Layer State Observer
 */
export class LayerStateObserver extends EventEmitter {
  constructor(layerManager) {
    super()
    this.layerManager = layerManager
  }

  /**
   * Notify layer added
   */
  notifyLayerAdded(layer) {
    this.emit('layerAdded', layer)
    this.emit('layersChanged', this.layerManager.getAllLayers())
  }

  /**
   * Notify layer removed
   */
  notifyLayerRemoved(layerId) {
    this.emit('layerRemoved', layerId)
    this.emit('layersChanged', this.layerManager.getAllLayers())
  }

  /**
   * Notify layer updated
   */
  notifyLayerUpdated(layer) {
    this.emit('layerUpdated', layer)
    this.emit('layersChanged', this.layerManager.getAllLayers())
  }

  /**
   * Notify layer selected
   */
  notifyLayerSelected(layerId) {
    this.emit('layerSelected', layerId)
  }

  /**
   * Notify layer order changed
   */
  notifyLayerOrderChanged() {
    this.emit('layerOrderChanged', this.layerManager.getAllLayers())
    this.emit('layersChanged', this.layerManager.getAllLayers())
  }
}

/**
 * Tool State Observer
 */
export class ToolStateObserver extends EventEmitter {
  /**
   * Notify tool changed
   */
  notifyToolChanged(newTool, oldTool) {
    this.emit('toolChanged', newTool, oldTool)
  }

  /**
   * Notify tool property changed
   */
  notifyToolPropertyChanged(property, newValue, oldValue) {
    this.emit('toolPropertyChanged', { property, newValue, oldValue })
  }
}

/**
 * Selection Observer
 */
export class SelectionObserver extends EventEmitter {
  /**
   * Notify shape selected
   */
  notifyShapeSelected(shape) {
    this.emit('shapeSelected', shape)
    this.emit('selectionChanged', shape)
  }

  /**
   * Notify selection cleared
   */
  notifySelectionCleared() {
    this.emit('selectionCleared')
    this.emit('selectionChanged', null)
  }

  /**
   * Notify shape moved
   */
  notifyShapeMoved(shape, oldPosition, newPosition) {
    this.emit('shapeMoved', { shape, oldPosition, newPosition })
  }

  /**
   * Notify shape resized
   */
  notifyShapeResized(shape, oldBounds, newBounds) {
    this.emit('shapeResized', { shape, oldBounds, newBounds })
  }
}

/**
 * Viewport Observer
 */
export class ViewportObserver extends EventEmitter {
  /**
   * Notify zoom changed
   */
  notifyZoomChanged(newZoom, oldZoom) {
    this.emit('zoomChanged', newZoom, oldZoom)
  }

  /**
   * Notify view reset
   */
  notifyViewReset() {
    this.emit('viewReset')
  }

  /**
   * Notify viewport bounds changed
   */
  notifyBoundsChanged(bounds) {
    this.emit('boundsChanged', bounds)
  }
}

/**
 * Create a reactive property
 */
export const createReactiveProperty = (initialValue, onChange) => {
  const observable = new Observable(initialValue)

  if (onChange) {
    observable.subscribe(onChange)
  }

  return {
    get value() {
      return observable.get()
    },
    set value(newValue) {
      observable.set(newValue)
    },
    subscribe: (callback) => observable.subscribe(callback),
    unsubscribe: (callback) => observable.unsubscribe(callback)
  }
}
