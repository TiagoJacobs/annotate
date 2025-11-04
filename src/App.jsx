import { useState, useRef, useEffect } from 'react'
import { Copy, Trash2, Pen, Download, Square, Circle, ArrowRight, Type, Eye, EyeOff, X, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Home, MousePointer, Plus } from 'lucide-react'
import { CanvasManager } from './canvas/CanvasManager'
import { LayerManager } from './layers/LayerManager'
import { ToolHandler } from './tools/ToolHandler'
import { toolRegistry, getToolConfig } from './tools/toolRegistry'
import { SHAPE_ARRAY_MAP } from './config/shapeConfig'
import { ShapeRendererFactory } from './renderers/ShapeRenderer'
import { useCanvasRenderer } from './hooks/useCanvasRenderer'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

// Constants
const CANVAS_UPDATE_INTERVAL = 100
const SELECTION_PADDING = 5
const RESIZE_HANDLE_SIZE = 8
const DEFAULT_BRUSH_SIZE = 3
const DEFAULT_FONT_SIZE = 20
const ZOOM_STEP = 0.1
const MIN_ZOOM = 0.1
const MAX_ZOOM = 10
const GRID_SIZE = 50
const TEXT_PREVIEW_MAX_LENGTH = 30

function Annotate() {
  // Refs
  const canvasRef = useRef(null)
  const canvasManagerRef = useRef(null)
  const layerManagerRef = useRef(new LayerManager())
  const toolHandlerRef = useRef(null)
  const imageCache = useRef(new Map())
  const selectedShapeRef = useRef(null)
  const shapeRendererRef = useRef(null)

  // State
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [zoom, setZoom] = useState(1)
  const [editingTextLayerId, setEditingTextLayerId] = useState(null)
  const [editingTextContent, setEditingTextContent] = useState('')
  const [selectedShape, setSelectedShape] = useState(null) // { layerId, shapeType, shapeIndex }
  const [inlineEditingText, setInlineEditingText] = useState(null) // { layerId, textIndex, x, y, content }

  // ==================== Utility Functions (must be before hooks) ====================

  /**
   * Update layers state from layer manager
   */
  const updateLayersState = () => {
    setLayers([...layerManagerRef.current.getAllLayers()])
  }

  /**
   * Get tool properties for current tool
   */
  const getToolProperties = () => {
    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return {}

    const propertyValueMap = {
      color,
      size: brushSize,
      fontSize
    }

    const toolProperties = Object.entries(toolConfig.properties || {}).map(([key, config]) => [
      key,
      propertyValueMap[key] ?? config.default
    ])

    return {
      color,
      brushSize,
      fontSize,
      ...Object.fromEntries(toolProperties)
    }
  }

  /**
   * Get color from a layer
   */
  const getLayerColor = (layer) => {
    return layer?.color || '#000000'
  }

  /**
   * Update color for a layer
   */
  const updateLayerColor = (layerId, newColor) => {
    const layer = layerManagerRef.current.getLayer(layerId)
    if (!layer) return

    layer.color = newColor
    layerManagerRef.current.updateLayerWithHistory(layerId, { color: newColor })
    updateLayersState()
  }

  /**
   * Get size/fontSize from selected shape(s)
   */
  const getSelectedShapeSize = () => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape
    const layer = layerManagerRef.current.getLayer(shape.layerId)
    if (!layer) return null

    const { shapeType, shapeIndex } = shape
    const shapeArrayName = {
      stroke: 'strokes',
      arrow: 'arrows',
      rect: 'rects',
      ellipse: 'ellipses',
      text: 'texts'
    }[shapeType]

    if (!shapeArrayName || !layer[shapeArrayName]) return null

    const shapeData = layer[shapeArrayName][shapeIndex]
    if (!shapeData) return null

    // Return size or fontSize depending on shape type
    if (shapeType === 'text') {
      return { type: 'fontSize', value: shapeData.fontSize || 20 }
    } else {
      return { type: 'size', value: shapeData.size || 3 }
    }
  }

  /**
   * Update size/fontSize for selected shape(s)
   */
  const updateSelectedShapeSize = (newSize) => {
    if (!selectedShape) return

    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    const updatedLayers = new Set()

    for (const shape of shapes) {
      const layer = layerManagerRef.current.getLayer(shape.layerId)
      if (!layer) continue

      const { shapeType, shapeIndex } = shape
      const shapeArrayName = {
        stroke: 'strokes',
        arrow: 'arrows',
        rect: 'rects',
        ellipse: 'ellipses',
        text: 'texts'
      }[shapeType]

      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const shapeData = layer[shapeArrayName][shapeIndex]
      if (!shapeData) continue

      // Update size or fontSize depending on shape type
      if (shapeType === 'text') {
        shapeData.fontSize = newSize
      } else {
        shapeData.size = newSize
      }

      updatedLayers.add(layer.id)
    }

    // Update all affected layers and save to history
    for (const layerId of updatedLayers) {
      const layer = layerManagerRef.current.getLayer(layerId)
      if (layer) {
        layerManagerRef.current.updateLayerWithHistory(layerId, layer)
      }
    }

    updateLayersState()
    renderCanvas()
  }

  /**
   * Get preview text for text layers
   */
  const getLayerPreviewText = (layer) => {
    if (layer.texts?.length > 0) {
      const text = layer.texts[0].content
      return text.length > TEXT_PREVIEW_MAX_LENGTH ? text.substring(0, TEXT_PREVIEW_MAX_LENGTH) + '...' : text
    }
    return null
  }

  /**
   * Select a layer
   */
  const selectLayer = (layerId) => {
    // Select layer (no toggle behavior)
    layerManagerRef.current.selectLayer(layerId)
    setSelectedLayerId(layerId)
  }

  // ==================== Text Editing ====================

  const startEditingText = (layer) => {
    if (layer.texts?.length > 0) {
      setEditingTextLayerId(layer.id)
      setEditingTextContent(layer.texts[0].content)
    }
  }

  const saveTextEdit = () => {
    if (editingTextLayerId && editingTextContent.trim()) {
      const layer = layerManagerRef.current.getLayer(editingTextLayerId)
      if (layer?.texts) {
        layer.texts[0].content = editingTextContent
        layerManagerRef.current.updateLayerWithHistory(editingTextLayerId, { texts: layer.texts })
        updateLayersState()
      }
    }
    cancelTextEdit()
  }

  const cancelTextEdit = () => {
    setEditingTextLayerId(null)
    setEditingTextContent('')
  }

  const handleTextEditKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveTextEdit()
    } else if (e.key === 'Escape') {
      cancelTextEdit()
    }
  }

  const saveInlineTextEdit = () => {
    if (!inlineEditingText || !inlineEditingText.content.trim()) {
      setInlineEditingText(null)
      return
    }

    const layer = layerManagerRef.current.getLayer(inlineEditingText.layerId)
    if (!layer || !layer.texts?.[inlineEditingText.textIndex]) {
      setInlineEditingText(null)
      return
    }

    layer.texts[inlineEditingText.textIndex].content = inlineEditingText.content
    layerManagerRef.current.updateLayerWithHistory(inlineEditingText.layerId, { texts: layer.texts })
    updateLayersState()
    setInlineEditingText(null)
  }

  const cancelInlineTextEdit = () => {
    setInlineEditingText(null)
  }

  const handleInlineTextKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveInlineTextEdit()
    } else if (e.key === 'Escape') {
      cancelInlineTextEdit()
    }
  }


  // ==================== Zoom & View ====================

  const zoomIn = (amount = ZOOM_STEP) => {
    const newZoom = Math.min(MAX_ZOOM, zoom + amount)
    setZoom(newZoom)
    canvasManagerRef.current?.setZoom(newZoom)
  }

  const zoomOut = (amount = ZOOM_STEP) => {
    const newZoom = Math.max(MIN_ZOOM, zoom - amount)
    setZoom(newZoom)
    canvasManagerRef.current?.setZoom(newZoom)
  }

  const resetView = () => {
    setZoom(1)
    canvasManagerRef.current?.resetView()
  }

  // ==================== Export & Actions ====================

  const copyToClipboard = async () => {
    const canvas = canvasRef.current
    canvas.toBlob((blob) => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('Image copied to clipboard!')
    })
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'annotated-image.png'
    link.click()
  }

  const clearCanvas = () => {
    layerManagerRef.current.clear()
    setLayers([])
    setSelectedLayerId(null)
  }

  const addNewLayer = () => {
    const newLayer = layerManagerRef.current.createLayer('Layer', color)
    updateLayersState()
    setSelectedLayerId(newLayer.id)
  }

  const deleteSelectedLayer = () => {
    if (selectedLayerId) {
      layerManagerRef.current.deleteLayer(selectedLayerId)
      updateLayersState()
      setSelectedLayerId(layerManagerRef.current.selectedId)
    }
  }

  const toggleLayerVisibility = (layerId) => {
    layerManagerRef.current.toggleVisibility(layerId)
    updateLayersState()
  }

  const moveLayerInStack = (layerId, direction) => {
    layerManagerRef.current.moveLayer(layerId, direction)
    updateLayersState()
  }

  const removeShapeFromLayer = (layer, shapeType, shapeIndex) => {
    if (shapeType === 'image') {
      // Images are not in an array, just delete the property
      delete layer.image
      return
    }

    const arrayName = SHAPE_ARRAY_MAP[shapeType]
    if (arrayName && layer[arrayName]) {
      layer[arrayName].splice(shapeIndex, 1)
    }
  }

  const deleteSelectedShape = () => {
    if (!selectedShape) return

    // Handle multi-shape selection
    if (Array.isArray(selectedShape)) {
      // Sort by layer and index to delete from highest index first (to avoid index shifting)
      const sortedShapes = [...selectedShape].sort((a, b) => {
        if (a.layerId !== b.layerId) return 0
        return b.shapeIndex - a.shapeIndex
      })

      const updatedLayers = new Set()

      for (const shape of sortedShapes) {
        const layer = layerManagerRef.current.getLayer(shape.layerId)
        if (!layer) continue

        removeShapeFromLayer(layer, shape.shapeType, shape.shapeIndex)
        updatedLayers.add(layer.id)
      }

      // Update all affected layers and save to history
      for (const layerId of updatedLayers) {
        const layer = layerManagerRef.current.getLayer(layerId)
        if (layer) {
          layerManagerRef.current.updateLayerWithHistory(layerId, layer)
        }
      }
    } else {
      // Single shape deletion
      const layer = layerManagerRef.current.getLayer(selectedShape.layerId)
      if (layer) {
        removeShapeFromLayer(layer, selectedShape.shapeType, selectedShape.shapeIndex)
        layerManagerRef.current.updateLayerWithHistory(layer.id, layer)
      }
    }

    setSelectedShape(null)
    selectedShapeRef.current = null
    toolHandlerRef.current?.clearSelection()
    updateLayersState()
  }

  // ==================== Custom Hooks (called after all functions are defined) ====================

  // Use canvas renderer hook
  const { renderCanvas } = useCanvasRenderer(
    canvasManagerRef,
    layerManagerRef,
    toolHandlerRef,
    shapeRendererRef,
    selectedShapeRef
  )

  // Use canvas events hook
  const {
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleMouseWheel
  } = useCanvasEvents({
    tool,
    canvasManagerRef,
    toolHandlerRef,
    layerManagerRef,
    getToolProperties,
    selectedShapeRef,
    setSelectedShape,
    setInlineEditingText,
    updateLayersState,
    renderCanvas
  })

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    layerManagerRef,
    selectedShape,
    setSelectedShape,
    selectedShapeRef,
    deleteSelectedShape,
    updateLayersState,
    renderCanvas,
    zoomIn,
    zoomOut
  })

  // ==================== Effects ====================

  useEffect(() => {
    if (canvasRef.current && !canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager(canvasRef.current)
      toolHandlerRef.current = new ToolHandler(canvasManagerRef.current, layerManagerRef.current)
      shapeRendererRef.current = new ShapeRendererFactory(imageCache.current)

      // Set up image reload callback
      const imageRenderer = shapeRendererRef.current.getRenderer('image')
      if (imageRenderer) {
        imageRenderer.setOnImageLoaded(() => renderCanvas())
      }

      // Initialize canvas to match container size
      const container = canvasRef.current.parentElement
      const rect = container.getBoundingClientRect()
      canvasManagerRef.current.setDimensions(rect.width, rect.height)

      // Create initial default layer
      const defaultLayer = layerManagerRef.current.createLayer('Layer 1', '#000000')
      setSelectedLayerId(defaultLayer.id)
      updateLayersState()

      // Handle window resize
      const handleResize = () => {
        const rect = container.getBoundingClientRect()
        canvasManagerRef.current.setDimensions(rect.width, rect.height)
        renderCanvas()
      }
      window.addEventListener('resize', handleResize)

      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])



  useEffect(() => {
    const updateLayersFromManager = () => {
      updateLayersState()
      setSelectedLayerId(layerManagerRef.current.selectedId)
      renderCanvas()
    }

    const interval = setInterval(updateLayersFromManager, CANVAS_UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Keep ref in sync with state and re-render
  useEffect(() => {
    selectedShapeRef.current = selectedShape
    renderCanvas()
  }, [selectedShape])

  // Re-render canvas when zoom changes
  useEffect(() => {
    renderCanvas()
  }, [zoom])

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items || []
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          const reader = new FileReader()
          reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = img.width
              tempCanvas.height = img.height
              const tempCtx = tempCanvas.getContext('2d')
              tempCtx.drawImage(img, 0, 0)

              const imageLayer = layerManagerRef.current.createLayer('Image', '#808080', {
                image: {
                  data: tempCanvas.toDataURL(),
                  x: 0,
                  y: 0,
                  width: img.width,
                  height: img.height
                },
              })

              // Select the new image layer
              setSelectedLayerId(imageLayer.id)

              // Switch to selection tool
              setTool('select')

              updateLayersState()
            }
            img.src = event.target.result
          }
          reader.readAsDataURL(file)
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])


  // ==================== Render ====================

  const selectedLayer = selectedLayerId ? layerManagerRef.current.getLayer(selectedLayerId) : null
  const showFontSize = tool === 'text'

  const iconMap = {
    pen: <Pen size={20} />,
    'arrow-right': <ArrowRight size={20} />,
    square: <Square size={20} />,
    circle: <Circle size={20} />,
    type: <Type size={20} />,
    pointer: <MousePointer size={20} />,
  }

  // Determine status bar message based on current state
  const getStatusMessage = () => {
    if (selectedShape) {
      return '🎯 Shape selected | Delete: Del/Backspace | Undo: Ctrl+Z | Paste image to add as layer'
    }
    return '🎨 Undo: Ctrl+Z | Redo: Ctrl+Shift+Z | Paste image to add as layer'
  }

  return (
    <div className="annotate-container">
      <div className="annotate-main">
        <div className="annotate-toolbar">
          {/* Tools */}
          <div className="tool-group">
            {Object.values(toolRegistry).map((toolConfig) => (
              <button
                key={toolConfig.id}
                className={`tool-btn ${tool === toolConfig.id ? 'active' : ''}`}
                onClick={() => {
                  setTool(toolConfig.id)
                  setSelectedShape(null)
                  selectedShapeRef.current = null
                  if (toolHandlerRef.current) {
                    toolHandlerRef.current.clearSelection()
                  }
                }}
                title={toolConfig.name}
              >
                {iconMap[toolConfig.icon]}
              </button>
            ))}
          </div>

          {/* Color Picker */}
          {tool !== 'select' && (
            <div className="tool-group">
              <label>Color:</label>
              <input
                type="color"
                value={selectedLayer ? getLayerColor(selectedLayer) : color}
                onChange={(e) => {
                  if (selectedLayerId) {
                    updateLayerColor(selectedLayerId, e.target.value)
                  } else {
                    setColor(e.target.value)
                  }
                }}
                className="color-picker"
              />
            </div>
          )}

          {/* Size Control */}
          {(tool !== 'select' || selectedShape) && (
            <div className="tool-group">
              <label>
                {selectedShape
                  ? (getSelectedShapeSize()?.type === 'fontSize' ? 'Font Size:' : 'Line Weight:')
                  : (showFontSize ? 'Font Size:' : 'Line Weight:')
                }
              </label>
              <input
                type="range"
                min={selectedShape ? (getSelectedShapeSize()?.type === 'fontSize' ? '10' : '1') : (showFontSize ? '10' : '1')}
                max={selectedShape ? (getSelectedShapeSize()?.type === 'fontSize' ? '100' : '50') : (showFontSize ? '100' : '50')}
                value={selectedShape ? (getSelectedShapeSize()?.value || 3) : (showFontSize ? fontSize : brushSize)}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value)
                  if (selectedShape) {
                    updateSelectedShapeSize(newValue)
                  } else {
                    if (showFontSize) {
                      setFontSize(newValue)
                    } else {
                      setBrushSize(newValue)
                    }
                  }
                }}
                className="size-slider"
              />
              <span className="size-display">
                {selectedShape
                  ? (getSelectedShapeSize()?.value || 3)
                  : (showFontSize ? fontSize : brushSize)
                }px
              </span>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="tool-group">
            <button className="action-btn" onClick={() => zoomIn()} title="Zoom in (Ctrl++)">
              <ZoomIn size={18} />
            </button>
            <button className="action-btn" onClick={() => zoomOut()} title="Zoom out (Ctrl+-)">
              <ZoomOut size={18} />
            </button>
            <button className="action-btn" onClick={resetView} title="Reset view">
              <Home size={18} />
            </button>
            <span className="zoom-display">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Export & Canvas Actions */}
          <div className="tool-group">
            <button className="action-btn copy-btn" onClick={copyToClipboard} title="Copy to clipboard">
              <Copy size={18} />
              Copy
            </button>
            <button className="action-btn download-btn" onClick={downloadImage} title="Download image">
              <Download size={18} />
              Download
            </button>
          </div>
        </div>

        <div className="annotate-content">
          {/* Canvas */}
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={(e) => handleMouseWheel(e, zoomIn)}
              className={`drawing-canvas ${layers.length > 0 ? 'has-image' : ''}`}
            />

            {/* Inline Text Editor */}
            {inlineEditingText && (
              <input
                type="text"
                value={inlineEditingText.content}
                onChange={(e) => setInlineEditingText({ ...inlineEditingText, content: e.target.value })}
                onKeyDown={handleInlineTextKeyPress}
                onBlur={saveInlineTextEdit}
                autoFocus
                style={{
                  position: 'absolute',
                  left: `${inlineEditingText.x}px`,
                  top: `${inlineEditingText.y}px`,
                  fontSize: `${inlineEditingText.fontSize * zoom}px`,
                  fontFamily: 'Arial',
                  border: '2px solid #667eea',
                  outline: 'none',
                  padding: '2px 4px',
                  minWidth: '100px',
                  zIndex: 1000,
                }}
              />
            )}
          </div>

          {/* Layers Panel */}
          <div className="layers-panel">
            <div className="layers-panel-header">
              <h3>Layers ({layers.length})</h3>
              <button className="layer-btn" onClick={addNewLayer} title="Add new layer">
                <Plus size={16} />
              </button>
              {layers.length > 0 && (
                <button className="layer-btn layer-btn-delete" onClick={clearCanvas} title="Clear all layers">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="layers-list">
              {layers.length === 0 ? (
                <div className="no-layers">No layers yet</div>
              ) : (
                <>
                  {[...layers].reverse().map((layer, displayIndex) => {
                    const actualIndex = layers.length - 1 - displayIndex
                    const previewText = getLayerPreviewText(layer)
                    const isEditingThis = editingTextLayerId === layer.id

                    return (
                      <div
                        key={layer.id}
                        className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
                        onClick={() => selectLayer(layer.id)}
                        onDoubleClick={() => {
                          if (layer.texts?.length > 0) {
                            startEditingText(layer)
                          }
                        }}
                      >
                      {isEditingThis ? (
                        <div className="layer-text-edit" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTextContent}
                            onChange={(e) => setEditingTextContent(e.target.value)}
                            onKeyPress={handleTextEditKeyPress}
                            onBlur={saveTextEdit}
                            autoFocus
                            className="layer-text-input"
                          />
                        </div>
                      ) : (
                        <div className="layer-content">
                          <div className="layer-color-swatch" style={{ backgroundColor: getLayerColor(layer) }} />
                          <button
                            className="layer-visibility"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLayerVisibility(layer.id)
                            }}
                          >
                            {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <div className="layer-info">
                            <span className="layer-name">
                              {layer.name} {actualIndex + 1}
                            </span>
                            {previewText && <span className="layer-text-preview">{previewText}</span>}
                          </div>
                        </div>
                      )}
                      <div className="layer-actions">
                        <button
                          className="layer-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerInStack(layer.id, 'up')
                          }}
                          disabled={actualIndex === 0}
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          className="layer-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerInStack(layer.id, 'down')
                          }}
                          disabled={actualIndex === layers.length - 1}
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          className="layer-btn layer-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            layerManagerRef.current.deleteLayer(layer.id)
                            updateLayersState()
                            setSelectedLayerId(layerManagerRef.current.selectedId)
                          }}
                          title="Delete layer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <p>{getStatusMessage()}</p>
      </div>
    </div>
  )
}

export default Annotate
