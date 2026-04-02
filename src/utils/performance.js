/**
 * Performance Optimization Utilities
 * Debounce, throttle, and other performance helpers
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
