import { useEffect } from 'react'
import { X } from 'lucide-react'
import '../styles/KeyboardShortcutsModal.css'

export const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = [
    // Tool Selection
    { key: '1', description: 'Select Pen tool' },
    { key: '2', description: 'Select Arrow tool' },
    { key: '3', description: 'Select Rectangle tool' },
    { key: '4', description: 'Select Ellipse tool' },
    { key: '5', description: 'Select Text tool' },
    { key: '6', description: 'Select Selection tool' },
    { key: '7', description: 'Select Pan tool' },

    // Editing
    { key: 'Ctrl+Z', description: 'Undo' },
    { key: 'Ctrl+Shift+Z', description: 'Redo' },
    { key: 'Ctrl+C', description: 'Copy selected shapes' },
    { key: 'Ctrl+V', description: 'Paste shapes (incremental offset)' },
    { key: 'Ctrl+A', description: 'Select all shapes' },
    { key: 'Delete / Backspace', description: 'Delete selected shape' },

    // Canvas Navigation
    { key: 'Scroll Wheel', description: 'Zoom in/out' },
    { key: '+', description: 'Zoom in' },
    { key: '-', description: 'Zoom out' },
    { key: 'Arrow Keys', description: 'Pan canvas / Move selected shape' },
    { key: 'Shift + Arrow', description: 'Move selected shape 10px' },
    { key: 'Middle Mouse Drag', description: 'Pan canvas (any tool)' },

    // Shape Properties
    { key: 'C', description: 'Focus color picker' },
    { key: 'W', description: 'Focus line weight slider' },
    { key: 'S', description: 'Focus line style selector' },

    // Other
    { key: 'K', description: 'Show keyboard shortcuts' },
    { key: 'Escape', description: 'Clear selection / Back to select tool' },
  ]

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>
        <div className="shortcuts-modal-content">
          <div className="shortcuts-grid">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="shortcuts-modal-footer">
          <button className="shortcuts-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
