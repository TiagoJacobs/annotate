/**
 * Keyboard Shortcuts Hook
 * Handles all keyboard shortcuts and events
 */

import { useEffect } from 'react'

const ZOOM_STEP = 0.1

export const useKeyboardShortcuts = ({
  layerManagerRef,
  selectedShape,
  setSelectedShape,
  selectedShapeRef,
  deleteSelectedShape,
  updateLayersState,
  renderCanvas,
  zoomIn,
  zoomOut
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
          renderCanvas()
        }
        // Select All with Ctrl+A
        else if (e.key === 'a') {
          e.preventDefault()
          const allShapes = getAllShapes()
          if (allShapes.length > 0) {
            selectedShapeRef.current = allShapes
            setSelectedShape(allShapes)
            renderCanvas()
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
      // Move selected shapes with arrow keys
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedShape) {
          e.preventDefault()
          moveSelectedShapes(e.key, e.shiftKey)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [layerManagerRef, selectedShape, setSelectedShape, selectedShapeRef, deleteSelectedShape, updateLayersState, renderCanvas, zoomIn, zoomOut])
}
