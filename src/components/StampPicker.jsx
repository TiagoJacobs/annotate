/**
 * Stamp Picker Component
 * Grid of available stamps organized by category
 */

import React from 'react'
import { STAMPS, STAMP_CATEGORIES } from '../assets/stamps'

const stampImages = {}
for (const [id, stamp] of Object.entries(STAMPS)) {
  const encoded = btoa(stamp.svg)
  stampImages[id] = `data:image/svg+xml;base64,${encoded}`
}

export const StampPicker = ({ selectedStampId, onSelect }) => {
  return (
    <div className="stamp-picker">
      {Object.entries(STAMP_CATEGORIES).map(([catKey, cat]) => (
        <div key={catKey} className="stamp-category">
          <span className="stamp-category-label">{cat.label}</span>
          <div className="stamp-category-items">
            {cat.ids.map(id => {
              const stamp = STAMPS[id]
              const isSelected = selectedStampId === id
              return (
                <button
                  key={id}
                  className={`stamp-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelect(id)}
                  title={stamp.name}
                >
                  <img
                    src={stampImages[id]}
                    alt={stamp.name}
                    style={{ maxWidth: '28px', maxHeight: '28px', pointerEvents: 'none' }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
