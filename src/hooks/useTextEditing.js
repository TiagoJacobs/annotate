import { useState } from 'react'

/**
 * Custom hook for managing text editing state
 */
export const useTextEditing = () => {
  const [editingTextLayerId, setEditingTextLayerId] = useState(null)
  const [editingTextContent, setEditingTextContent] = useState('')

  const startEditing = (layerId, initialContent) => {
    setEditingTextLayerId(layerId)
    setEditingTextContent(initialContent)
  }

  const cancelEditing = () => {
    setEditingTextLayerId(null)
    setEditingTextContent('')
  }

  return {
    editingTextLayerId,
    setEditingTextLayerId,
    editingTextContent,
    setEditingTextContent,
    startEditing,
    cancelEditing,
  }
}
