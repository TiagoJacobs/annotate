import { useState, useRef, useEffect, useCallback } from 'react'
import { CanvasManager } from './canvas/CanvasManager'
import { LayerManager } from './layers/LayerManager'
import { ToolHandler } from './tools/ToolHandler'
import { getToolConfig } from './tools/toolRegistry'
import { SHAPE_ARRAY_MAP } from './config/shapeConfig'
import { ShapeRendererFactory } from './renderers/ShapeRenderer'
import { ShapeOperations } from './services/ShapeOperations'
import { useCanvasRenderer } from './hooks/useCanvasRenderer'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useShapeProperties } from './hooks/useShapeProperties'
import { getStoredToolProperties, saveToolProperty } from './utils/storageUtils'
import { createCroppedCanvas } from './utils/canvasExportUtils'
import { cropImageDataUrl } from './utils/imageCropUtils'
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
  const [fillColor, setFillColor] = useState('')
  const [fontWeight, setFontWeight] = useState('normal')
  const [fontStyle, setFontStyle] = useState('normal')
  const [textDecoration, setTextDecoration] = useState('none')
  const [highlightColor, setHighlightColor] = useState('')
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
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [selectedStampId, setSelectedStampId] = useState('counter')
  const [isCropping, setIsCropping] = useState(false)
  const [cropRect, setCropRect] = useState(null) // { x, y, width, height } in canvas coords

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
    setSelectedLayerId(layerManagerRef.current.selectedId)
  }

  /**
   * Get tool properties for current tool
   */
  const getToolProperties = () => {
    const toolConfig = getToolConfig(tool)
    if (!toolConfig) return {}

    const propertyValueMap = {
      color,
      fillColor,
      size: brushSize,
      fontWeight,
      fontStyle,
      textDecoration,
      highlightColor,
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
      stampId: selectedStampId,
      ...Object.fromEntries(toolProperties)
    }

    return props
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

  const getSelectedShapeFillColor = () => {
    return shapePropertiesHook.getFillColor()
  }

  const updateSelectedShapeFillColor = (newFillColor) => {
    const updatedLayers = shapePropertiesHook.updateFillColor(newFillColor)
    if (updatedLayers && updatedLayers.size > 0) {
      updateLayersState()
      renderCanvas()
    }
  }

  // Text formatting getters/setters
  const getSelectedShapeFontWeight = () => shapePropertiesHook.getFontWeight()
  const getSelectedShapeFontStyle = () => shapePropertiesHook.getFontStyle()
  const getSelectedShapeTextDecoration = () => shapePropertiesHook.getTextDecoration()
  const getSelectedShapeHighlightColor = () => shapePropertiesHook.getHighlightColor()

  const updateSelectedShapeTextFormat = (propName, value) => {
    const updaterMap = {
      fontWeight: shapePropertiesHook.updateFontWeight,
      fontStyle: shapePropertiesHook.updateFontStyle,
      textDecoration: shapePropertiesHook.updateTextDecoration,
      highlightColor: shapePropertiesHook.updateHighlightColor,
    }
    const updatedLayers = updaterMap[propName]?.(value)
    if (updatedLayers && updatedLayers.size > 0) {
      updateLayersState()
      renderCanvas()
    }
  }

  // ==================== Crop Functions ====================

  const startCrop = () => {
    // Only start crop if an image is selected
    if (!selectedShape || selectedShape.shapeType !== 'image') return
    const layer = layerManagerRef.current?.getLayer(selectedShape.layerId)
    if (!layer?.image) return
    setIsCropping(true)
    setCropRect(null)
  }

  const confirmCrop = async () => {
    const currentSelectedShape = selectedShapeRef.current || selectedShape
    if (!cropRect || !currentSelectedShape) {
      setIsCropping(false)
      setCropRect(null)
      return
    }

    const layer = layerManagerRef.current?.getLayer(currentSelectedShape.layerId)
    if (!layer?.image) {
      setIsCropping(false)
      setCropRect(null)
      return
    }

    const image = layer.image
    // Convert crop rect from canvas coords to image-relative coords
    const relX = cropRect.x - (image.x || 0)
    const relY = cropRect.y - (image.y || 0)

    // Clamp to image bounds
    const srcX = Math.max(0, relX)
    const srcY = Math.max(0, relY)
    const srcW = Math.min(cropRect.width, image.width - srcX)
    const srcH = Math.min(cropRect.height, image.height - srcY)

    if (srcW <= 0 || srcH <= 0) {
      showSnackbar('Invalid crop area')
      setIsCropping(false)
      setCropRect(null)
      return
    }

    try {
      const croppedDataUrl = await cropImageDataUrl(image.data, { x: srcX, y: srcY, width: srcW, height: srcH })
      layer.image = {
        data: croppedDataUrl,
        x: (image.x || 0) + srcX,
        y: (image.y || 0) + srcY,
        width: srcW,
        height: srcH,
      }
      // Clear image cache for this layer so it re-renders
      imageCache.current.delete(image.data)
      layerManagerRef.current.updateLayerWithHistory(layer.id, { image: layer.image })
      updateLayersState()
      renderCanvas()
      showSnackbar('Image cropped')
    } catch {
      showSnackbar('Failed to crop image')
    }

    setIsCropping(false)
    setCropRect(null)
  }

  const cancelCrop = () => {
    setIsCropping(false)
    setCropRect(null)
  }

  // Global keyboard handler for crop mode
  const confirmCropRef = useRef(confirmCrop)
  confirmCropRef.current = confirmCrop
  useEffect(() => {
    if (!isCropping) return
    const handler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        confirmCropRef.current()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelCrop()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCropping])

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

  const toggleLayerVisibility = (layerId) => {
    layerManagerRef.current.toggleVisibility(layerId)
    updateLayersState()
  }

  const toggleLayerLock = (layerId) => {
    layerManagerRef.current.toggleLock(layerId)
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

  const alignSelectedShapes = (alignment) => {
    if (!selectedShape || !Array.isArray(selectedShape) || selectedShape.length < 2) return
    layerManagerRef.current.saveHistory()
    ShapeOperations.alignShapes(selectedShape, layerManagerRef.current, alignment)
    updateLayersState()
    renderCanvas()
  }

  const groupSelectedShapes = () => {
    if (!selectedShape || !Array.isArray(selectedShape) || selectedShape.length < 2) return
    const groupId = crypto.randomUUID()
    for (const shape of selectedShape) {
      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (!layer) continue
      const arrayName = ShapeOperations.getShapeArrayName(shape.shapeType)
      if (arrayName && layer[arrayName]?.[shape.shapeIndex]) {
        layer[arrayName][shape.shapeIndex].groupId = groupId
      }
    }
    updateLayersState()
    renderCanvas()
  }

  const ungroupSelectedShapes = () => {
    if (!selectedShape) return
    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    for (const shape of shapes) {
      const layer = layerManagerRef.current?.getLayer(shape.layerId)
      if (!layer) continue
      const arrayName = ShapeOperations.getShapeArrayName(shape.shapeType)
      if (arrayName && layer[arrayName]?.[shape.shapeIndex]) {
        layer[arrayName][shape.shapeIndex].groupId = null
      }
    }
    updateLayersState()
    renderCanvas()
  }

  const isGroupSelected = (() => {
    if (!selectedShape) return false
    const shapes = Array.isArray(selectedShape) ? selectedShape : [selectedShape]
    if (shapes.length < 2) return false
    const groupIds = shapes.map(s => {
      const layer = layerManagerRef.current?.getLayer(s.layerId)
      const arrayName = ShapeOperations.getShapeArrayName(s.shapeType)
      return layer?.[arrayName]?.[s.shapeIndex]?.groupId
    }).filter(Boolean)
    return groupIds.length === shapes.length && new Set(groupIds).size === 1
  })()

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
    setZoom,
    selectLayer,
    brushSize,
    setBrushSize,
    canvasReady
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

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  // Prevent browser zoom on Ctrl+scroll anywhere in the app
  useEffect(() => {
    const preventBrowserZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    document.addEventListener('wheel', preventBrowserZoom, { passive: false })
    return () => document.removeEventListener('wheel', preventBrowserZoom)
  }, [])

  useEffect(() => {
    if (canvasRef.current && !canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager(canvasRef.current)
      toolHandlerRef.current = new ToolHandler(canvasManagerRef.current, layerManagerRef.current)
      shapeRendererRef.current = new ShapeRendererFactory(imageCache.current)
      setCanvasReady(true)

      // Set up image reload callback
      const imageRenderer = shapeRendererRef.current.getRenderer('image')
      if (imageRenderer) {
        imageRenderer.setOnImageLoaded(() => renderCanvas())
      }

      // Initialize canvas to match container size
      // Use Math.floor to avoid sub-pixel overflow causing scrollbars
      const container = canvasRef.current.parentElement
      const rect = container.getBoundingClientRect()
      canvasManagerRef.current.setDimensions(Math.floor(rect.width), Math.floor(rect.height))

      // Create initial default layer
      const defaultLayer = layerManagerRef.current.createLayer('Layer 1')
      setSelectedLayerId(defaultLayer.id)
      updateLayersState()

      // Handle window resize
      const handleResize = () => {
        const rect = container.getBoundingClientRect()
        canvasManagerRef.current.setDimensions(Math.floor(rect.width), Math.floor(rect.height))
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

        layer.highlighterStrokes?.forEach(stroke => {
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
          if (arrow.fromX !== undefined && arrow.toX !== undefined) {
            hasContent = true
            minX = Math.min(minX, Math.min(arrow.fromX, arrow.toX))
            minY = Math.min(minY, Math.min(arrow.fromY, arrow.toY))
            maxX = Math.max(maxX, Math.max(arrow.fromX, arrow.toX))
            maxY = Math.max(maxY, Math.max(arrow.fromY, arrow.toY))
          }
        })

        layer.lines?.forEach(line => {
          if (line.fromX !== undefined && line.toX !== undefined) {
            hasContent = true
            minX = Math.min(minX, Math.min(line.fromX, line.toX))
            minY = Math.min(minY, Math.min(line.fromY, line.toY))
            maxX = Math.max(maxX, Math.max(line.fromX, line.toX))
            maxY = Math.max(maxY, Math.max(line.fromY, line.toY))
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

        layer.connectors?.forEach(c => {
          if (c.fromX != null && c.toX != null) {
            hasContent = true
            minX = Math.min(minX, Math.min(c.fromX, c.toX))
            minY = Math.min(minY, Math.min(c.fromY, c.toY))
            maxX = Math.max(maxX, Math.max(c.fromX, c.toX))
            maxY = Math.max(maxY, Math.max(c.fromY, c.toY))
          }
        })

        layer.stamps?.forEach(stamp => {
          if (stamp.width && stamp.height) {
            hasContent = true
            minX = Math.min(minX, stamp.x)
            minY = Math.min(minY, stamp.y)
            maxX = Math.max(maxX, stamp.x + stamp.width)
            maxY = Math.max(maxY, stamp.y + stamp.height)
          }
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
    if (!e.clipboardData) return

    const items = e.clipboardData.items
    if (!items || items.length === 0) return

    let foundImage = false

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.kind === 'file' && item.type.startsWith('image/')) {
        foundImage = true
        e.preventDefault()

        const file = item.getAsFile()
        if (!file) continue

        const reader = new FileReader()

        reader.onload = (event) => {
          const img = new Image()

          img.onload = () => {
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(img, 0, 0)

            const dataUrl = tempCanvas.toDataURL()

            const imageLayer = layerManagerRef.current.createLayer('Image', {
              image: {
                data: dataUrl,
                x: 0,
                y: 0,
                width: img.width,
                height: img.height
              },
            })

            setSelectedLayerId(imageLayer.id)
            setTool('select')
            updateLayersState()
          }

          img.src = event.target.result
        }

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
      pasteInputRef.current = element
      element.addEventListener('paste', handlePasteRef.current)
      element.focus()
    }
  }, [])

  // Cleanup paste listener
  useEffect(() => {
    return () => {
      if (pasteInputRef.current && handlePasteRef.current) {
        pasteInputRef.current.removeEventListener('paste', handlePasteRef.current)
      }
    }
  }, [])

  // Also attach paste listener to document as fallback
  useEffect(() => {
    const handleDocumentPaste = (e) => {
      if (handlePasteRef.current) {
        handlePasteRef.current(e)
      }
    }

    document.addEventListener('paste', handleDocumentPaste, true)

    return () => {
      document.removeEventListener('paste', handleDocumentPaste, true)
    }
  }, [])

  // Handle paste via Ctrl+V using Clipboard API
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPasteKey = (e.ctrlKey || e.metaKey) && e.key === 'v'

      if (isPasteKey) {
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
              localStorage.removeItem(CLIPBOARD_KEY)
            }

            if (shapeClipboard && !hasImage) {
              return
            }

            if (hasImage && !shapeClipboard) {
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

                          setSelectedLayerId(imageLayer.id)
                          setTool('select')
                          updateLayersState()
                        }

                        img.src = event.target.result
                      }

                      reader.readAsDataURL(blob)
                    })

                  return // Stop after first image
                }
              }
            }
          })
          .catch(() => {})
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])



  // ==================== Undo/Redo ====================

  const handleUndo = () => {
    layerManagerRef.current?.undo()
    updateLayersState()
    renderCanvas()
  }

  const handleRedo = () => {
    layerManagerRef.current?.redo()
    updateLayersState()
    renderCanvas()
  }

  // ==================== Render ====================

  // Determine status bar message based on current state
  const getStatusMessage = () => {
    if (selectedShape) {
      return 'Shape selected · Delete: Del · Undo: Ctrl+Z · Paste image to add as layer'
    }
    return 'Undo: Ctrl+Z · Redo: Ctrl+Shift+Z · Paste image to add as layer'
  }

  return (
    <div className="annotate-container">
      <div className="annotate-main">
        <ToolsPanel
          tool={tool}
          setTool={setTool}
          selectedShapeRef={selectedShapeRef}
          toolHandlerRef={toolHandlerRef}
          zoom={zoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetView}
          copyToClipboard={copyToClipboard}
          downloadImage={downloadImage}
          downloadFormat={downloadFormat}
          setDownloadFormat={setDownloadFormat}
          setSelectedShape={setSelectedShape}
          installApp={installPrompt ? installApp : null}
          layerManagerRef={layerManagerRef}
          shapeRendererRef={shapeRendererRef}
          showSnackbar={showSnackbar}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={layerManagerRef.current?.canUndo() ?? false}
          canRedo={layerManagerRef.current?.canRedo() ?? false}
        />

        {/* Options Toolbar - always visible but empty when no tool/shape is active */}
        <ShapeOptionsPanel
          tool={tool}
          selectedShape={selectedShape}
          color={color}
          brushSize={brushSize}
          fontSize={fontSize}
          lineStyle={lineStyle}
          fillColor={fillColor}
          setFillColor={setFillColor}
          getSelectedShapeColor={getSelectedShapeColor}
          getSelectedShapeSize={getSelectedShapeSize}
          getSelectedShapeFillColor={getSelectedShapeFillColor}
          getSelectedShapeLineStyle={getSelectedShapeLineStyle}
          updateSelectedShapeColor={updateSelectedShapeColor}
          updateSelectedShapeSize={updateSelectedShapeSize}
          updateSelectedShapeFillColor={updateSelectedShapeFillColor}
          updateSelectedShapeLineStyle={updateSelectedShapeLineStyle}
          setColor={setColor}
          setBrushSize={setBrushSize}
          setFontSize={setFontSize}
          setLineStyle={setLineStyle}
          saveToolProperty={saveToolProperty}
          alignSelectedShapes={alignSelectedShapes}
          groupSelectedShapes={groupSelectedShapes}
          ungroupSelectedShapes={ungroupSelectedShapes}
          isGroupSelected={isGroupSelected}
          layerManagerRef={layerManagerRef}
          colorPickerRef={colorPickerRef}
          sizeSliderRef={sizeSliderRef}
          lineStyleSelectRef={lineStyleSelectRef}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          textDecoration={textDecoration}
          highlightColor={highlightColor}
          setFontWeight={setFontWeight}
          setFontStyle={setFontStyle}
          setTextDecoration={setTextDecoration}
          setHighlightColor={setHighlightColor}
          getSelectedShapeFontWeight={getSelectedShapeFontWeight}
          getSelectedShapeFontStyle={getSelectedShapeFontStyle}
          getSelectedShapeTextDecoration={getSelectedShapeTextDecoration}
          getSelectedShapeHighlightColor={getSelectedShapeHighlightColor}
          updateSelectedShapeTextFormat={updateSelectedShapeTextFormat}
          onStartCrop={startCrop}
          selectedStampId={selectedStampId}
          setSelectedStampId={setSelectedStampId}
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
            tool={tool}
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
            isCropping={isCropping}
            cropRect={cropRect}
            setCropRect={setCropRect}
            confirmCrop={confirmCrop}
            cancelCrop={cancelCrop}
            canvasManagerRef={canvasManagerRef}
            selectedShape={selectedShape}
            layerManagerRef={layerManagerRef}
          />

          {/* Layers Panel */}
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            renamingLayerId={renamingLayerId}
            renamingLayerName={renamingLayerName}
            isOpen={layersPanelOpen}
            onToggle={() => setLayersPanelOpen(prev => !prev)}
            selectLayer={selectLayer}
            toggleLayerVisibility={toggleLayerVisibility}
            toggleLayerLock={toggleLayerLock}
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
        <p>{getStatusMessage()} <button className="status-shortcut-link" onClick={() => setShowKeyboardShortcuts(true)}>Keyboard shortcuts (K)</button></p>
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
