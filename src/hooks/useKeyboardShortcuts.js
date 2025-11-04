/**
 * Keyboard Shortcuts Hook
 * Handles all keyboard shortcuts and events
 */

import { useEffect } from 'react'

const ZOOM_STEP = 0.1

export const useKeyboardShortcuts = ({
  layerManagerRef,
  selectedShape,
  deleteSelectedShape,
  updateLayersState,
  zoomIn,
  zoomOut
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo/Redo with Ctrl+Z / Ctrl+Shift+Z
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            layerManagerRef.current?.redo()
          } else {
            layerManagerRef.current?.undo()
          }
          updateLayersState()
        }
      }
      // Delete selected shape with Delete/Backspace
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShape) {
          e.preventDefault()
          deleteSelectedShape()
        }
      }
      // Zoom in with +/=
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn(ZOOM_STEP)
      }
      // Zoom out with -
      else if (e.key === '-') {
        e.preventDefault()
        zoomOut(ZOOM_STEP)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [layerManagerRef, selectedShape, deleteSelectedShape, updateLayersState, zoomIn, zoomOut])
}
