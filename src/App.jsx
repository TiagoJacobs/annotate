import { useState, useRef, useEffect } from 'react'
import { Copy, Trash2, Pen, Download, Square, Circle, ArrowRight, Type, Eye, EyeOff, X, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Home, MousePointer } from 'lucide-react'
import { CanvasManager } from './canvas/CanvasManager'
import { LayerManager } from './layers/LayerManager'
import { ToolHandler } from './tools/ToolHandler'
import { toolRegistry, getToolConfig } from './tools/toolRegistry'
import './App.css'

function Annotate() {
  // Refs
  const canvasRef = useRef(null)
  const canvasManagerRef = useRef(null)
  const layerManagerRef = useRef(new LayerManager())
  const toolHandlerRef = useRef(null)
  const imageCache = useRef(new Map())
  const selectedShapeRef = useRef(null)

  // State
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(3)
  const [fontSize, setFontSize] = useState(20)
  const [zoom, setZoom] = useState(1)
  const [editingTextLayerId, setEditingTextLayerId] = useState(null)
  const [editingTextContent, setEditingTextContent] = useState('')
  const [selectedShape, setSelectedShape] = useState(null) // { layerId, shapeType, shapeIndex }
  const [inlineEditingText, setInlineEditingText] = useState(null) // { layerId, textIndex, x, y, content }

  // ==================== Utility Functions ====================

  /**
   * Update layers state from layer manager
   */
  const updateLayersState = () => {
    setLayers([...layerManagerRef.current.getAllLayers()])
  }

  /**
   * Get coordinates from canvas event
   */
  const getCanvasCoordinates = (e) => {
    return canvasManagerRef.current.screenToCanvas(e.clientX, e.clientY)
  }

  /**
   * Get tool properties for current tool
   */
  const getToolProperties = () => {
    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return {}

    return {
      color,
      brushSize,
      fontSize,
      ...Object.fromEntries(
        Object.entries(toolConfig.properties || {}).map(([key, config]) => [
          key,
          key === 'color' ? color : key === 'size' ? brushSize : key === 'fontSize' ? fontSize : config.default,
        ])
      ),
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
    layerManagerRef.current.updateLayer(layerId, { color: newColor })
    updateLayersState()
  }

  /**
   * Get preview text for text layers
   */
  const getLayerPreviewText = (layer) => {
    if (layer.texts?.length > 0) {
      const text = layer.texts[0].content
      const maxLength = 30
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return null
  }

  /**
   * Select a layer
   */
  const selectLayer = (layerId) => {
    if (selectedLayerId === layerId) {
      // Toggle off
      layerManagerRef.current.selectLayer(null)
      setSelectedLayerId(null)
    } else {
      // Select layer
      layerManagerRef.current.selectLayer(layerId)
      setSelectedLayerId(layerId)
    }
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
        layerManagerRef.current.updateLayer(editingTextLayerId, { texts: layer.texts })
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
    if (inlineEditingText && inlineEditingText.content.trim()) {
      const layer = layerManagerRef.current.getLayer(inlineEditingText.layerId)
      if (layer && layer.texts?.[inlineEditingText.textIndex]) {
        layer.texts[inlineEditingText.textIndex].content = inlineEditingText.content
        layerManagerRef.current.updateLayer(inlineEditingText.layerId, { texts: layer.texts })
        updateLayersState()
      }
    }
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

  // ==================== Canvas Events ====================

  const handleCanvasClick = (e) => {
    const { x, y } = getCanvasCoordinates(e)

    if (tool === 'text') {
      const textContent = prompt('Enter text:')
      if (textContent) {
        toolHandlerRef.current.placeText({ x, y }, getToolConfig(tool), getToolProperties(), textContent)
        updateLayersState()
      }
    }
  }

  const handleCanvasDoubleClick = (e) => {
    const { x, y } = getCanvasCoordinates(e)

    // Check if double-clicked on a text shape
    if (selectedShape && selectedShape.shapeType === 'text') {
      const layer = layerManagerRef.current.getLayer(selectedShape.layerId)
      if (layer && layer.texts?.[selectedShape.shapeIndex]) {
        const text = layer.texts[selectedShape.shapeIndex]
        const screenPos = canvasManagerRef.current.canvasToScreen(text.x, text.y)

        setInlineEditingText({
          layerId: selectedShape.layerId,
          textIndex: selectedShape.shapeIndex,
          x: screenPos.screenX,
          y: screenPos.screenY - text.fontSize, // Adjust for text baseline
          content: text.content,
          fontSize: text.fontSize
        })
      }
    }
  }

  const handleCanvasMouseDown = (e) => {
    const { x, y } = getCanvasCoordinates(e)
    const toolConfig = getToolConfig(tool)
    const handler = toolConfig?.handlers?.onMouseDown
    const properties = getToolProperties()

    if (handler === 'startFreehandStroke') {
      toolHandlerRef.current.startFreehandStroke({ x, y }, toolConfig, properties)
    } else if (handler === 'startShape') {
      toolHandlerRef.current.startShape({ x, y }, toolConfig, properties)
    } else if (handler === 'selectObject') {
      const shape = toolHandlerRef.current.selectObject({ x, y })
      selectedShapeRef.current = shape
      setSelectedShape(shape)
      // Force immediate render to show selection box
      setTimeout(() => renderCanvas(), 0)
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (e.buttons === 0) return // No mouse button pressed

    const { x, y } = getCanvasCoordinates(e)
    const toolConfig = getToolConfig(tool)
    const handler = toolConfig?.handlers?.onMouseMove
    const properties = getToolProperties()

    if (handler === 'continueFreehandStroke') {
      toolHandlerRef.current.continueFreehandStroke({ x, y }, toolConfig, properties)
      updateLayersState()
    } else if (handler === 'previewShape') {
      toolHandlerRef.current.previewShape({ x, y }, toolConfig, properties)
      updateLayersState()
    } else if (handler === 'dragObject') {
      toolHandlerRef.current.dragObject({ x, y })
      updateLayersState()
      renderCanvas()
    }
  }

  const handleCanvasMouseUp = () => {
    const toolConfig = getToolConfig(tool)
    const handler = toolConfig?.handlers?.onMouseUp

    if (handler === 'finishFreehandStroke') {
      toolHandlerRef.current.finishFreehandStroke()
    } else if (handler === 'finishShape') {
      toolHandlerRef.current.finishShape()
    } else if (handler === 'releaseObject') {
      toolHandlerRef.current.releaseObject()
      // Keep selection active, just stop dragging
    }

    updateLayersState()
  }

  const handleMouseWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      zoomIn(delta)
    }
  }

  // ==================== Zoom & View ====================

  const zoomIn = (amount = 0.1) => {
    const newZoom = Math.min(10, zoom + amount)
    setZoom(newZoom)
    canvasManagerRef.current?.setZoom(newZoom)
  }

  const zoomOut = (amount = 0.1) => {
    const newZoom = Math.max(0.1, zoom - amount)
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

  const deleteSelectedShape = () => {
    if (!selectedShape) return

    const layer = layerManagerRef.current.getLayer(selectedShape.layerId)
    if (!layer) return

    const { shapeType, shapeIndex } = selectedShape

    if (shapeType === 'stroke') {
      layer.strokes.splice(shapeIndex, 1)
    } else if (shapeType === 'arrow') {
      layer.arrows.splice(shapeIndex, 1)
    } else if (shapeType === 'rect') {
      layer.rects.splice(shapeIndex, 1)
    } else if (shapeType === 'ellipse') {
      layer.ellipses.splice(shapeIndex, 1)
    } else if (shapeType === 'text') {
      layer.texts.splice(shapeIndex, 1)
    }

    layerManagerRef.current.updateLayer(layer.id, layer)
    setSelectedShape(null)
    selectedShapeRef.current = null
    if (toolHandlerRef.current) {
      toolHandlerRef.current.clearSelection()
    }
    updateLayersState()
  }

  // ==================== Effects ====================

  useEffect(() => {
    if (canvasRef.current && !canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager(canvasRef.current)
      toolHandlerRef.current = new ToolHandler(canvasManagerRef.current, layerManagerRef.current)

      // Initialize canvas to match container size
      const container = canvasRef.current.parentElement
      const rect = container.getBoundingClientRect()
      canvasManagerRef.current.setDimensions(rect.width, rect.height)

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

  /**
   * Render canvas with grid and all layers
   */
  const renderCanvas = () => {
    if (!canvasManagerRef.current) return

    const canvasManager = canvasManagerRef.current
    const ctx = canvasManager.getContext()

    // Draw grid background
    canvasManager.drawGrid(50)

    // Draw all visible layers
    const allLayers = layerManagerRef.current.getAllLayers()
    allLayers.forEach((layer) => {
      if (!layer.visible) return

      canvasManager.save()
      canvasManager.applyTransform()
      ctx.globalAlpha = layer.opacity

      // Draw strokes
      if (layer.strokes && layer.strokes.length > 0) {
        layer.strokes.forEach((stroke) => {
          ctx.strokeStyle = layer.color
          ctx.lineWidth = stroke.size
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath()
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
            }
            ctx.stroke()
          }
        })
      }

      // Draw arrows
      if (layer.arrows && layer.arrows.length > 0) {
        layer.arrows.forEach((arrow) => {
          drawArrow(ctx, arrow.fromX, arrow.fromY, arrow.toX, arrow.toY, layer.color, arrow.size)
        })
      }

      // Draw rectangles
      if (layer.rects && layer.rects.length > 0) {
        layer.rects.forEach((rect) => {
          ctx.strokeStyle = layer.color
          ctx.lineWidth = rect.size
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
        })
      }

      // Draw ellipses
      if (layer.ellipses && layer.ellipses.length > 0) {
        layer.ellipses.forEach((ellipse) => {
          ctx.strokeStyle = layer.color
          ctx.lineWidth = ellipse.size
          ctx.beginPath()
          ctx.ellipse(
            ellipse.x + ellipse.width / 2,
            ellipse.y + ellipse.height / 2,
            Math.abs(ellipse.width) / 2,
            Math.abs(ellipse.height) / 2,
            0,
            0,
            Math.PI * 2
          )
          ctx.stroke()
        })
      }

      // Draw texts
      if (layer.texts && layer.texts.length > 0) {
        layer.texts.forEach((text) => {
          ctx.fillStyle = layer.color
          ctx.font = `${text.fontSize}px Arial`
          ctx.fillText(text.content, text.x, text.y)
        })
      }

      // Draw images
      if (layer.image) {
        let img = imageCache.current.get(layer.image)
        if (!img) {
          // Create and cache the image
          img = new Image()
          img.onload = () => {
            imageCache.current.set(layer.image, img)
            renderCanvas() // Re-render once image is loaded
          }
          img.src = layer.image
        } else if (img.complete) {
          // Image is loaded, draw it
          ctx.drawImage(img, 0, 0)
        }
      }

      ctx.globalAlpha = 1
      canvasManager.resetTransform()
      canvasManager.restore()
    })

    // Draw selection box with resize handles
    if (selectedShapeRef.current && toolHandlerRef.current) {
      const layer = layerManagerRef.current.getLayer(selectedShapeRef.current.layerId)
      if (layer) {
        const bounds = toolHandlerRef.current.getShapeBounds(layer, selectedShapeRef.current.shapeType, selectedShapeRef.current.shapeIndex)

        canvasManager.save()
        canvasManager.applyTransform()

        const padding = 5
        const handleSize = 8 / canvasManager.zoom

        // Draw dashed bounding box
        ctx.strokeStyle = '#667eea'
        ctx.lineWidth = 2 / canvasManager.zoom
        ctx.setLineDash([5 / canvasManager.zoom, 5 / canvasManager.zoom])
        ctx.strokeRect(
          bounds.x - padding,
          bounds.y - padding,
          bounds.width + padding * 2,
          bounds.height + padding * 2
        )
        ctx.setLineDash([])

        // Draw resize handles
        ctx.fillStyle = '#667eea'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1 / canvasManager.zoom

        const handles = [
          // Corners
          { x: bounds.x - padding, y: bounds.y - padding, cursor: 'nw-resize' }, // top-left
          { x: bounds.x + bounds.width + padding, y: bounds.y - padding, cursor: 'ne-resize' }, // top-right
          { x: bounds.x - padding, y: bounds.y + bounds.height + padding, cursor: 'sw-resize' }, // bottom-left
          { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, cursor: 'se-resize' }, // bottom-right
          // Edges
          { x: bounds.x + bounds.width / 2, y: bounds.y - padding, cursor: 'n-resize' }, // top
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding, cursor: 's-resize' }, // bottom
          { x: bounds.x - padding, y: bounds.y + bounds.height / 2, cursor: 'w-resize' }, // left
          { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2, cursor: 'e-resize' }, // right
        ]

        handles.forEach(handle => {
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          )
          ctx.strokeRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          )
        })

        canvasManager.resetTransform()
        canvasManager.restore()
      }
    }
  }

  /**
   * Helper function to draw arrows
   */
  const drawArrow = (ctx, fromX, fromY, toX, toY, color, size = 2) => {
    const headlen = 15
    const angle = Math.atan2(toY - fromY, toX - fromX)

    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  useEffect(() => {
    const updateLayersFromManager = () => {
      updateLayersState()
      setSelectedLayerId(layerManagerRef.current.selectedId)
      renderCanvas()
    }

    const interval = setInterval(updateLayersFromManager, 100)
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

              layerManagerRef.current.createLayer('Image', '#808080', {
                image: tempCanvas.toDataURL(),
              })

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            layerManagerRef.current.redo()
          } else {
            layerManagerRef.current.undo()
          }
          updateLayersState()
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected shape
        if (selectedShape) {
          e.preventDefault()
          deleteSelectedShape()
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShape])

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
          {tool !== 'select' && (
            <div className="tool-group">
              <label>{showFontSize ? 'Font Size:' : 'Line Weight:'}</label>
              <input
                type="range"
                min={showFontSize ? '10' : '1'}
                max={showFontSize ? '100' : '50'}
                value={showFontSize ? fontSize : brushSize}
                onChange={(e) => {
                  if (showFontSize) {
                    setFontSize(parseInt(e.target.value))
                  } else {
                    setBrushSize(parseInt(e.target.value))
                  }
                }}
                className="size-slider"
              />
              <span className="size-display">{showFontSize ? fontSize : brushSize}px</span>
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
              onWheel={handleMouseWheel}
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
                  {!selectedLayerId && (
                    <div className="layer-item layer-placeholder">
                      <div className="layer-content">
                        <div className="layer-color-swatch" style={{ backgroundColor: color }} />
                        <div className="layer-info">
                          <span className="layer-name" style={{ opacity: 0.6 }}>New layer (will be created)</span>
                        </div>
                      </div>
                    </div>
                  )}
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
