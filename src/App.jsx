import { useState, useRef, useEffect } from 'react'
import { Copy, Trash2, Pen, Download, Square, Circle, ArrowRight, Type, Eye, EyeOff, X, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Home, MousePointer, Plus, Hand } from 'lucide-react'
import { CanvasManager } from './canvas/CanvasManager'
import { LayerManager } from './layers/LayerManager'
import { ToolHandler } from './tools/ToolHandler'
import { toolRegistry, getToolConfig } from './tools/toolRegistry'
import { SHAPE_ARRAY_MAP } from './config/shapeConfig'
import { ShapeRendererFactory } from './renderers/ShapeRenderer'
import { useCanvasRenderer } from './hooks/useCanvasRenderer'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { getStoredToolProperties, saveToolProperty } from './utils/storageUtils'
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

function Annotate() {
  // Refs
  const canvasRef = useRef(null)
  const canvasManagerRef = useRef(null)
  const layerManagerRef = useRef(new LayerManager())
  const toolHandlerRef = useRef(null)
  const imageCache = useRef(new Map())
  const selectedShapeRef = useRef(null)
  const shapeRendererRef = useRef(null)

  // Load stored properties
  const storedProperties = getStoredToolProperties()

  // State
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [tool, setTool] = useState(storedProperties.tool)
  const [color, setColor] = useState(storedProperties.color)
  const [brushSize, setBrushSize] = useState(storedProperties.brushSize)
  const [fontSize, setFontSize] = useState(storedProperties.fontSize)
  const [lineStyle, setLineStyle] = useState(storedProperties.lineStyle)
  const [zoom, setZoom] = useState(1)
  const [selectedShape, setSelectedShape] = useState(null) // { layerId, shapeType, shapeIndex }
  const [inlineEditingText, setInlineEditingText] = useState(null) // { layerId, textIndex, x, y, content }
  const [renamingLayerId, setRenamingLayerId] = useState(null)
  const [renamingLayerName, setRenamingLayerName] = useState('')
  const [downloadFormat, setDownloadFormat] = useState('png') // 'png' or 'svg'

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
      fontSize,
      lineStyle
    }

    const toolProperties = Object.entries(toolConfig.properties || {}).map(([key, config]) => [
      key,
      propertyValueMap[key] ?? config.default
    ])

    const props = {
      color,
      brushSize,
      fontSize,
      lineStyle,
      size: brushSize,
      ...Object.fromEntries(toolProperties)
    }

    return props
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
   * Get color from selected shape
   */
  const getSelectedShapeColor = () => {
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
    return shapeData?.color || '#000000'
  }

  /**
   * Update color for selected shape(s)
   */
  const updateSelectedShapeColor = (newColor) => {
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
      if (shapeData) {
        shapeData.color = newColor
        updatedLayers.add(layer.id)
      }
    }

    // Update all affected layers with history
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
   * Get lineStyle from selected shape
   */
  const getSelectedShapeLineStyle = () => {
    if (!selectedShape) return null

    const shape = Array.isArray(selectedShape) ? selectedShape[0] : selectedShape
    const layer = layerManagerRef.current.getLayer(shape.layerId)
    if (!layer) return null

    const { shapeType, shapeIndex } = shape

    // Text shapes don't support lineStyle
    if (shapeType === 'text') return null

    const shapeArrayName = {
      stroke: 'strokes',
      arrow: 'arrows',
      rect: 'rects',
      ellipse: 'ellipses'
    }[shapeType]

    if (!shapeArrayName || !layer[shapeArrayName]) return null

    const shapeData = layer[shapeArrayName][shapeIndex]
    return shapeData?.lineStyle || 'solid'
  }

  /**
   * Update lineStyle for selected shape(s)
   */
  const updateSelectedShapeLineStyle = (newLineStyle) => {
    if (!selectedShape) return

    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    const updatedLayers = new Set()

    for (const shape of shapes) {
      const layer = layerManagerRef.current.getLayer(shape.layerId)
      if (!layer) continue

      const { shapeType, shapeIndex } = shape

      // Text shapes don't support lineStyle
      if (shapeType === 'text') continue

      const shapeArrayName = {
        stroke: 'strokes',
        arrow: 'arrows',
        rect: 'rects',
        ellipse: 'ellipses'
      }[shapeType]

      if (!shapeArrayName || !layer[shapeArrayName]) continue

      const shapeData = layer[shapeArrayName][shapeIndex]
      if (shapeData) {
        shapeData.lineStyle = newLineStyle
        updatedLayers.add(layer.id)
      }
    }

    // Update all affected layers with history
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
   * Select a layer
   */
  const selectLayer = (layerId) => {
    // Select layer (no toggle behavior)
    layerManagerRef.current.selectLayer(layerId)
    setSelectedLayerId(layerId)
  }

  /**
   * Start renaming a layer
   */
  const startRenamingLayer = (layer) => {
    setRenamingLayerId(layer.id)
    setRenamingLayerName(layer.name)
  }

  /**
   * Save layer name change
   */
  const saveLayerRename = () => {
    if (renamingLayerId && renamingLayerName.trim()) {
      const layer = layerManagerRef.current.getLayer(renamingLayerId)
      if (layer) {
        layer.name = renamingLayerName.trim()
        layerManagerRef.current.updateLayerWithHistory(renamingLayerId, { name: layer.name })
        updateLayersState()
      }
    }
    setRenamingLayerId(null)
    setRenamingLayerName('')
  }

  /**
   * Cancel layer rename
   */
  const cancelLayerRename = () => {
    setRenamingLayerId(null)
    setRenamingLayerName('')
  }

  /**
   * Handle key press for layer rename
   */
  const handleLayerRenameKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveLayerRename()
    } else if (e.key === 'Escape') {
      cancelLayerRename()
    }
  }

  // ==================== Text Editing (Inline) ====================

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
    if (downloadFormat === 'svg') {
      downloadSVG()
    } else {
      downloadPNG()
    }
  }

  const downloadPNG = () => {
    // Render canvas without selection UI
    renderCanvasForExport()

    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'annotated-image.png'
    link.click()

    // Restore normal rendering with selection UI
    renderCanvas()
  }

  const downloadSVG = () => {
    // Render canvas without selection UI
    renderCanvasForExport()

    const canvas = canvasRef.current
    const width = canvas.width
    const height = canvas.height

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    // Draw white background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', width)
    rect.setAttribute('height', height)
    rect.setAttribute('fill', 'white')
    svg.appendChild(rect)

    // Convert canvas to image and embed in SVG
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    image.setAttribute('width', width)
    image.setAttribute('height', height)
    image.setAttribute('href', canvas.toDataURL('image/png'))
    svg.appendChild(image)

    // Create blob and download
    const svgString = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'annotated-image.svg'
    link.click()
    URL.revokeObjectURL(url)

    // Restore normal rendering with selection UI
    renderCanvas()
  }

  const clearCanvas = () => {
    layerManagerRef.current.clear()
    setLayers([])
    setSelectedLayerId(null)
  }

  const addNewLayer = () => {
    const newLayer = layerManagerRef.current.createLayer('Layer')
    updateLayersState()
    setSelectedLayerId(newLayer.id)
  }

  const deleteSelectedLayer = () => {
    if (selectedLayerId) {
      // Don't allow deleting the last layer
      if (layerManagerRef.current.getAllLayers().length <= 1) {
        return
      }
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
  const { renderCanvas, renderCanvasForExport } = useCanvasRenderer(
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
      const defaultLayer = layerManagerRef.current.createLayer('Layer 1')
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

  // Save tool properties to localStorage
  useEffect(() => {
    saveToolProperty('tool', tool)
  }, [tool])

  useEffect(() => {
    saveToolProperty('color', color)
  }, [color])

  useEffect(() => {
    saveToolProperty('brushSize', brushSize)
  }, [brushSize])

  useEffect(() => {
    saveToolProperty('fontSize', fontSize)
  }, [fontSize])

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

              // Store image at full original resolution
              // The canvas zoom will handle scaling the display at different zoom levels
              // At zoom 100%, the image will display at its actual pixel size
              const imageLayer = layerManagerRef.current.createLayer('Image', {
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
    hand: <Hand size={20} />,
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
            <div className="download-group">
              <button className="action-btn download-btn" onClick={downloadImage} title="Download image">
                <Download size={18} />
                Download
              </button>
              <select
                className="download-format-select"
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value)}
                title="Select download format"
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>
        </div>

        {/* Options Toolbar - always visible but empty when no tool/shape is active */}
        <div className="shape-toolbar">
          {(tool !== 'select' || selectedShape) && (
            <>
              {/* Color Picker */}
              <div className="tool-group">
                <label>Color:</label>
                <input
                  type="color"
                  value={selectedShape ? (getSelectedShapeColor() || color) : color}
                  onChange={(e) => {
                    if (selectedShape) {
                      updateSelectedShapeColor(e.target.value)
                    } else {
                      setColor(e.target.value)
                    }
                  }}
                  className="color-picker"
                />
              </div>

              {/* Size Control */}
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

              {/* Line Style Control */}
              {(selectedShape ? getSelectedShapeLineStyle() !== null : true) && (
                <div className="tool-group">
                  <label>Line Style:</label>
                  <select
                    value={selectedShape ? (getSelectedShapeLineStyle() || 'solid') : lineStyle}
                    onChange={(e) => {
                      if (selectedShape) {
                        updateSelectedShapeLineStyle(e.target.value)
                      } else {
                        setLineStyle(e.target.value)
                        saveToolProperty('lineStyle', e.target.value)
                      }
                    }}
                    className="line-style-select"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="dashdot">Dash-Dot</option>
                  </select>
                </div>
              )}
            </>
          )}
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
                    const isRenaming = renamingLayerId === layer.id

                    return (
                      <div
                        key={layer.id}
                        className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
                        onClick={() => selectLayer(layer.id)}
                      >
                        <div className="layer-content">
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
                            {isRenaming ? (
                              <input
                                type="text"
                                value={renamingLayerName}
                                onChange={(e) => setRenamingLayerName(e.target.value)}
                                onKeyDown={handleLayerRenameKeyPress}
                                onBlur={saveLayerRename}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="layer-text-input"
                              />
                            ) : (
                              <span
                                className="layer-name"
                                onDoubleClick={(e) => {
                                  e.stopPropagation()
                                  startRenamingLayer(layer)
                                }}
                              >
                                {layer.name}
                              </span>
                            )}
                          </div>
                        </div>
                      <div className="layer-actions">
                        <button
                          className="layer-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerInStack(layer.id, 'down')
                          }}
                          disabled={actualIndex === 0}
                          title="Move up in stack (visually higher)"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          className="layer-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerInStack(layer.id, 'up')
                          }}
                          disabled={actualIndex === layers.length - 1}
                          title="Move down in stack (visually lower)"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          className="layer-btn layer-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Don't allow deleting the last layer
                            if (layers.length <= 1) {
                              return
                            }
                            layerManagerRef.current.deleteLayer(layer.id)
                            updateLayersState()
                            setSelectedLayerId(layerManagerRef.current.selectedId)
                          }}
                          disabled={layers.length <= 1}
                          title={layers.length <= 1 ? "Cannot delete last layer" : "Delete layer"}
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
