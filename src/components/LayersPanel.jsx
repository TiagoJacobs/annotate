/**
 * Layers Panel Component
 * Renders the layers list with visibility toggles, reordering, and deletion
 */

import React from 'react'
import { Eye, EyeOff, X, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'

export const LayersPanel = ({
  layers,
  selectedLayerId,
  renamingLayerId,
  renamingLayerName,
  selectLayer,
  toggleLayerVisibility,
  moveLayerInStack,
  deleteLayer,
  clearCanvas,
  addNewLayer,
  startRenamingLayer,
  saveLayerRename,
  setRenamingLayerName,
  handleLayerRenameKeyPress
}) => {
  return (
    <div className="layers-panel">
      <div className="layers-panel-header">
        <h3>Layers ({layers.length})</h3>
        <button className="layer-btn" onClick={addNewLayer} title="Add new layer">
          <Plus size={16} />
        </button>
        {layers.length > 0 && (
          <button className="layer-btn layer-btn-delete" onClick={clearCanvas} title="Clear all layers">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="layers-list">
        {layers.length === 0 ? (
          <div className="no-layers">No layers yet</div>
        ) : (
          <>
            {[...layers].reverse().map((layer, displayIndex) => {
              const actualIndex = layers.length - 1 - displayIndex
              const isRenaming = renamingLayerId === layer.id

              return (
                <div
                  key={layer.id}
                  className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
                  onClick={() => selectLayer(layer.id)}
                >
                  <div className="layer-content">
                    <button
                      className="layer-visibility"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerVisibility(layer.id)
                      }}
                    >
                      {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div className="layer-info">
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renamingLayerName}
                          onChange={(e) => setRenamingLayerName(e.target.value)}
                          onKeyDown={handleLayerRenameKeyPress}
                          onBlur={saveLayerRename}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="layer-text-input"
                        />
                      ) : (
                        <span
                          className="layer-name"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startRenamingLayer(layer)
                          }}
                        >
                          {layer.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="layer-actions">
                    <button
                      className="layer-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayerInStack(layer.id, 'down')
                      }}
                      disabled={actualIndex === 0}
                      title="Move up in stack (visually higher)"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="layer-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveLayerInStack(layer.id, 'up')
                      }}
                      disabled={actualIndex === layers.length - 1}
                      title="Move down in stack (visually lower)"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      className="layer-btn layer-btn-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (layers.length <= 1) {
                          return
                        }
                        deleteLayer(layer.id)
                      }}
                      disabled={layers.length <= 1}
                      title={layers.length <= 1 ? "Cannot delete last layer" : "Delete layer"}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
