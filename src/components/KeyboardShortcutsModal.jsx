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
    { key: '1-7', description: 'Select tool (1=Pen, 2=Arrow, 3=Rect, 4=Ellipse, 5=Text, 6=Select, 7=Pan)' },
    { key: 'C', description: 'Focus color picker' },
    { key: 'W', description: 'Focus line weight' },
    { key: 'S', description: 'Focus line style' },
    { key: 'K', description: 'Show keyboard shortcuts' },
    { key: 'Ctrl+Z', description: 'Undo' },
    { key: 'Ctrl+Shift+Z', description: 'Redo' },
    { key: 'Ctrl+A', description: 'Select all shapes' },
    { key: 'Delete', description: 'Delete selected shape' },
    { key: '+', description: 'Zoom in' },
    { key: '-', description: 'Zoom out' },
    { key: 'Arrow Keys', description: 'Move selected shape' },
    { key: 'Shift + Arrow', description: 'Move shape 10px' },
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
