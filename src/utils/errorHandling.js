/**
 * Error Handling Utilities
 * Centralized error handling and recovery strategies
 */

/**
 * Error handler function
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
