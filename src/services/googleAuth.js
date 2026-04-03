/**
 * Google Authentication Service
 * Handles Google Identity Services OAuth 2.0 for client-side apps
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

let tokenClient = null
let accessToken = null
let scriptLoaded = false

/**
 * Load the Google Identity Services script
 */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) {
      resolve()
      return
    }

    if (document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)) {
      // Script tag exists but may still be loading
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          scriptLoaded = true
          clearInterval(check)
          resolve()
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

/**
 * Initialize the Google OAuth token client
 */
export async function initGoogleAuth(clientId) {
  if (!clientId) {
    throw new Error('Google Client ID is required. Set VITE_GOOGLE_CLIENT_ID environment variable.')
  }

  await loadGisScript()

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error))
            return
          }
          accessToken = response.access_token
          resolve(accessToken)
        },
      })
      // Trigger the consent flow
      tokenClient.requestAccessToken()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Get a valid access token, prompting sign-in if needed
 */
export async function getAccessToken(clientId) {
  if (accessToken) {
    // Check if token is still valid
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken)
      if (response.ok) return accessToken
    } catch {
      // Token is invalid, fall through to re-auth
    }
  }

  return initGoogleAuth(clientId)
}

/**
 * Sign out / revoke token
 */
export function signOut() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke(accessToken)
    accessToken = null
  }
}
