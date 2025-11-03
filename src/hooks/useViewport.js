import { useState } from 'react'

/**
 * Custom hook for managing viewport state (zoom, pan)
 */
export const useViewport = () => {
  const [zoom, setZoom] = useState(1)

  const updateZoom = (newZoom) => {
    const clampedZoom = Math.max(0.1, Math.min(10, newZoom))
    setZoom(clampedZoom)
    return clampedZoom
  }

  return {
    zoom,
    setZoom,
    updateZoom,
  }
}
