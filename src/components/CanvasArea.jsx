/**
 * Canvas Area Component
 * Renders the main canvas and inline text editor
 */

import React, { useState, useCallback } from 'react'

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
  layers,
  // Crop props
  isCropping,
  cropRect,
  setCropRect,
  confirmCrop,
  cancelCrop,
  canvasManagerRef,
  selectedShape,
  layerManagerRef,
}) => {
  const [cropStart, setCropStart] = useState(null)

  const handleCropMouseDown = useCallback((e) => {
    if (!isCropping || !canvasManagerRef?.current) return
    e.preventDefault()
    const coords = canvasManagerRef.current.screenToCanvas(e.clientX, e.clientY)
    setCropStart(coords)
    setCropRect(null)
  }, [isCropping, canvasManagerRef, setCropRect])

  const handleCropMouseMove = useCallback((e) => {
    if (!cropStart || !canvasManagerRef?.current) return
    const coords = canvasManagerRef.current.screenToCanvas(e.clientX, e.clientY)
    setCropRect({
      x: Math.min(cropStart.x, coords.x),
      y: Math.min(cropStart.y, coords.y),
      width: Math.abs(coords.x - cropStart.x),
      height: Math.abs(coords.y - cropStart.y),
    })
  }, [cropStart, canvasManagerRef, setCropRect])

  const handleCropMouseUp = useCallback(() => {
    setCropStart(null)
  }, [])

  const handleCropKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      confirmCrop()
    } else if (e.key === 'Escape') {
      cancelCrop()
    }
  }, [confirmCrop, cancelCrop])

  // Get crop overlay position in screen coords
  const getCropOverlayStyle = () => {
    if (!cropRect || !canvasManagerRef?.current || !canvasRef?.current) return null
    const cm = canvasManagerRef.current
    const canvasEl = canvasRef.current
    const containerEl = canvasEl.parentElement
    const canvasBounds = canvasEl.getBoundingClientRect()
    const containerBounds = containerEl.getBoundingClientRect()
    const offsetX = canvasBounds.left - containerBounds.left
    const offsetY = canvasBounds.top - containerBounds.top
    const topLeft = cm.canvasToScreen(cropRect.x, cropRect.y)
    const bottomRight = cm.canvasToScreen(cropRect.x + cropRect.width, cropRect.y + cropRect.height)
    return {
      left: topLeft.screenX + offsetX,
      top: topLeft.screenY + offsetY,
      width: bottomRight.screenX - topLeft.screenX,
      height: bottomRight.screenY - topLeft.screenY,
    }
  }

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        onClick={isCropping ? undefined : handleCanvasClick}
        onDoubleClick={isCropping ? undefined : handleCanvasDoubleClick}
        onMouseDown={isCropping ? handleCropMouseDown : (e) => {
          if (e.button === 1) {
            handleCanvasMiddleMouseDown(e)
          } else {
            handleCanvasMouseDown(e)
          }
        }}
        onMouseMove={isCropping ? handleCropMouseMove : (e) => {
          if (e.buttons === 4) {
            handleCanvasMiddleMouseMove(e)
          } else {
            handleCanvasMouseMove(e)
          }
        }}
        onMouseUp={isCropping ? handleCropMouseUp : (e) => {
          if (e.button === 1) {
            handleCanvasMiddleMouseUp(e)
          } else {
            handleCanvasMouseUp(e)
          }
        }}
        onMouseLeave={isCropping ? handleCropMouseUp : (e) => {
          handleCanvasMiddleMouseUp(e)
          handleCanvasMouseUp(e)
        }}
        onKeyDown={isCropping ? handleCropKeyDown : undefined}
        tabIndex={isCropping ? 0 : undefined}
        className={`drawing-canvas ${layers.length > 0 ? 'has-image' : ''}`}
        style={isCropping ? { cursor: 'crosshair' } : undefined}
      />

      {/* Crop selection overlay */}
      {isCropping && cropRect && (() => {
        const style = getCropOverlayStyle()
        return style ? (
          <div
            style={{
              position: 'absolute',
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              border: '2px dashed #667eea',
              background: 'rgba(102, 126, 234, 0.1)',
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />
        ) : null
      })()}

      {/* Crop action bar */}
      {isCropping && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          background: '#1a1a2e',
          padding: '6px 12px',
          borderRadius: '6px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          <span style={{ color: '#ccc', fontSize: '12px', alignSelf: 'center' }}>
            {cropRect ? 'Press Enter to crop, Esc to cancel' : 'Draw a rectangle to crop'}
          </span>
          {cropRect && (
            <>
              <button onClick={confirmCrop} style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>
                Crop
              </button>
              <button onClick={cancelCrop} style={{ background: '#444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}

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
            fontWeight: inlineEditingText.fontWeight || 'normal',
            fontStyle: inlineEditingText.fontStyle || 'normal',
            textDecoration: inlineEditingText.textDecoration === 'underline' ? 'underline' : 'none',
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
