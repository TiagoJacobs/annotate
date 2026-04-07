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
    // Listen for the new service worker to take control before reloading
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      window.location.reload()
    })
    // Clear all caches so the reload fetches fresh assets
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map(name => caches.delete(name)))
    }
    await updateServiceWorker(true)
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
