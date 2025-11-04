/**
 * Local Storage Utilities
 * Handles persistence of tool properties and preferences
 */

const STORAGE_KEY_PREFIX = 'annotate_'

const TOOL_PROPERTIES = {
  color: 'color',
  brushSize: 'brushSize',
  fontSize: 'fontSize',
  lineStyle: 'lineStyle',
  tool: 'tool'
}

/**
 * Get all stored tool properties
 */
export const getStoredToolProperties = () => {
  try {
    const stored = {
      color: localStorage.getItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES.color}`) || '#000000',
      brushSize: parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES.brushSize}`)) || 3,
      fontSize: parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES.fontSize}`)) || 20,
      lineStyle: localStorage.getItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES.lineStyle}`) || 'solid',
      tool: localStorage.getItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES.tool}`) || 'pen'
    }
    return stored
  } catch (error) {
    console.error('Error retrieving tool properties from storage:', error)
    return {
      color: '#000000',
      brushSize: 3,
      fontSize: 20,
      lineStyle: 'solid',
      tool: 'pen'
    }
  }
}

/**
 * Save a single tool property
 */
export const saveToolProperty = (property, value) => {
  try {
    if (!TOOL_PROPERTIES[property]) {
      console.warn(`Unknown tool property: ${property}`)
      return
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES[property]}`, value)
  } catch (error) {
    console.error(`Error saving tool property ${property}:`, error)
  }
}

/**
 * Save multiple tool properties at once
 */
export const saveToolProperties = (properties) => {
  try {
    Object.entries(properties).forEach(([key, value]) => {
      if (TOOL_PROPERTIES[key]) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${TOOL_PROPERTIES[key]}`, value)
      }
    })
  } catch (error) {
    console.error('Error saving tool properties:', error)
  }
}

/**
 * Clear all stored tool properties
 */
export const clearToolProperties = () => {
  try {
    Object.values(TOOL_PROPERTIES).forEach((property) => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${property}`)
    })
  } catch (error) {
    console.error('Error clearing tool properties:', error)
  }
}
