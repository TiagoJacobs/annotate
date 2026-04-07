/**
 * Shape Options Panel Component
 * Renders color picker, size slider, and line style selector
 */

import React, { useMemo } from 'react'
import { AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Group, Ungroup, Bold, Italic, Underline, Crop } from 'lucide-react'
import { ShapeOperations } from '../services/ShapeOperations'
import { StampPicker } from './StampPicker'
import { getToolConfig } from '../tools/toolRegistry'

export const ShapeOptionsPanel = React.forwardRef(({
  tool,
  selectedShape,
  color,
  brushSize,
  fontSize,
  lineStyle,
  fillColor,
  setFillColor,
  getSelectedShapeColor,
  getSelectedShapeSize,
  getSelectedShapeFillColor,
  getSelectedShapeLineStyle,
  updateSelectedShapeColor,
  updateSelectedShapeSize,
  updateSelectedShapeFillColor,
  updateSelectedShapeLineStyle,
  setColor,
  setBrushSize,
  setFontSize,
  setLineStyle,
  alignSelectedShapes,
  groupSelectedShapes,
  ungroupSelectedShapes,
  isGroupSelected,
  layerManagerRef,
  saveToolProperty,
  colorPickerRef,
  sizeSliderRef,
  lineStyleSelectRef,
  fontWeight,
  fontStyle,
  textDecoration,
  highlightColor,
  setFontWeight,
  setFontStyle,
  setTextDecoration,
  setHighlightColor,
  getSelectedShapeFontWeight,
  getSelectedShapeFontStyle,
  getSelectedShapeTextDecoration,
  getSelectedShapeHighlightColor,
  updateSelectedShapeTextFormat,
  onStartCrop,
  selectedStampId,
  setSelectedStampId,
  selectedDiagramId,
  setSelectedDiagramId,
}, _ref) => {
  const showFontSize = tool === 'text'
  const isImageSelected = selectedShape && selectedShape.shapeType === 'image'
  const showOptions = (tool !== 'select' && tool !== 'pan' && tool !== 'stamp' && tool !== 'diagram') || selectedShape
  const fillableTools = ['rect', 'ellipse']
  const isFillableShape = selectedShape && (
    Array.isArray(selectedShape)
      ? selectedShape.every(s => fillableTools.includes(s.shapeType))
      : fillableTools.includes(selectedShape.shapeType)
  )
  const showFill = fillableTools.includes(tool) || isFillableShape
  const isTextTool = tool === 'text'
  const isTextShapeSelected = selectedShape && !Array.isArray(selectedShape) && selectedShape.shapeType === 'text'
  const showTextFormatting = isTextTool || isTextShapeSelected
  const isMultiSelect = Array.isArray(selectedShape) && selectedShape.length >= 2
  const showAlignment = useMemo(() => {
    if (!isMultiSelect || !layerManagerRef?.current) return false
    return ShapeOperations.getAlignmentUnitCount(selectedShape, layerManagerRef.current) >= 2
  }, [isMultiSelect, selectedShape, layerManagerRef])

  // Determine if line style should be shown
  const toolConfig = getToolConfig(tool)
  const showLineStyle = selectedShape
    ? getSelectedShapeLineStyle() !== null
    : !!toolConfig?.properties?.lineStyle

  // Show crop button for images
  if (isImageSelected) {
    return (
      <div className="shape-toolbar">
        {onStartCrop ? (
          <div className="tool-group">
            <button
              className="option-btn"
              onClick={onStartCrop}
              title="Crop image"
            >
              <Crop size={14} />
              <span>Crop</span>
            </button>
          </div>
        ) : (
          <div className="toolbar-placeholder">No options available for images</div>
        )}
      </div>
    )
  }

  if (tool === 'stamp') {
    return (
      <div className="shape-toolbar">
        <div className="tool-group">
          <label>Stamp:</label>
          <StampPicker selectedStampId={selectedStampId} onSelect={setSelectedStampId} category="annotation" />
        </div>
      </div>
    )
  }

  if (tool === 'diagram') {
    return (
      <div className="shape-toolbar">
        <div className="tool-group">
          <label>Shape:</label>
          <StampPicker selectedStampId={selectedDiagramId} onSelect={setSelectedDiagramId} category="diagram" />
        </div>
      </div>
    )
  }

  // Collapse when no options to show
  if (!showOptions) return null

  return (
    <div className="shape-toolbar">
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

      {/* Fill Color Picker */}
      {showFill && (
        <div className="tool-group">
          <label>Fill:</label>
          <div className="option-btn-group">
            <input
              type="color"
              value={(selectedShape ? getSelectedShapeFillColor() : fillColor) || '#ffffff'}
              onChange={(e) => {
                if (selectedShape) {
                  updateSelectedShapeFillColor(e.target.value)
                } else {
                  setFillColor(e.target.value)
                }
              }}
              className="color-picker"
            />
            <button
              className={`option-btn ${(selectedShape ? !getSelectedShapeFillColor() : !fillColor) ? 'muted' : ''}`}
              onClick={() => {
                if (selectedShape) {
                  updateSelectedShapeFillColor('')
                } else {
                  setFillColor('')
                }
              }}
              title="No fill"
            >
              None
            </button>
          </div>
        </div>
      )}

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

      {/* Text Formatting Controls */}
      {showTextFormatting && (
        <div className="tool-group">
          <label>Format:</label>
          <div className="option-btn-group">
            <button
              className={`format-btn ${(isTextShapeSelected ? getSelectedShapeFontWeight() === 'bold' : fontWeight === 'bold') ? 'active' : ''}`}
              onClick={() => {
                const current = isTextShapeSelected ? getSelectedShapeFontWeight() : fontWeight
                const newValue = current === 'bold' ? 'normal' : 'bold'
                if (isTextShapeSelected) {
                  updateSelectedShapeTextFormat('fontWeight', newValue)
                }
                setFontWeight(newValue)
              }}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              className={`format-btn ${(isTextShapeSelected ? getSelectedShapeFontStyle() === 'italic' : fontStyle === 'italic') ? 'active' : ''}`}
              onClick={() => {
                const current = isTextShapeSelected ? getSelectedShapeFontStyle() : fontStyle
                const newValue = current === 'italic' ? 'normal' : 'italic'
                if (isTextShapeSelected) {
                  updateSelectedShapeTextFormat('fontStyle', newValue)
                }
                setFontStyle(newValue)
              }}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              className={`format-btn ${(isTextShapeSelected ? getSelectedShapeTextDecoration() === 'underline' : textDecoration === 'underline') ? 'active' : ''}`}
              onClick={() => {
                const current = isTextShapeSelected ? getSelectedShapeTextDecoration() : textDecoration
                const newValue = current === 'underline' ? 'none' : 'underline'
                if (isTextShapeSelected) {
                  updateSelectedShapeTextFormat('textDecoration', newValue)
                }
                setTextDecoration(newValue)
              }}
              title="Underline"
            >
              <Underline size={14} />
            </button>
          </div>
        </div>
      )}


      {/* Line Style Control */}
      {showLineStyle && (
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

      {/* Alignment Controls */}
      {showAlignment && (
        <div className="tool-group">
          <label>Align:</label>
          <div className="option-btn-group">
            <button className="format-btn" onClick={() => alignSelectedShapes('left')} title="Align left">
              <AlignStartVertical size={14} />
            </button>
            <button className="format-btn" onClick={() => alignSelectedShapes('centerH')} title="Align center horizontally">
              <AlignCenterVertical size={14} />
            </button>
            <button className="format-btn" onClick={() => alignSelectedShapes('right')} title="Align right">
              <AlignEndVertical size={14} />
            </button>
            <button className="format-btn" onClick={() => alignSelectedShapes('top')} title="Align top">
              <AlignStartHorizontal size={14} />
            </button>
            <button className="format-btn" onClick={() => alignSelectedShapes('centerV')} title="Align center vertically">
              <AlignCenterHorizontal size={14} />
            </button>
            <button className="format-btn" onClick={() => alignSelectedShapes('bottom')} title="Align bottom">
              <AlignEndHorizontal size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Group/Ungroup Controls */}
      {isMultiSelect && !isGroupSelected && (
        <div className="tool-group">
          <button className="option-btn" onClick={groupSelectedShapes} title="Group selected shapes (Ctrl+G)">
            <Group size={14} />
            <span>Group</span>
            <kbd style={{ fontSize: '10px', color: '#888', marginLeft: '2px' }}>Ctrl+G</kbd>
          </button>
        </div>
      )}
      {isGroupSelected && (
        <div className="tool-group">
          <button className="option-btn" onClick={ungroupSelectedShapes} title="Ungroup shapes (Ctrl+Shift+G)">
            <Ungroup size={14} />
            <span>Ungroup</span>
            <kbd style={{ fontSize: '10px', color: '#888', marginLeft: '2px' }}>Ctrl+Shift+G</kbd>
          </button>
        </div>
      )}
    </div>
  )
})
