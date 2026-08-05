import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Values come from .env.local (real project config, gitignored — see
// .env.example for the template). Vite only exposes vars prefixed
// VITE_ to client code, and these are the public Web SDK config values
// (safe to ship to the browser; access is enforced by Security Rules,
// not by keeping this config secret).
//
// Only Auth and Firestore are used directly from the client SDK. Cloud
// Functions and Cloud Storage both require the Firebase Blaze plan, which
// this project deliberately avoids — that logic now lives on a separately
// hosted API (see server/ and src/lib/api.js) backed by Cloudinary for
// file storage instead of Firebase Storage.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
