import { useState, useRef, useEffect, useCallback } from 'react'
import { Pen, ArrowRight, Square, Circle, Type, MousePointer, Hand, ZoomIn, ZoomOut, Home, Copy, Download, Github } from 'lucide-react'
import { CanvasManager } from './canvas/CanvasManager'
import { LayerManager } from './layers/LayerManager'
import { ToolHandler } from './tools/ToolHandler'
import { toolRegistry, getToolConfig } from './tools/toolRegistry'
import { SHAPE_ARRAY_MAP } from './config/shapeConfig'
import { ShapeRendererFactory } from './renderers/ShapeRenderer'
import { useCanvasRenderer } from './hooks/useCanvasRenderer'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useShapeProperties } from './hooks/useShapeProperties'
import { getStoredToolProperties, saveToolProperty } from './utils/storageUtils'
import { createCroppedCanvas } from './utils/canvasExportUtils'
import { CanvasArea } from './components/CanvasArea'
import { ToolsPanel } from './components/ToolsPanel'
import { ShapeOptionsPanel } from './components/ShapeOptionsPanel'
import { LayersPanel } from './components/LayersPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Snackbar } from './components/Snackbar'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { Minimap } from './components/Minimap'
import {
  CANVAS_UPDATE_INTERVAL,
  SELECTION_PADDING,
  RESIZE_HANDLE_SIZE,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_FONT_SIZE,
  ZOOM_STEP,
  MIN_ZOOM,
  MAX_ZOOM,
  GRID_SIZE,
  DEFAULT_COLOR,
  MIN_TEXT_SIZE,
  MAX_TEXT_SIZE,
  MIN_BRUSH_SIZE,
  MAX_BRUSH_SIZE
} from './config/uiConstants'
import './App.css'

function Annotate() {
  // Refs
  const canvasRef = useRef(null)
  const canvasManagerRef = useRef(null)
  const layerManagerRef = useRef(new LayerManager())
  const toolHandlerRef = useRef(null)
  const imageCache = useRef(new Map())
  const selectedShapeRef = useRef(null)
  const shapeRendererRef = useRef(null)
  const colorPickerRef = useRef(null)
  const sizeSliderRef = useRef(null)
  const lineStyleSelectRef = useRef(null)

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
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showMinimap, setShowMinimap] = useState(false)

  // ==================== Hooks ====================

  // Shape properties management hook
  const shapePropertiesHook = useShapeProperties({
    selectedShape,
    layerManagerRef
  })

  // ==================== Utility Functions (must be before hooks) ====================

  /**
   * Show snackbar message
   */
  const showSnackbar = (message) => {
    setSnackbarMessage(message)
    setSnackbarOpen(true)
  }

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
   * Check if current tool uses fontSize property
   */
  const showFontSize = () => {
    const toolConfig = getToolConfig(tool)
    return toolConfig?.properties?.fontSize !== undefined
  }

  /**
   * Get color from a layer
   */
  const getLayerColor = (layer) => {
    return layer?.color || DEFAULT_COLOR
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
   * Get color from selected shape - uses hook
   */
  const getSelectedShapeColor = () => {
    return shapePropertiesHook.getColor()
  }

  /**
   * Update color for selected shape(s) - uses hook
   */
  const updateSelectedShapeColor = (newColor) => {
    const updatedLayers = shapePropertiesHook.updateColor(newColor)
    if (updatedLayers && updatedLayers.size > 0) {
      updateLayersState()
      renderCanvas()
    }
  }

  /**
   * Get size/fontSize from selected shape(s) - uses hook
   */
  const getSelectedShapeSize = () => {
    return shapePropertiesHook.getSize()
  }

  /**
   * Update size/fontSize for selected shape(s) - uses hook
   */
  const updateSelectedShapeSize = (newSize) => {
    const updatedLayers = shapePropertiesHook.updateSize(newSize)
    if (updatedLayers && updatedLayers.size > 0) {
      updateLayersState()
      renderCanvas()
    }
  }

  /**
   * Get lineStyle from selected shape - uses hook
   */
  const getSelectedShapeLineStyle = () => {
    return shapePropertiesHook.getLineStyle()
  }

  /**
   * Update lineStyle for selected shape(s) - uses hook
   */
  const updateSelectedShapeLineStyle = (newLineStyle) => {
    const updatedLayers = shapePropertiesHook.updateLineStyle(newLineStyle)
    if (updatedLayers && updatedLayers.size > 0) {
      updateLayersState()
      renderCanvas()
    }
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
    // Switch to select tool after text is added
    setTool('select')
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

  const panCanvas = (deltaX, deltaY) => {
    canvasManagerRef.current?.pan(deltaX, deltaY)
    renderCanvas()
  }

  // ==================== Export & Actions ====================

  const copyToClipboard = async () => {
    try {
      const croppedCanvas = createCroppedCanvas(layerManagerRef.current, shapeRendererRef.current)

      // Convert blob to promise-based format
      const blob = await new Promise(resolve => croppedCanvas.toBlob(resolve, 'image/png'))

      if (!blob || blob.size === 0) {
        showSnackbar('Nothing to copy - canvas is empty')
        return
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      showSnackbar('Image copied to clipboard!')
    } catch (error) {
      console.error('Copy to clipboard failed:', error)
      showSnackbar('Failed to copy image to clipboard')
    }
  }

  const downloadImage = () => {
    if (downloadFormat === 'svg') {
      downloadSVG()
    } else {
      downloadPNG()
    }
  }

  const downloadPNG = () => {
    const croppedCanvas = createCroppedCanvas(layerManagerRef.current, shapeRendererRef.current)
    const link = document.createElement('a')
    link.href = croppedCanvas.toDataURL('image/png')
    link.download = 'annotated-image.png'
    link.click()
  }

  const downloadSVG = () => {
    const croppedCanvas = createCroppedCanvas(layerManagerRef.current, shapeRendererRef.current)
    const width = croppedCanvas.width
    const height = croppedCanvas.height

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
    image.setAttribute('href', croppedCanvas.toDataURL('image/png'))
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
  }

  const clearCanvas = () => {
    layerManagerRef.current.clear()
    setLayers([])
    setSelectedLayerId(null)
  }

  const addNewLayer = () => {
    const newLayer = layerManagerRef.current.createLayer()
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
    handleCanvasMiddleMouseDown,
    handleCanvasMiddleMouseMove,
    handleCanvasMiddleMouseUp
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
    renderCanvas,
    showSnackbar,
    setZoom
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
    zoomOut,
    panCanvas,
    setTool,
    tool,
    colorPickerRef,
    sizeSliderRef,
    lineStyleSelectRef,
    setShowKeyboardShortcuts,
    toolHandlerRef
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

  // Show minimap when content is outside viewport
  useEffect(() => {
    const checkContentOutsideViewport = () => {
      // Get all content bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      let hasContent = false

      const allLayers = layerManagerRef.current?.getAllLayers() || []
      for (const layer of allLayers) {
        if (!layer.visible) continue

        // Check image bounds
        if (layer.image) {
          hasContent = true
          minX = Math.min(minX, layer.image.x || 0)
          minY = Math.min(minY, layer.image.y || 0)
          maxX = Math.max(maxX, (layer.image.x || 0) + layer.image.width)
          maxY = Math.max(maxY, (layer.image.y || 0) + layer.image.height)
        }

        // Check shape bounds (simplified - only checking basic properties)
        layer.strokes?.forEach(stroke => {
          if (stroke.points && stroke.points.length > 0) {
            hasContent = true
            stroke.points.forEach(point => {
              minX = Math.min(minX, point.x)
              minY = Math.min(minY, point.y)
              maxX = Math.max(maxX, point.x)
              maxY = Math.max(maxY, point.y)
            })
          }
        })

        layer.arrows?.forEach(arrow => {
          if (arrow.x1 !== undefined && arrow.x2 !== undefined) {
            hasContent = true
            minX = Math.min(minX, Math.min(arrow.x1, arrow.x2))
            minY = Math.min(minY, Math.min(arrow.y1, arrow.y2))
            maxX = Math.max(maxX, Math.max(arrow.x1, arrow.x2))
            maxY = Math.max(maxY, Math.max(arrow.y1, arrow.y2))
          }
        })

        layer.rects?.forEach(rect => {
          if (rect.width && rect.height) {
            hasContent = true
            minX = Math.min(minX, rect.x)
            minY = Math.min(minY, rect.y)
            maxX = Math.max(maxX, rect.x + rect.width)
            maxY = Math.max(maxY, rect.y + rect.height)
          }
        })

        layer.ellipses?.forEach(ellipse => {
          if (ellipse.width && ellipse.height) {
            hasContent = true
            minX = Math.min(minX, ellipse.x)
            minY = Math.min(minY, ellipse.y)
            maxX = Math.max(maxX, ellipse.x + ellipse.width)
            maxY = Math.max(maxY, ellipse.y + ellipse.height)
          }
        })

        layer.texts?.forEach(text => {
          hasContent = true
          const textWidth = text.content.length * text.fontSize * 0.6
          minX = Math.min(minX, text.x)
          minY = Math.min(minY, text.y)
          maxX = Math.max(maxX, text.x + textWidth)
          maxY = Math.max(maxY, text.y + text.fontSize)
        })
      }

      // Get current viewport bounds
      const canvas = canvasManagerRef.current?.canvas
      if (!canvas) {
        setShowMinimap(false)
        return
      }

      const rect = canvas.getBoundingClientRect()
      const canvasWidth = rect.width
      const canvasHeight = rect.height
      const { panX, panY, zoom: currentZoom } = canvasManagerRef.current

      // Check if user is panned away from origin (0,0) at zoom 1
      const isPannedAway = panX !== 0 || panY !== 0 || currentZoom !== 1

      // If no content, show minimap only if panned away
      if (!hasContent) {
        setShowMinimap(isPannedAway)
        return
      }

      // Get visible area in canvas coordinates
      const visibleMinX = -panX / currentZoom
      const visibleMinY = -panY / currentZoom
      const visibleMaxX = visibleMinX + canvasWidth / currentZoom
      const visibleMaxY = visibleMinY + canvasHeight / currentZoom

      // Check if all content fits in visible area with some padding
      const padding = 50
      const contentFitsInViewport =
        minX >= visibleMinX - padding &&
        minY >= visibleMinY - padding &&
        maxX <= visibleMaxX + padding &&
        maxY <= visibleMaxY + padding

      // Show minimap if content extends beyond viewport OR if user panned away
      setShowMinimap(!contentFitsInViewport || isPannedAway)
    }

    // Check immediately
    checkContentOutsideViewport()

    // Also check periodically to catch pan/zoom changes
    const interval = setInterval(checkContentOutsideViewport, 100)
    return () => clearInterval(interval)
  }, [layers])

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

  // Refs for paste handling
  const pasteInputRef = useRef(null)

  // Store the handlePaste function in a ref so it can be used in useEffect
  const handlePasteRef = useRef(null)

  // Define handlePaste
  const handlePaste = (e) => {
    console.log('=== PASTE EVENT FIRED ===')
    console.log('Active element:', document.activeElement)
    console.log('Paste div:', pasteInputRef.current)
    console.log('Are they same?', document.activeElement === pasteInputRef.current)
    console.log('Event:', e)
    console.log('ClipboardData:', e.clipboardData)

    if (!e.clipboardData) {
      console.log('No clipboardData')
      return
    }

    const items = e.clipboardData.items
    console.log('Items:', items)
    console.log('Items length:', items?.length)

    if (!items || items.length === 0) {
      console.log('No items in clipboard')
      return
    }

    let foundImage = false

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      console.log(`Item ${i}:`, item.type, item.kind)

      if (item.kind === 'file' && item.type.startsWith('image/')) {
        foundImage = true
        console.log('Found image file!')
        e.preventDefault()

        const file = item.getAsFile()
        console.log('File:', file)

        if (!file) {
          console.log('Failed to get file from item')
          continue
        }

        const reader = new FileReader()

        reader.onload = (event) => {
          console.log('FileReader loaded, result length:', event.target.result.length)
          const img = new Image()

          img.onload = () => {
            console.log('Image loaded:', img.width, 'x', img.height)

            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(img, 0, 0)

            console.log('Canvas created, converting to dataURL...')
            const dataUrl = tempCanvas.toDataURL()
            console.log('DataURL length:', dataUrl.length)

            console.log('Creating image layer...')
            const imageLayer = layerManagerRef.current.createLayer('Image', {
              image: {
                data: dataUrl,
                x: 0,
                y: 0,
                width: img.width,
                height: img.height
              },
            })

            console.log('Image layer created:', imageLayer.id)
            setSelectedLayerId(imageLayer.id)
            setTool('select')
            updateLayersState()
            console.log('✅ Image paste completed successfully!')
          }

          img.onerror = (err) => {
            console.error('❌ Image load error:', err)
          }

          console.log('Setting image src...')
          img.src = event.target.result
        }

        reader.onerror = (err) => {
          console.error('❌ FileReader error:', err)
        }

        console.log('Starting FileReader...')
        reader.readAsDataURL(file)
      }
    }

    if (foundImage) {
      e.preventDefault()
    }
  }

  // Store the handler in a ref
  handlePasteRef.current = handlePaste

  // Attach paste listener using callback ref
  const setPasteInputRef = useCallback((element) => {
    if (element) {
      console.log('Setting paste input ref, attaching listener')
      pasteInputRef.current = element

      // Log before attaching
      console.log('handlePasteRef.current:', handlePasteRef.current)

      element.addEventListener('paste', handlePasteRef.current)
      console.log('✅ Paste listener attached to element')

      // Also add a debug listener to see if paste events reach this element at all
      element.addEventListener('paste', (e) => {
        console.log('🎯 DEBUG: Paste event reached contenteditable element!')
        console.log('Event:', e)
        console.log('ClipboardData:', e.clipboardData)
      })

      element.focus()
      console.log('✅ Paste div focused')
    }
  }, [])

  // Cleanup paste listener
  useEffect(() => {
    return () => {
      if (pasteInputRef.current && handlePasteRef.current) {
        pasteInputRef.current.removeEventListener('paste', handlePasteRef.current)
        console.log('✅ Paste listener removed')
      }
    }
  }, [])

  // Also attach paste listener to document as fallback
  useEffect(() => {
    const handleDocumentPaste = (e) => {
      console.log('🔥 Document-level paste event triggered')
      console.log('Active element when document paste fires:', document.activeElement)
      console.log('Event target:', e.target)
      // Call the same handler
      if (handlePasteRef.current) {
        handlePasteRef.current(e)
      }
    }

    // Try both capture and bubble phases
    document.addEventListener('paste', handleDocumentPaste, true) // capture phase
    console.log('✅ Document paste listener attached (capture phase)')

    return () => {
      document.removeEventListener('paste', handleDocumentPaste, true)
    }
  }, [])

  // Track last clipboard content to detect when user copies something external
  const lastClipboardContentRef = useRef(null)

  // Handle paste via Ctrl+V using Clipboard API
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPasteKey = (e.ctrlKey || e.metaKey) && e.key === 'v'

      if (isPasteKey) {
        console.log('🔐 Paste key detected (Ctrl+V), checking clipboard...')

        // Check what's currently in the system clipboard
        navigator.clipboard.read()
          .then(clipboardItems => {
            // Check if there's an image in the system clipboard
            const hasImage = clipboardItems.some(item =>
              item.types.some(type => type.startsWith('image/'))
            )

            // First check if there are shapes in localStorage to paste
            const CLIPBOARD_KEY = 'annotate-shapes-clipboard'
            const shapeClipboard = localStorage.getItem(CLIPBOARD_KEY)

            if (hasImage) {
              console.log('🖼️ Image detected in system clipboard, clearing old shape data')
              // Clear the old shape clipboard when user copies an image
              localStorage.removeItem(CLIPBOARD_KEY)
            }

            // Handle shape paste from localStorage (takes priority if exists and no image)
            if (shapeClipboard && !hasImage) {
              console.log('📝 Found shapes in clipboard, letting keyboard shortcuts handler paste shapes')
              // Don't prevent default - let the keyboard shortcuts handler deal with it
              return
            }

            // Handle image paste (only if no shapes in localStorage)
            if (hasImage && !shapeClipboard) {
              console.log('🔐 Pasting image from clipboard...')
              e.preventDefault()

              for (let item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'))

                if (imageType) {
                  item.getType(imageType)
                    .then(blob => {
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        const img = new Image()

                        img.onload = () => {
                          const dpr = window.devicePixelRatio || 1
                          const actualWidth = (img.naturalWidth || img.width) / dpr
                          const actualHeight = (img.naturalHeight || img.height) / dpr

                          const tempCanvas = document.createElement('canvas')
                          tempCanvas.width = actualWidth
                          tempCanvas.height = actualHeight
                          const tempCtx = tempCanvas.getContext('2d')
                          tempCtx.drawImage(img, 0, 0, actualWidth, actualHeight)

                          const dataUrl = tempCanvas.toDataURL()

                          const imageLayer = layerManagerRef.current.createLayer('Image', {
                            image: {
                              data: dataUrl,
                              x: 0,
                              y: 0,
                              width: actualWidth,
                              height: actualHeight
                            },
                          })

                          console.log('✅ Image layer created:', imageLayer.id)
                          setSelectedLayerId(imageLayer.id)
                          setTool('select')
                          updateLayersState()
                          console.log('✅ Image paste completed successfully!')
                        }

                        img.onerror = () => console.error('Image load error')
                        img.src = event.target.result
                      }

                      reader.onerror = (err) => console.error('FileReader error:', err)
                      reader.readAsDataURL(blob)
                    })
                    .catch(err => console.error('Failed to get blob:', err))

                  return // Stop after first image
                }
              }
            } else if (!shapeClipboard && !hasImage) {
              console.log('🔐 No image or shape data found in clipboard')
            }
          })
          .catch(err => {
            console.error('Clipboard read failed:', err)
          })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    console.log('✅ Clipboard API paste handler attached')

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])



  // ==================== Render ====================

  // Icon mapping for toolbar buttons
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
              <span className="btn-text">Copy</span>
            </button>
            <div className="download-group">
              <button className="action-btn download-btn" onClick={downloadImage} title="Download image">
                <Download size={18} />
                <span className="btn-text">Download</span>
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
            <a
              href="https://github.com/TiagoJacobs/annotate"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="View on GitHub"
            >
              <Github size={18} />
            </a>
          </div>
        </div>

        {/* Options Toolbar - always visible but empty when no tool/shape is active */}
        <ShapeOptionsPanel
          tool={tool}
          selectedShape={selectedShape}
          color={color}
          brushSize={brushSize}
          fontSize={fontSize}
          lineStyle={lineStyle}
          getSelectedShapeColor={getSelectedShapeColor}
          getSelectedShapeSize={getSelectedShapeSize}
          getSelectedShapeLineStyle={getSelectedShapeLineStyle}
          updateSelectedShapeColor={updateSelectedShapeColor}
          updateSelectedShapeSize={updateSelectedShapeSize}
          updateSelectedShapeLineStyle={updateSelectedShapeLineStyle}
          setColor={setColor}
          setBrushSize={setBrushSize}
          setFontSize={setFontSize}
          setLineStyle={setLineStyle}
          saveToolProperty={saveToolProperty}
          colorPickerRef={colorPickerRef}
          sizeSliderRef={sizeSliderRef}
          lineStyleSelectRef={lineStyleSelectRef}
        />

        <div className="annotate-content">
          {/* Hidden div for paste handling - contenteditable accepts image files */}
          <div
            ref={setPasteInputRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              position: 'fixed',
              left: '-9999px',
              top: '-9999px',
              opacity: 0,
              pointerEvents: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              width: '1px',
              height: '1px',
              outline: 'none'
            }}
            onInput={(e) => {
              // Clear content to prevent text accumulation
              e.currentTarget.innerHTML = ''
            }}
          />

          {/* Canvas */}
          <CanvasArea
            canvasRef={canvasRef}
            inlineEditingText={inlineEditingText}
            setInlineEditingText={setInlineEditingText}
            handleCanvasClick={handleCanvasClick}
            handleCanvasDoubleClick={handleCanvasDoubleClick}
            handleCanvasMouseDown={handleCanvasMouseDown}
            handleCanvasMouseMove={handleCanvasMouseMove}
            handleCanvasMouseUp={handleCanvasMouseUp}
            handleCanvasMiddleMouseDown={handleCanvasMiddleMouseDown}
            handleCanvasMiddleMouseMove={handleCanvasMiddleMouseMove}
            handleCanvasMiddleMouseUp={handleCanvasMiddleMouseUp}
            handleInlineTextKeyPress={handleInlineTextKeyPress}
            saveInlineTextEdit={saveInlineTextEdit}
            zoom={zoom}
            layers={layers}
          />

          {/* Layers Panel */}
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            renamingLayerId={renamingLayerId}
            renamingLayerName={renamingLayerName}
            selectLayer={selectLayer}
            toggleLayerVisibility={toggleLayerVisibility}
            moveLayerInStack={moveLayerInStack}
            deleteLayer={(layerId) => {
              if (layers.length <= 1) {
                return
              }
              layerManagerRef.current.deleteLayer(layerId)
              updateLayersState()
              setSelectedLayerId(layerManagerRef.current.selectedId)
            }}
            clearCanvas={clearCanvas}
            addNewLayer={addNewLayer}
            startRenamingLayer={startRenamingLayer}
            saveLayerRename={saveLayerRename}
            setRenamingLayerName={setRenamingLayerName}
            handleLayerRenameKeyPress={handleLayerRenameKeyPress}
          />
        </div>
      </div>
      <div className="status-bar">
        <p>{getStatusMessage()} <span className="status-hint">· K for keyboard shortcuts</span></p>
      </div>
      <Snackbar
        message={snackbarMessage}
        isOpen={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
      />
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
      <Minimap
        canvasManagerRef={canvasManagerRef}
        layerManagerRef={layerManagerRef}
        shapeRendererRef={shapeRendererRef}
        isVisible={showMinimap}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
      />
    </div>
  )
}

export default Annotate
