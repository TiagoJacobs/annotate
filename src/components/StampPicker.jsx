/**
 * Stamp Picker Component
 * Grid of available stamps for selection
 */

import React from 'react'
import { STAMPS, STAMP_IDS } from '../assets/stamps'

const stampImages = {}
STAMP_IDS.forEach(id => {
  const encoded = btoa(STAMPS[id].svg)
  stampImages[id] = `data:image/svg+xml;base64,${encoded}`
})

export const StampPicker = ({ selectedStampId, onSelect }) => {
  return (
    <div className="stamp-picker" style={{
      display: 'flex',
      gap: '2px',
    }}>
      {STAMP_IDS.map(id => {
        const stamp = STAMPS[id]
        const isSelected = selectedStampId === id
        return (
          <button
            key={id}
            className="layer-btn"
            onClick={() => onSelect(id)}
            title={stamp.name}
            style={{
              width: '32px',
              height: '32px',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSelected ? '#667eea' : undefined,
              borderRadius: '4px',
            }}
          >
            <img
              src={stampImages[id]}
              alt={stamp.name}
              style={{ width: '24px', height: '24px', pointerEvents: 'none' }}
            />
          </button>
        )
      })}
    </div>
  )
}
