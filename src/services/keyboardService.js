/**
 * Keyboard Service
 * Handles keyboard shortcuts and their descriptions
 */

export const KEYBOARD_SHORTCUTS = {
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Shift+Z',
  ZOOM_IN: 'Ctrl++',
  ZOOM_OUT: 'Ctrl+-',
}

export const getShortcutHandler = (key, modifiers, handlers) => {
  const isCtrlOrMeta = modifiers.ctrlKey || modifiers.metaKey

  if (isCtrlOrMeta && key === 'z') {
    return modifiers.shiftKey ? handlers.redo : handlers.undo
  }

  if (key === '+' || key === '=') {
    return handlers.zoomIn
  }

  if (key === '-') {
    return handlers.zoomOut
  }

  return null
}
