#!/usr/bin/env node
// One-time bootstrap: creates the first admin account. Every other account
// can only be created by an existing admin (createStaffUser is admin-only),
// so this script exists purely to break that chicken-and-egg problem.
//
// Against the emulator:
//   FIRESTORE_EMULATOR_HOST=localhost:8081 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//     node scripts/bootstrap-admin.mjs "Full Name" email@example.com password
//
// Against the real project (after `firebase login`):
//   node scripts/bootstrap-admin.mjs "Full Name" email@example.com password
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const [, , name, email, password] = process.argv

if (!name || !email || !password) {
  console.error('Usage: node scripts/bootstrap-admin.mjs "Full Name" email@example.com password')
  process.exit(1)
}

const app = initializeApp({ projectId: 'euro-motor-58710' })
const auth = getAuth(app)
const db = getFirestore(app)

const userRecord = await auth.createUser({ email, password, displayName: name })
await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' })
await db.collection('users').doc(userRecord.uid).set({
  name,
  email,
  role: 'admin',
  status: 'active',
  createdAt: FieldValue.serverTimestamp(),
})

console.log(`Admin created: ${email} (uid: ${userRecord.uid})`)
