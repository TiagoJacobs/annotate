/**
 * Stamp Picker Component
 * Grid of available stamps for selection
 */

import React from 'react'
import { STAMPS, STAMP_IDS } from '../assets/stamps'

export const StampPicker = ({ selectedStampId, onSelect }) => {
  return (
    <div className="stamp-picker" style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '4px',
      maxWidth: '200px',
    }}>
      {STAMP_IDS.map(id => {
        const stamp = STAMPS[id]
        return (
          <button
            key={id}
            className="layer-btn"
            onClick={() => onSelect(id)}
            title={stamp.name}
            style={{
              width: '36px',
              height: '36px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selectedStampId === id ? '#667eea' : undefined,
              borderRadius: '4px',
            }}
            dangerouslySetInnerHTML={{ __html: stamp.svg }}
          />
        )
      })}
    </div>
  )
}
