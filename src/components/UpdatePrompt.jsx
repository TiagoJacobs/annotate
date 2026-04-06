import { useRegisterSW } from 'virtual:pwa-register/react'
import '../styles/UpdatePrompt.css'

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  const handleUpdate = async () => {
    await updateServiceWorker(true)
    window.location.reload()
  }

  return (
    <div className="update-prompt">
      <span>A new version is available</span>
      <button className="update-prompt-btn" onClick={handleUpdate}>
        Update
      </button>
    </div>
  )
}
