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
  handleCanvasMiddleMouseDown,
  handleCanvasMiddleMouseMove,
  handleCanvasMiddleMouseUp,
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
        onMouseDown={(e) => {
          if (e.button === 1) {
            handleCanvasMiddleMouseDown(e)
          } else {
            handleCanvasMouseDown(e)
          }
        }}
        onMouseMove={(e) => {
          if (e.buttons === 4) {
            handleCanvasMiddleMouseMove(e)
          } else {
            handleCanvasMouseMove(e)
          }
        }}
        onMouseUp={(e) => {
          if (e.button === 1) {
            handleCanvasMiddleMouseUp(e)
          } else {
            handleCanvasMouseUp(e)
          }
        }}
        onMouseLeave={(e) => {
          handleCanvasMiddleMouseUp(e)
          handleCanvasMouseUp(e)
        }}
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
