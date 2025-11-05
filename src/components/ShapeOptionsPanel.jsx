/**
 * Shape Options Panel Component
 * Renders color picker, size slider, and line style selector
 */

import React from 'react'

export const ShapeOptionsPanel = React.forwardRef(({
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
  colorPickerRef,
  sizeSliderRef,
  lineStyleSelectRef
}, ref) => {
  const showFontSize = tool === 'text'
  const isImageSelected = selectedShape && selectedShape.shapeType === 'image'
  const showOptions = tool !== 'select' && tool !== 'pan' || selectedShape

  // Don't show shape options if an image is selected
  if (isImageSelected) {
    return (
      <div className="shape-toolbar">
        <div className="toolbar-placeholder">No options available for images</div>
      </div>
    )
  }

  return (
    <div className="shape-toolbar">
      {showOptions ? (
        <>
          {/* Color Picker */}
          <div className="tool-group">
            <label>Color:</label>
            <input
              ref={colorPickerRef}
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
              ref={sizeSliderRef}
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
                ref={lineStyleSelectRef}
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
      ) : (
        <div className="toolbar-placeholder">Select a tool or shape to see options</div>
      )}
    </div>
  )
})
