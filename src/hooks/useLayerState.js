import { useState } from 'react'

/**
 * Custom hook for managing layer-related state
 */
export const useLayerState = () => {
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)

  return {
    layers,
    setLayers,
    selectedLayerId,
    setSelectedLayerId,
  }
}
