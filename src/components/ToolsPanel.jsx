/**
 * Tools Panel Component
 * Renders toolbar with drawing tools, zoom controls, and export actions
 */

import React, { useState, useRef, useEffect } from 'react'
import {
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
  Highlighter,
  Shapes,
  Undo2,
  Redo2,
  Share2,
  ChevronDown,
  Menu,
  Info,
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
  shapes: <Shapes size={20} />,
  sticker: (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor">
      <circle cx="16" cy="16" r="13" strokeWidth="2" fill="none"/>
      <text x="16" y="22" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">N</text>
    </svg>
  ),
}

const toolGroups = [
  ['select'],
  ['pen', 'highlighter'],
  ['arrow', 'line', 'rect', 'ellipse'],
  ['text', 'stamp'],
  ['diagram', 'connector'],
]

const ExportDropdown = ({ downloadImage, setDownloadFormat, layerManagerRef, shapeRendererRef, showSnackbar }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleDownload = (format) => {
    setDownloadFormat(format)
    downloadImage(format)
    setIsOpen(false)
  }

  return (
    <div className="export-dropdown-wrapper" ref={dropdownRef}>
      <ShareButton
        layerManagerRef={layerManagerRef}
        shapeRendererRef={shapeRendererRef}
        showSnackbar={showSnackbar}
      />
      <button
        className="export-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="More export options"
      >
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="export-dropdown-menu">
          <button className="export-dropdown-item" onClick={() => handleDownload('png')}>
            <Download size={14} />
            <span>Download PNG</span>
          </button>
          <button className="export-dropdown-item" onClick={() => handleDownload('svg')}>
            <Download size={14} />
            <span>Download SVG</span>
          </button>
        </div>
      )}
    </div>
  )
}

const AppMenu = ({ installApp }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="app-menu-wrapper" ref={menuRef}>
      <button
        className="action-btn app-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Menu"
      >
        <Menu size={18} />
      </button>
      {isOpen && (
        <div className="app-menu-dropdown">
          {installApp && (
            <button className="app-menu-item" onClick={() => { installApp(); setIsOpen(false) }}>
              <Monitor size={14} />
              <span>Install App</span>
            </button>
          )}
          <a
            href="https://github.com/TiagoJacobs/annotate"
            target="_blank"
            rel="noopener noreferrer"
            className="app-menu-item"
            onClick={() => setIsOpen(false)}
          >
            <Github size={14} />
            <span>GitHub</span>
          </a>
          <div className="app-menu-item app-menu-about">
            <Info size={14} />
            <span>Annotate — Canvas annotation tool</span>
          </div>
        </div>
      )}
    </div>
  )
}

export const ToolsPanel = ({
  tool,
  setTool,
  selectedShapeRef,
  toolHandlerRef,
  zoom,
  zoomIn,
  zoomOut,
  resetView,
  downloadImage,
  setDownloadFormat,
  setSelectedShape,
  installApp,
  layerManagerRef,
  shapeRendererRef,
  showSnackbar,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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
        <button className="action-btn" onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
          <Undo2 size={18} />
        </button>
        <button className="action-btn" onClick={onRedo} title="Redo (Ctrl+Shift+Z)" disabled={!canRedo}>
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

      {/* Export (Share + Download dropdown) & App Menu */}
      <div className="tool-group">
        <ExportDropdown
          downloadImage={downloadImage}
          setDownloadFormat={setDownloadFormat}
          layerManagerRef={layerManagerRef}
          shapeRendererRef={shapeRendererRef}
          showSnackbar={showSnackbar}
        />
        <AppMenu installApp={installApp} />
      </div>
    </div>
  )
}
