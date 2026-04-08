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
    { key: 'V / 1', description: 'Select tool' },
    { key: 'P / 2', description: 'Pen tool' },
    { key: 'H / 3', description: 'Highlighter tool' },
    { key: 'A / 4', description: 'Arrow tool' },
    { key: 'L / 5', description: 'Line tool' },
    { key: 'R / 6', description: 'Rectangle tool' },
    { key: 'E / 7', description: 'Ellipse tool' },
    { key: 'T / 8', description: 'Text tool' },
    { key: 'S / 9', description: 'Stamp tool' },
    { key: 'D', description: 'Diagram shapes tool' },
    { key: '0', description: 'Connector tool' },

    // Editing
    { key: 'Ctrl+C', description: 'Copy selected shapes' },
    { key: 'Ctrl+X', description: 'Cut selected shapes' },
    { key: 'Ctrl+V', description: 'Paste shapes (incremental offset)' },
    { key: 'Ctrl+A', description: 'Select all shapes' },
    { key: 'Ctrl+G', description: 'Group selected shapes' },
    { key: 'Ctrl+Shift+G', description: 'Ungroup shapes' },
    { key: 'Delete / Backspace', description: 'Delete selected shape' },

    // Canvas Navigation
    { key: 'Ctrl+Scroll', description: 'Zoom in/out' },
    { key: 'Scroll Wheel', description: 'Adjust brush size (drawing tools)' },
    { key: '+', description: 'Zoom in' },
    { key: '-', description: 'Zoom out' },
    { key: 'Ctrl+0', description: 'Reset zoom' },
    { key: 'Arrow Keys', description: 'Pan canvas / Move selected shape' },
    { key: 'Shift + Arrow', description: 'Move selected shape 10px' },
    { key: 'Space + Drag', description: 'Pan canvas (any tool)' },
    { key: 'Middle Mouse Drag', description: 'Pan canvas (any tool)' },

    // Shape Properties
    { key: 'W', description: 'Focus line weight slider' },

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
