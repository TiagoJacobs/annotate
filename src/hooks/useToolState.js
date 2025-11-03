import { useState } from 'react'

/**
 * Custom hook for managing tool-related state
 */
export const useToolState = () => {
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(3)
  const [fontSize, setFontSize] = useState(20)

  return {
    tool,
    setTool,
    color,
    setColor,
    brushSize,
    setBrushSize,
    fontSize,
    setFontSize,
  }
}
