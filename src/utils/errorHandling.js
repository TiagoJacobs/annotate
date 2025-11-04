/**
 * Error Handling Utilities
 * Centralized error handling and recovery strategies
 */

/**
 * Custom Error Classes
 */

class AnnotateError extends Error {
  constructor(message, code, context = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    this.timestamp = new Date()
  }
}

class ValidationError extends AnnotateError {
  constructor(message, context) {
    super(message, 'VALIDATION_ERROR', context)
  }
}

class RenderError extends AnnotateError {
  constructor(message, context) {
    super(message, 'RENDER_ERROR', context)
  }
}

class LayerError extends AnnotateError {
  constructor(message, context) {
    super(message, 'LAYER_ERROR', context)
  }
}

class ShapeError extends AnnotateError {
  constructor(message, context) {
    super(message, 'SHAPE_ERROR', context)
  }
}

class ToolError extends AnnotateError {
  constructor(message, context) {
    super(message, 'TOOL_ERROR', context)
  }
}

/**
 * Error handler function with recovery strategies
 */
export const handleError = (error, context = {}) => {
  // Log error with context
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    code: error.code,
    context: { ...context, ...error.context },
    stack: error.stack
  })

  // Return user-friendly message
  return getUserFriendlyMessage(error)
}

/**
 * Get user-friendly error message
 */
const getUserFriendlyMessage = (error) => {
  const messages = {
    VALIDATION_ERROR: 'Invalid data provided. Please check your input.',
    RENDER_ERROR: 'Failed to render canvas. Please try refreshing.',
    LAYER_ERROR: 'Layer operation failed. Please try again.',
    SHAPE_ERROR: 'Shape operation failed. Please try again.',
    TOOL_ERROR: 'Tool operation failed. Please select a different tool.',
    DEFAULT: 'An unexpected error occurred. Please try again.'
  }

  return messages[error.code] || messages.DEFAULT
}

/**
 * Safe execution wrapper with error handling
 */
export const safeExecute = (fn, fallback = null, context = {}) => {
  try {
    return fn()
  } catch (error) {
    handleError(error, context)
    return fallback
  }
}

/**
 * Async safe execution wrapper
 */
export const safeExecuteAsync = async (fn, fallback = null, context = {}) => {
  try {
    return await fn()
  } catch (error) {
    handleError(error, context)
    return fallback
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export const retry = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  throw lastError
}

/**
 * Guard clauses helper
 */
export const guard = (condition, errorClass, message, context = {}) => {
  if (!condition) {
    throw new errorClass(message, context)
  }
}

/**
 * Assert helper
 */
export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

/**
 * Error recovery strategies
 */
export const RecoveryStrategies = {
  /**
   * Retry the operation
   */
  RETRY: 'retry',

  /**
   * Use fallback value
   */
  FALLBACK: 'fallback',

  /**
   * Skip and continue
   */
  SKIP: 'skip',

  /**
   * Notify user and halt
   */
  HALT: 'halt'
}

/**
 * Create error boundary for React components
 */
export const createErrorBoundary = (component, fallback, onError) => {
  return class ErrorBoundary extends component.constructor {
    constructor(props) {
      super(props)
      this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
      handleError(error, { errorInfo })
      if (onError) {
        onError(error, errorInfo)
      }
    }

    render() {
      if (this.state.hasError) {
        return fallback
      }

      return this.props.children
    }
  }
}

// Export custom error classes
export {
  AnnotateError,
  ValidationError,
  RenderError,
  LayerError,
  ShapeError,
  ToolError
}
