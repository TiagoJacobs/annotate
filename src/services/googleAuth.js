/**
 * Google Authentication Service
 * Handles Google Identity Services OAuth 2.0 for client-side apps
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const TOKEN_KEY = 'annotate_google_token'
const EXPIRY_KEY = 'annotate_google_token_expiry'

let tokenClient = null
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

function saveToken(token, expiresIn) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
}

function getSavedToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = Number(localStorage.getItem(EXPIRY_KEY))
  if (token && expiry && Date.now() < expiry - 60000) {
    return token
  }
  return null
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}

/**
 * Request a new access token via Google consent popup
 */
function requestToken(clientId) {
  return new Promise((resolve, reject) => {
    const callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error))
        return
      }
      saveToken(response.access_token, response.expires_in)
      resolve(response.access_token)
    }

    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback,
      })
    } else {
      tokenClient.callback = callback
    }

    tokenClient.requestAccessToken()
  })
}

/**
 * Get a valid access token, prompting sign-in only if needed
 */
export async function getAccessToken(clientId) {
  const saved = getSavedToken()
  if (saved) return saved

  await loadGisScript()
  return requestToken(clientId)
}

/**
 * Check if user has a valid saved token
 */
export function isLoggedIn() {
  return getSavedToken() !== null
}

/**
 * Sign out / revoke token
 */
export function signOut() {
  const token = getSavedToken()
  if (token) {
    window.google?.accounts?.oauth2?.revoke(token)
  }
  clearToken()
}
