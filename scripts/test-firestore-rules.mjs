#!/usr/bin/env node
// Automated check for the role-based access matrix in firestore.rules —
// this is the actual fix for the original PHP app's core vulnerability
// (every backend/api/*.php endpoint was callable by anyone, auth was only
// enforced client-side). Run against the Firestore emulator:
//
//   npm run emulators   (in one terminal)
//   npm run test:rules  (in another)
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore'
import fs from 'node:fs'

let pass = 0, fail = 0
function check(label, cond) { if (cond) { pass++; console.log(`PASS: ${label}`) } else { fail++; console.log(`FAIL: ${label}`) } }
async function expectDenied(promise, label) {
  try { await assertFails(promise); check(label, true) } catch { check(label, false) }
}
async function expectAllowed(promise, label) {
  try { await assertSucceeds(promise); check(label, true) } catch { check(label, false) }
}

const testEnv = await initializeTestEnvironment({
  projectId: 'euro-motor-58710',
  firestore: {
    rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1',
    port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8081),
  },
})

// Seed fixtures bypassing rules (as the Admin SDK / Cloud Functions would).
await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore()
  await setDoc(doc(db, 'customers', 'seed-cust'), { fullName: 'Seed Customer' })
  await setDoc(doc(db, 'transactions', 'seed-tx'), { transactionNo: 'TRX-SEED' })
  await setDoc(doc(db, 'users', 'seed-user'), { name: 'Seed', role: 'staff' })
  await setDoc(doc(db, 'mail', 'seed-mail'), { to: ['x@example.com'] })
  await setDoc(doc(db, 'counters', 'TRX-202601'), { count: 1 })
})

const anon = testEnv.unauthenticatedContext().firestore()
const noRole = testEnv.authenticatedContext('no-role-uid', {}).firestore()
const staff = testEnv.authenticatedContext('staff-uid', { role: 'staff' }).firestore()
const admin = testEnv.authenticatedContext('admin-uid', { role: 'admin' }).firestore()

await expectDenied(getDoc(doc(anon, 'customers', 'seed-cust')), 'unauthenticated read of customers is denied')
await expectDenied(getDoc(doc(noRole, 'customers', 'seed-cust')), 'signed-in user with no role cannot read customers')
await expectDenied(setDoc(doc(anon, 'transactions', 'hack'), { sellingPrice: 1 }), 'unauthenticated write to transactions is denied')

await expectAllowed(getDoc(doc(staff, 'customers', 'seed-cust')), 'staff CAN read customers')
await expectDenied(setDoc(doc(staff, 'customers', 'seed-cust'), { fullName: 'Hacked' }), 'staff CANNOT directly write customers (Cloud Function only)')
await expectDenied(setDoc(doc(admin, 'transactions', 'seed-tx'), { sellingPrice: 999999 }), 'admin CANNOT directly write transactions (Cloud Function only)')
await expectDenied(setDoc(doc(admin, 'counters', 'TRX-202601'), { count: 999 }), 'admin CANNOT directly write counters')

await expectAllowed(setDoc(doc(staff, 'inventory', 'inv-x'), { name: 'New Part', price: 100 }), 'staff CAN directly create/update inventory')
await expectDenied(setDoc(doc(anon, 'inventory', 'inv-y'), { name: 'Hack' }), 'unauthenticated CANNOT write inventory')

await expectAllowed(getDoc(doc(staff, 'users', 'seed-user')), 'staff CAN read users')
await expectDenied(setDoc(doc(admin, 'users', 'seed-user'), { role: 'admin' }), 'even admin CANNOT directly write users.role (Cloud Function only, prevents privilege escalation)')

await expectDenied(getDoc(doc(admin, 'mail', 'seed-mail')), 'mail is unreadable even by admin (Trigger Email extension / Cloud Functions only)')
await expectDenied(addDoc(collection(admin, 'mail'), { to: ['x'] }), 'admin cannot write mail directly (would bypass server-side templating)')

await testEnv.cleanup()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
