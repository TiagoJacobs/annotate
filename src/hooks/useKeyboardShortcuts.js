/**
 * Keyboard Shortcuts Hook
 * Handles all keyboard shortcuts and events
 */

import { useEffect } from 'react'
import { serializeShapesToClipboard, deserializeShapesFromClipboard, pasteShapesIntoLayer, clipboardStateManager, calculateIncrementalOffset } from '../utils/shapeClipboard'

const ZOOM_STEP = 0.1
const CLIPBOARD_KEY = 'annotate-shapes-clipboard'

export const useKeyboardShortcuts = ({
  layerManagerRef,
  selectedShape,
  setSelectedShape,
  selectedShapeRef,
  deleteSelectedShape,
  updateLayersState,
  renderCanvas,
  zoomIn,
  zoomOut,
  panCanvas,
  setTool,
  tool,
  colorPickerRef,
  sizeSliderRef,
  lineStyleSelectRef,
  setShowKeyboardShortcuts,
  toolHandlerRef
}) => {
  /**
   * Get all shapes from all visible layers
   */
  const getAllShapes = () => {
    const allShapes = []
    const layers = layerManagerRef.current?.getAllLayers() || []

    for (const layer of layers) {
      if (!layer.visible) continue

      // Add image if exists
      if (layer.image) {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'image',
          shapeIndex: 0
        })
      }

      // Add all strokes
      layer.strokes?.forEach((_, index) => {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'stroke',
          shapeIndex: index
        })
      })

      // Add all arrows
      layer.arrows?.forEach((_, index) => {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'arrow',
          shapeIndex: index
        })
      })

      // Add all rects
      layer.rects?.forEach((_, index) => {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'rect',
          shapeIndex: index
        })
      })

      // Add all ellipses
      layer.ellipses?.forEach((_, index) => {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'ellipse',
          shapeIndex: index
        })
      })

      // Add all texts
      layer.texts?.forEach((_, index) => {
        allShapes.push({
          layerId: layer.id,
          shapeType: 'text',
          shapeIndex: index
        })
      })
    }

    return allShapes
  }

  /**
   * Move selected shapes by arrow keys
   */
  const moveSelectedShapes = (arrowKey, shiftHeld) => {
    const shapes = Array.isArray(selectedShapeRef.current)
      ? selectedShapeRef.current
      : [selectedShapeRef.current]

    // Movement amount: 1px normally, 10px with Shift
    const step = shiftHeld ? 10 : 1

    // Calculate delta based on arrow key
    let dx = 0
    let dy = 0

    switch (arrowKey) {
      case 'ArrowUp':
        dy = -step
        break
      case 'ArrowDown':
        dy = step
        break
      case 'ArrowLeft':
        dx = -step
        break
      case 'ArrowRight':
        dx = step
        break
    }

    // Move all selected shapes
    const updatedLayers = new Set()

    for (const shape of shapes) {
      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (!layer) continue

      const { shapeType, shapeIndex } = shape

      // Move the shape based on its type
      if (shapeType === 'stroke') {
        layer.strokes[shapeIndex].points = layer.strokes[shapeIndex].points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }))
      } else if (shapeType === 'arrow') {
        layer.arrows[shapeIndex].fromX += dx
        layer.arrows[shapeIndex].fromY += dy
        layer.arrows[shapeIndex].toX += dx
        layer.arrows[shapeIndex].toY += dy
      } else if (shapeType === 'rect') {
        layer.rects[shapeIndex].x += dx
        layer.rects[shapeIndex].y += dy
      } else if (shapeType === 'ellipse') {
        layer.ellipses[shapeIndex].x += dx
        layer.ellipses[shapeIndex].y += dy
      } else if (shapeType === 'text') {
        layer.texts[shapeIndex].x += dx
        layer.texts[shapeIndex].y += dy
      } else if (shapeType === 'image') {
        // Images are stored as layer.image (not in an array)
        if (layer.image && typeof layer.image === 'object') {
          layer.image.x = (layer.image.x || 0) + dx
          layer.image.y = (layer.image.y || 0) + dy
        }
      }

      updatedLayers.add(layer.id)
    }

    // Update all affected layers and save to history
    for (const layerId of updatedLayers) {
      const layer = layerManagerRef.current?.getLayer(layerId)
      if (layer) {
        layerManagerRef.current?.updateLayerWithHistory(layerId, layer)
      }
    }

    updateLayersState()
    renderCanvas()
  }

  /**
   * Tool ID mapping for keyboard shortcuts
   */
  const toolKeyMap = {
    '1': 'pen',
    '2': 'arrow',
    '3': 'rect',
    '4': 'ellipse',
    '5': 'text',
    '6': 'select',
    '7': 'pan'
  }

  /**
   * Check if user is typing in an input field
   * Excludes hidden paste div which should not block keyboard shortcuts
   */
  const isInputFocused = () => {
    const activeElement = document.activeElement

    // Check if it's the hidden paste contenteditable div (which is position:fixed off-screen)
    if (activeElement?.contentEditable === 'true') {
      // Check if it's the hidden paste div by checking its style
      const style = window.getComputedStyle(activeElement)
      if (style.left === '-9999px' && style.position === 'fixed') {
        return false // Don't block shortcuts for hidden paste div
      }
    }

    return (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip keyboard shortcuts if user is typing in an input
      if (isInputFocused()) return

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
          renderCanvas()
        }
        // Select All with Ctrl+A
        else if (e.key === 'a') {
          e.preventDefault()
          const allShapes = getAllShapes()
          if (allShapes.length > 0) {
            selectedShapeRef.current = allShapes
            setSelectedShape(allShapes)
            // Also update the ToolHandler's internal state to recognize multi-shape selection
            if (toolHandlerRef.current) {
              toolHandlerRef.current.selectedShape = null
              toolHandlerRef.current.selectedShapes = allShapes
              toolHandlerRef.current.isDragging = false
              toolHandlerRef.current.isResizing = false
              toolHandlerRef.current.resizeHandle = null
            }
            // Switch to select tool so user can drag the selection
            setTool('select')
            renderCanvas()
          }
        }
        // Copy with Ctrl+C
        else if (e.key === 'c') {
          e.preventDefault()
          if (selectedShape) {
            const clipboard = serializeShapesToClipboard(selectedShape, layerManagerRef.current)
            if (clipboard) {
              localStorage.setItem(CLIPBOARD_KEY, clipboard)
              clipboardStateManager.reset()
            }
          }
        }
        // Paste with Ctrl+V
        else if (e.key === 'v') {
          e.preventDefault()
          const clipboard = localStorage.getItem(CLIPBOARD_KEY)
          if (clipboard) {
            clipboardStateManager.updateContent(clipboard)
            const shapes = deserializeShapesFromClipboard(clipboard)

            if (shapes && shapes.length > 0) {
              const selectedLayer = layerManagerRef.current?.getSelectedLayer()
              if (selectedLayer) {
                // Get incremental offset for this paste
                const { offsetX, offsetY } = calculateIncrementalOffset()
                const pastedShapes = pasteShapesIntoLayer(selectedLayer, shapes, offsetX, offsetY, layerManagerRef.current)

                if (pastedShapes.length > 0) {
                  layerManagerRef.current?.updateLayerWithHistory(selectedLayer.id, selectedLayer)
                  selectedShapeRef.current = pastedShapes
                  setSelectedShape(pastedShapes)
                  updateLayersState()
                  renderCanvas()
                }
              }
            }
          }
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
      // Move selected shapes or pan canvas with arrow keys
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        if (selectedShape) {
          // Move selected shapes if any are selected
          moveSelectedShapes(e.key, e.shiftKey)
        } else {
          // Pan canvas if no shapes are selected
          const panAmount = e.shiftKey ? 50 : 20
          switch (e.key) {
            case 'ArrowUp':
              panCanvas(0, panAmount)
              break
            case 'ArrowDown':
              panCanvas(0, -panAmount)
              break
            case 'ArrowLeft':
              panCanvas(panAmount, 0)
              break
            case 'ArrowRight':
              panCanvas(-panAmount, 0)
              break
          }
        }
      }
      // C key for color picker
      else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        colorPickerRef.current?.focus()
        colorPickerRef.current?.click()
      }
      // W key for line weight (size slider)
      else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        sizeSliderRef.current?.focus()
      }
      // S key for line style
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        lineStyleSelectRef.current?.focus()
      }
      // K key for keyboard shortcuts help
      else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      // Number key shortcuts for tool selection (1-7)
      else if (toolKeyMap[e.key]) {
        e.preventDefault()
        setTool(toolKeyMap[e.key])
      }
      // ESC key handling
      else if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedShape) {
          // If shapes are selected, clear the selection
          setSelectedShape(null)
          selectedShapeRef.current = null
          renderCanvas()
        } else if (tool !== 'select') {
          // If no shapes are selected and not in select tool, switch to select tool
          setTool('select')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [layerManagerRef, selectedShape, setSelectedShape, selectedShapeRef, deleteSelectedShape, updateLayersState, renderCanvas, zoomIn, zoomOut, panCanvas, setTool, tool, colorPickerRef, sizeSliderRef, lineStyleSelectRef, setShowKeyboardShortcuts])
}
