import { useEffect } from 'react'
import '../styles/Snackbar.css'

export const Snackbar = ({ message, isOpen, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div className="snackbar-container">
      <div className="snackbar-message">{message}</div>
    </div>
  )
}
