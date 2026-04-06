import { useRegisterSW } from 'virtual:pwa-register/react'
import '../styles/UpdatePrompt.css'

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-prompt">
      <span>A new version is available</span>
      <button className="update-prompt-btn" onClick={() => updateServiceWorker(true)}>
        Update
      </button>
    </div>
  )
}
