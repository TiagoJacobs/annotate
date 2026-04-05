/**
 * Google Drive Service
 * Upload files and manage sharing via Drive API v3
 */

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files'

/**
 * Upload a file blob to Google Drive
 * @param {string} accessToken - OAuth access token
 * @param {Blob} blob - File blob
 * @param {string} fileName - File name for the upload
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} File ID
 */
export async function uploadFileToDrive(accessToken, blob, fileName, mimeType) {
  const metadata = {
    name: fileName,
    mimeType,
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Drive upload failed: ${error}`)
  }

  const result = await response.json()
  return result.id
}

/**
 * Make a file publicly shareable (anyone with link can view)
 * @param {string} accessToken - OAuth access token
 * @param {string} fileId - Drive file ID
 */
export async function makeFileShareable(accessToken, fileId) {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to set sharing permissions: ${error}`)
  }
}

/**
 * Get shareable link for a file
 * @param {string} fileId - Drive file ID
 * @returns {string} Shareable URL
 */
export function getShareableLink(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}
