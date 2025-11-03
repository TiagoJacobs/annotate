/**
 * App Initializer
 * Handles app initialization and context setup
 */

import { useRef } from 'react'
import { CanvasManager } from '../canvas/CanvasManager'
import { LayerManager } from '../layers/LayerManager'
import { ToolHandler } from '../tools/ToolHandler'

/**
 * Initialize and manage app managers
 */
export const useAppManagers = (canvasRef) => {
  const canvasManagerRef = useRef(null)
  const layerManagerRef = useRef(new LayerManager())
  const toolHandlerRef = useRef(null)

  // Initialize managers on first render
  if (canvasRef.current && !canvasManagerRef.current) {
    canvasManagerRef.current = new CanvasManager(canvasRef.current)
    toolHandlerRef.current = new ToolHandler(canvasManagerRef.current, layerManagerRef.current)
  }

  return {
    canvasManagerRef,
    layerManagerRef,
    toolHandlerRef,
  }
}

/**
 * App state shape
 */
export const APP_STATE_SHAPE = {
  tool: 'pen',
  color: '#000000',
  brushSize: 3,
  fontSize: 20,
  zoom: 1,
  layers: [],
  selectedLayerId: null,
  editingTextLayerId: null,
  editingTextContent: '',
}
