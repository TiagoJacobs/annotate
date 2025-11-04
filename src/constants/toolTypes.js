/**
 * Type-safe Tool Constants
 * Prevents typos and provides autocompletion
 */

/**
 * Tool types enum
 */
export const TOOL_TYPES = {
  PEN: 'pen',
  ARROW: 'arrow-right',
  RECT: 'square',
  CIRCLE: 'circle',
  TEXT: 'type',
  SELECT: 'pointer'
}

/**
 * Tool handler event types
 */
export const TOOL_HANDLER_EVENTS = {
  START_FREEHAND: 'startFreehandStroke',
  CONTINUE_FREEHAND: 'continueFreehandStroke',
  FINISH_FREEHAND: 'finishFreehandStroke',
  START_SHAPE: 'startShape',
  PREVIEW_SHAPE: 'previewShape',
  FINISH_SHAPE: 'finishShape',
  SELECT_OBJECT: 'selectObject',
  DRAG_OBJECT: 'dragObject',
  RELEASE_OBJECT: 'releaseObject'
}

/**
 * Mouse button constants
 */
export const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
  NONE: -1
}

/**
 * Keyboard key constants
 */
export const KEY_CODES = {
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SHIFT: 'Shift',
  CONTROL: 'Control',
  META: 'Meta',
  Z: 'z',
  Y: 'y',
  PLUS: '+',
  EQUALS: '=',
  MINUS: '-'
}

/**
 * Modifier key combinations
 */
export const MODIFIERS = {
  NONE: 0,
  CTRL: 1,
  SHIFT: 2,
  ALT: 4,
  CTRL_SHIFT: 3
}

/**
 * Check if modifier key is pressed
 */
export const hasModifier = (event, modifier) => {
  switch (modifier) {
    case MODIFIERS.CTRL:
      return event.ctrlKey || event.metaKey
    case MODIFIERS.SHIFT:
      return event.shiftKey
    case MODIFIERS.ALT:
      return event.altKey
    case MODIFIERS.CTRL_SHIFT:
      return (event.ctrlKey || event.metaKey) && event.shiftKey
    default:
      return false
  }
}

/**
 * Layer action types
 */
export const LAYER_ACTIONS = {
  CREATE: 'create',
  DELETE: 'delete',
  UPDATE: 'update',
  MOVE_UP: 'up',
  MOVE_DOWN: 'down',
  TOGGLE_VISIBILITY: 'toggleVisibility',
  TOGGLE_LOCK: 'toggleLock',
  RENAME: 'rename',
  CLEAR_ALL: 'clearAll'
}

/**
 * Canvas action types
 */
export const CANVAS_ACTIONS = {
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut',
  RESET_VIEW: 'resetView',
  COPY: 'copy',
  DOWNLOAD: 'download',
  CLEAR: 'clear',
  UNDO: 'undo',
  REDO: 'redo'
}

/**
 * Get tool type by id
 */
export const getToolType = (toolId) => {
  return Object.values(TOOL_TYPES).find(type => type === toolId) || null
}

/**
 * Check if tool id is valid
 */
export const isValidToolType = (toolId) => {
  return Object.values(TOOL_TYPES).includes(toolId)
}
