/**
 * Share Button Component
 * Handles Google Drive sharing flow with link popup
 */

import React, { useState, useRef, useEffect } from 'react'
import { Share2, Loader, ExternalLink, Copy, X } from 'lucide-react'
import { getAccessToken, isLoggedIn, signOut } from '../services/googleAuth'
import { uploadFileToDrive, makeFileShareable, getDownloadLink, getDriveLink } from '../services/googleDrive'
import { createCroppedCanvas } from '../utils/canvasExportUtils'
import '../styles/SharePopup.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const ShareButton = ({ layerManagerRef, shapeRendererRef, showSnackbar }) => {
  const [isSharing, setIsSharing] = useState(false)
  const [fileId, setFileId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())
  const popupRef = useRef(null)

  useEffect(() => {
    if (!fileId) return
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setFileId(null)
        setCopied(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [fileId])

  const handleShare = async () => {
    if (!GOOGLE_CLIENT_ID) {
      showSnackbar('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID env variable.')
      return
    }

    setIsSharing(true)
    try {
      const token = await getAccessToken(GOOGLE_CLIENT_ID)
      setLoggedIn(true)

      const canvas = createCroppedCanvas(layerManagerRef.current, shapeRendererRef.current)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const fileName = `annotate-${new Date().toISOString().slice(0, 10)}.png`
      const mimeType = 'image/png'

      if (!blob) {
        showSnackbar('Nothing to share - canvas is empty')
        return
      }

      const id = await uploadFileToDrive(token, blob, fileName, mimeType)
      await makeFileShareable(token, id)

      setFileId(id)
      setCopied(false)
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

  const handleLogout = () => {
    if (window.confirm('Sign out from Google? You will need to sign in again to share.')) {
      signOut()
      setLoggedIn(false)
      setFileId(null)
      showSnackbar('Signed out from Google')
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getDownloadLink(fileId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenDrive = () => {
    window.open(getDriveLink(fileId), '_blank')
  }

  const handleClose = () => {
    setFileId(null)
    setCopied(false)
  }

  return (
    <div className="share-wrapper">
      <button
        className="action-btn share-btn"
        onClick={handleShare}
        disabled={isSharing}
        title={GOOGLE_CLIENT_ID ? 'Share to Google Drive' : 'Share (requires VITE_GOOGLE_CLIENT_ID)'}
        style={{ opacity: GOOGLE_CLIENT_ID ? 1 : 0.5 }}
      >
        {isSharing ? <Loader size={18} className="spinning" /> : <Share2 size={18} />}
        <span className="btn-text">{isSharing ? 'Sharing...' : 'Share'}</span>
      </button>

      {fileId && (
        <div className="share-popup" ref={popupRef}>
          <div className="share-popup-header">
            <span>Shared to Google Drive</span>
            <button className="share-popup-close" onClick={handleClose}>
              <X size={14} />
            </button>
          </div>
          <div className="share-popup-link">{getDownloadLink(fileId)}</div>
          <div className="share-popup-actions">
            <button className="share-popup-btn" onClick={handleCopy}>
              <Copy size={14} />
              <span>{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
            <button className="share-popup-btn" onClick={handleOpenDrive}>
              <ExternalLink size={14} />
              <span>View in Drive</span>
            </button>
          </div>
          {loggedIn && (
            <div className="share-popup-auth">
              <span>Signed in to Google</span>
              <button className="share-popup-auth-logout" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
