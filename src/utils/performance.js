/**
 * Performance Optimization Utilities
 * Debounce, throttle, memoization, and other performance helpers
 */

/**
 * Debounce function - delays execution until after wait time
 */
export const debounce = (func, wait = 300) => {
  let timeoutId

  const debounced = function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), wait)
  }

  debounced.cancel = () => clearTimeout(timeoutId)

  return debounced
}

/**
 * Throttle function - limits execution to once per wait period
 */
export const throttle = (func, wait = 300) => {
  let inThrottle
  let lastTime

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      lastTime = Date.now()
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
        // Call again if there was an attempt during throttle period
        if (Date.now() - lastTime >= wait) {
          func.apply(this, args)
        }
      }, wait)
    }
  }
}

/**
 * Memoize function - caches results based on arguments
 */
export const memoize = (func, keyGenerator) => {
  const cache = new Map()

  return function (...args) {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = func.apply(this, args)
    cache.set(key, result)

    return result
  }
}

/**
 * Memoize with size limit (LRU cache)
 */
export const memoizeLRU = (func, maxSize = 100) => {
  const cache = new Map()

  return function (...args) {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key)
      cache.delete(key)
      cache.set(key, value)
      return value
    }

    const result = func.apply(this, args)

    // Remove oldest entry if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    cache.set(key, result)
    return result
  }
}

/**
 * Request Animation Frame wrapper
 */
export const rafThrottle = (callback) => {
  let rafId = null

  const throttled = (...args) => {
    if (rafId) return

    rafId = requestAnimationFrame(() => {
      callback(...args)
      rafId = null
    })
  }

  throttled.cancel = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return throttled
}

/**
 * Batch updates - collects multiple updates and executes once
 */
export class BatchUpdater {
  constructor(callback, wait = 16) {
    this.callback = callback
    this.wait = wait
    this.queue = []
    this.timeoutId = null
  }

  add(item) {
    this.queue.push(item)
    this.scheduleFlush()
  }

  scheduleFlush() {
    if (this.timeoutId) return

    this.timeoutId = setTimeout(() => {
      this.flush()
    }, this.wait)
  }

  flush() {
    if (this.queue.length === 0) return

    const items = [...this.queue]
    this.queue = []
    this.timeoutId = null

    this.callback(items)
  }

  clear() {
    this.queue = []
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}

/**
 * Lazy evaluation - delays computation until needed
 */
export class Lazy {
  constructor(computeFn) {
    this.computeFn = computeFn
    this.computed = false
    this.value = null
  }

  get() {
    if (!this.computed) {
      this.value = this.computeFn()
      this.computed = true
    }
    return this.value
  }

  reset() {
    this.computed = false
    this.value = null
  }
}

/**
 * Object pool for reusing objects
 */
export class ObjectPool {
  constructor(factory, resetFn, initialSize = 10) {
    this.factory = factory
    this.resetFn = resetFn
    this.pool = []

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory())
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop()
    }
    return this.factory()
  }

  release(obj) {
    if (this.resetFn) {
      this.resetFn(obj)
    }
    this.pool.push(obj)
  }

  clear() {
    this.pool = []
  }

  get size() {
    return this.pool.length
  }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  constructor() {
    this.measurements = new Map()
  }

  start(label) {
    this.measurements.set(label, performance.now())
  }

  end(label) {
    const startTime = this.measurements.get(label)
    if (!startTime) return null

    const duration = performance.now() - startTime
    this.measurements.delete(label)

    return duration
  }

  measure(label, fn) {
    this.start(label)
    const result = fn()
    const duration = this.end(label)

    return { result, duration }
  }

  async measureAsync(label, fn) {
    this.start(label)
    const result = await fn()
    const duration = this.end(label)

    return { result, duration }
  }
}

/**
 * Intersection Observer wrapper for visibility detection
 */
export const createVisibilityObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options
  }

  return new IntersectionObserver(callback, defaultOptions)
}

/**
 * Chunk array processing - prevents blocking UI
 */
export const processInChunks = async (array, processFn, chunkSize = 100) => {
  const results = []

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)

    // Process chunk
    const chunkResults = chunk.map(processFn)
    results.push(...chunkResults)

    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return results
}

/**
 * Idle callback wrapper
 */
export const runWhenIdle = (callback, options = {}) => {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, options)
  }

  // Fallback for browsers without requestIdleCallback
  return setTimeout(callback, 1)
}

/**
 * Cancel idle callback
 */
export const cancelIdleCallback = (id) => {
  if ('cancelIdleCallback' in window) {
    cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Simple FPS counter
 */
export class FPSCounter {
  constructor() {
    this.frames = []
    this.lastTime = performance.now()
  }

  tick() {
    const now = performance.now()
    this.frames.push(now)

    // Keep only last second of frames
    const oneSecondAgo = now - 1000
    this.frames = this.frames.filter(time => time > oneSecondAgo)

    this.lastTime = now
  }

  getFPS() {
    return this.frames.length
  }

  reset() {
    this.frames = []
    this.lastTime = performance.now()
  }
}
