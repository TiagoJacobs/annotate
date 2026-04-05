/**
 * Share Button Component
 * Handles Google Drive sharing flow with format selection and link popup
 */

import React, { useState, useRef, useEffect } from 'react'
import { Share2, Loader, ExternalLink, Copy, X } from 'lucide-react'
import { getAccessToken, isLoggedIn, signOut } from '../services/googleAuth'
import { uploadFileToDrive, makeFileShareable, getShareableLink } from '../services/googleDrive'
import { createCroppedCanvas } from '../utils/canvasExportUtils'
import '../styles/SharePopup.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function createSvgBlob(canvas) {
  const width = canvas.width
  const height = canvas.height

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', width)
  svg.setAttribute('height', height)
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('width', width)
  rect.setAttribute('height', height)
  rect.setAttribute('fill', 'white')
  svg.appendChild(rect)

  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  image.setAttribute('width', width)
  image.setAttribute('height', height)
  image.setAttribute('href', canvas.toDataURL('image/png'))
  svg.appendChild(image)

  const svgString = new XMLSerializer().serializeToString(svg)
  return new Blob([svgString], { type: 'image/svg+xml' })
}

export const ShareButton = ({ layerManagerRef, shapeRendererRef, showSnackbar }) => {
  const [isSharing, setIsSharing] = useState(false)
  const [shareFormat, setShareFormat] = useState('png')
  const [shareLink, setShareLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())
  const popupRef = useRef(null)

  useEffect(() => {
    if (!shareLink) return
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShareLink(null)
        setCopied(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [shareLink])

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

      let blob, fileName, mimeType
      if (shareFormat === 'svg') {
        blob = createSvgBlob(canvas)
        fileName = `annotate-${new Date().toISOString().slice(0, 10)}.svg`
        mimeType = 'image/svg+xml'
      } else {
        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        fileName = `annotate-${new Date().toISOString().slice(0, 10)}.png`
        mimeType = 'image/png'
      }

      if (!blob) {
        showSnackbar('Nothing to share - canvas is empty')
        return
      }

      const fileId = await uploadFileToDrive(token, blob, fileName, mimeType)
      await makeFileShareable(token, fileId)

      const link = getShareableLink(fileId)
      setShareLink(link)
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
      setShareLink(null)
      showSnackbar('Signed out from Google')
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpen = () => {
    window.open(shareLink, '_blank')
  }

  const handleClose = () => {
    setShareLink(null)
    setCopied(false)
  }

  return (
    <div className="share-wrapper">
      <div className="share-group">
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
        <select
          className="share-format-select"
          value={shareFormat}
          onChange={(e) => setShareFormat(e.target.value)}
          title="Select share format"
        >
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
        </select>
      </div>

      {shareLink && (
        <div className="share-popup" ref={popupRef}>
          <div className="share-popup-header">
            <span>Share link</span>
            <button className="share-popup-close" onClick={handleClose}>
              <X size={14} />
            </button>
          </div>
          <div className="share-popup-link">{shareLink}</div>
          <div className="share-popup-actions">
            <button className="share-popup-btn" onClick={handleOpen}>
              <ExternalLink size={14} />
              <span>Open</span>
            </button>
            <button className="share-popup-btn" onClick={handleCopy}>
              <Copy size={14} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
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
