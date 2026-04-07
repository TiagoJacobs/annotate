import { useRegisterSW } from 'virtual:pwa-register/react'
import '../styles/UpdatePrompt.css'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, UPDATE_CHECK_INTERVAL)
    },
  })

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
