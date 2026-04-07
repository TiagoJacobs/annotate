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
  Minus,
  Spline,
  Type,
  ZoomIn,
  ZoomOut,
  Home,
  MousePointer,
  Github,
  Monitor,
  Stamp,
  Highlighter,
  Undo2,
  Redo2,
} from 'lucide-react'
import { toolRegistry } from '../tools/toolRegistry'
import { ShareButton } from './ShareButton'

const iconMap = {
  pen: <Pen size={20} />,
  highlighter: <Highlighter size={20} />,
  'arrow-right': <ArrowRight size={20} />,
  minus: <Minus size={20} />,
  square: <Square size={20} />,
  circle: <Circle size={20} />,
  type: <Type size={20} />,
  cable: <Spline size={20} />,
  pointer: <MousePointer size={20} />,
  sticker: <Stamp size={20} />,
}

const toolGroups = [
  ['select'],
  ['pen', 'highlighter'],
  ['arrow', 'line', 'rect', 'ellipse'],
  ['text', 'stamp'],
  ['connector'],
]

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
  setSelectedShape,
  installApp,
  layerManagerRef,
  shapeRendererRef,
  showSnackbar,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="annotate-toolbar">
      {/* Drawing Tools - grouped by intent */}
      {toolGroups.map((group, groupIndex) => (
        <div className="tool-group" key={groupIndex}>
          {group.map((toolId) => {
            const toolConfig = toolRegistry[toolId]
            if (!toolConfig) return null
            return (
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
                title={`${toolConfig.name}${toolConfig.shortcutKey ? ` (${toolConfig.shortcutKey})` : ''}`}
              >
                {iconMap[toolConfig.icon]}
              </button>
            )
          })}
        </div>
      ))}

      {/* Undo/Redo */}
      <div className="tool-group">
        <button className="action-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button className="action-btn" onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={18} />
        </button>
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
        <button className="action-btn" onClick={copyToClipboard} title="Copy to clipboard">
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
        <ShareButton
          layerManagerRef={layerManagerRef}
          shapeRendererRef={shapeRendererRef}
          showSnackbar={showSnackbar}
        />
        {installApp && (
          <button className="action-btn" onClick={installApp} title="Install as app">
            <Monitor size={18} />
            <span className="btn-text">Install</span>
          </button>
        )}
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
  )
}
