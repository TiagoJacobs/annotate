/**
 * Shape Options Panel Component
 * Renders color picker, size slider, and line style selector
 */

import React from 'react'

export const ShapeOptionsPanel = ({
  tool,
  selectedShape,
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
  saveToolProperty,
  MIN_TEXT_SIZE,
  MAX_TEXT_SIZE,
  MIN_BRUSH_SIZE,
  MAX_BRUSH_SIZE
}) => {
  const showFontSize = tool === 'text'
  const showOptions = tool !== 'select' || selectedShape

  if (!showOptions) {
    return <div className="shape-toolbar" />
  }

  return (
    <div className="shape-toolbar">
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
          min={selectedShape ? (getSelectedShapeSize()?.type === 'fontSize' ? MIN_TEXT_SIZE : MIN_BRUSH_SIZE) : (showFontSize ? MIN_TEXT_SIZE : MIN_BRUSH_SIZE)}
          max={selectedShape ? (getSelectedShapeSize()?.type === 'fontSize' ? MAX_TEXT_SIZE : MAX_BRUSH_SIZE) : (showFontSize ? MAX_TEXT_SIZE : MAX_BRUSH_SIZE)}
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
    </div>
  )
}
