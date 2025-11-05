/**
 * Tools Panel Component
 * Renders toolbar with drawing tools, zoom controls, and export actions
 */

import React from 'react'
import {
  Copy,
  Pen,
  Download,
  Square,
  Circle,
  ArrowRight,
  Type,
  ZoomIn,
  ZoomOut,
  Home,
  MousePointer,
  Hand,
} from 'lucide-react'
import { toolRegistry } from '../tools/toolRegistry'

export const ToolsPanel = ({
  tool,
  setTool,
  selectedShapeRef,
  toolHandlerRef,
  zoom,
  zoomIn,
  zoomOut,
  resetView,
  copyToClipboard,
  downloadImage,
  downloadFormat,
  setDownloadFormat,
  showFontSize,
  color,
  brushSize,
  fontSize,
  lineStyle,
  getSelectedShapeColor,
  getSelectedShapeSize,
  getSelectedShapeLineStyle,
  updateSelectedShapeColor,
  updateSelectedShapeSize,
  updateSelectedShapeLineStyle,
  setColor,
  setBrushSize,
  setFontSize,
  setLineStyle,
  setSelectedShape
}) => {
  const iconMap = {
    pen: <Pen size={20} />,
    'arrow-right': <ArrowRight size={20} />,
    square: <Square size={20} />,
    circle: <Circle size={20} />,
    type: <Type size={20} />,
    pointer: <MousePointer size={20} />,
    hand: <Hand size={20} />,
  }

  return (
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
  )
}
