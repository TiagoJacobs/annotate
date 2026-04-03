/**
 * Share Button Component
 * Handles Google Drive sharing flow
 */

import React, { useState } from 'react'
import { Share2, Loader } from 'lucide-react'
import { getAccessToken } from '../services/googleAuth'
import { uploadPngToDrive, makeFileShareable, getShareableLink } from '../services/googleDrive'
import { createCroppedCanvas } from '../utils/canvasExportUtils'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const ShareButton = ({ layerManagerRef, shapeRendererRef, showSnackbar }) => {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!GOOGLE_CLIENT_ID) {
      showSnackbar('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID env variable.')
      return
    }

    setIsSharing(true)
    try {
      // Get access token (will prompt sign-in if needed)
      const token = await getAccessToken(GOOGLE_CLIENT_ID)

      // Export canvas as PNG
      const canvas = createCroppedCanvas(layerManagerRef.current, shapeRendererRef.current)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

      if (!blob) {
        showSnackbar('Nothing to share - canvas is empty')
        return
      }

      // Upload to Drive
      const fileName = `annotate-${new Date().toISOString().slice(0, 10)}.png`
      const fileId = await uploadPngToDrive(token, blob, fileName)

      // Make shareable
      await makeFileShareable(token, fileId)

      // Get link and copy to clipboard
      const link = getShareableLink(fileId)
      await navigator.clipboard.writeText(link)

      showSnackbar('Link copied to clipboard!')
    } catch (err) {
      if (err.message?.includes('popup_closed') || err.message?.includes('access_denied')) {
        showSnackbar('Sign-in was cancelled')
      } else {
        showSnackbar(`Share failed: ${err.message}`)
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button
      className="action-btn"
      onClick={handleShare}
      disabled={isSharing}
      title={GOOGLE_CLIENT_ID ? 'Share to Google Drive' : 'Share (requires VITE_GOOGLE_CLIENT_ID)'}
      style={{ opacity: GOOGLE_CLIENT_ID ? 1 : 0.5 }}
    >
      {isSharing ? <Loader size={18} className="spinning" /> : <Share2 size={18} />}
      <span className="btn-text">{isSharing ? 'Sharing...' : 'Share'}</span>
    </button>
  )
}
