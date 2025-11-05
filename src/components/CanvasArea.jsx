/**
 * Canvas Area Component
 * Renders the main canvas and inline text editor
 */

import React from 'react'

export const CanvasArea = ({
  canvasRef,
  inlineEditingText,
  setInlineEditingText,
  handleCanvasClick,
  handleCanvasDoubleClick,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleInlineTextKeyPress,
  saveInlineTextEdit,
  zoom,
  layers
}) => {
  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
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
  )
}
