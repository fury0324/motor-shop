// src/lib/api.js
// Replaces firebase/functions' httpsCallable() now that the backend logic
// lives on a separately-hosted Express API (see server/) instead of Cloud
// Functions — Cloud Functions require the Blaze plan, which this project is
// deliberately avoiding. Every call still goes through the same Firebase ID
// token the app already has from signing in, verified server-side exactly
// the way Cloud Functions verified request.auth.
import { auth } from './firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function authHeader() {
  const user = auth.currentUser
  if (!user) throw new Error('You must be signed in.')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

// Mirrors what httpsCallable(fn)(data) used to do: POST data as JSON, get
// the function's return value back directly (no more { data: ... } wrapper
// firebase/functions used — call sites were updated accordingly).
export async function callApi(endpoint, data) {
  const headers = await authHeader()
  const res = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(body?.error?.message || `Request failed (${res.status})`)
    error.code = body?.error?.code
    throw error
  }
  return body
}

// Replaces uploadBytes()/getDownloadURL() from firebase/storage — the file
// goes to the API, which uploads it to Cloudinary server-side (API secret
// never reaches the browser) and returns the resulting URL.
export async function uploadFile(file, folder) {
  const headers = await authHeader()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error?.message || `Upload failed (${res.status})`)
  }
  return body.url
}
