#!/usr/bin/env node
// One-time migration: MySQL `motor_shop` -> Firestore/Storage/Auth.
// Maps 1:1 to docs/firestore-architecture.md, derived from scripts/reference-schema.sql.
//
// SAFETY: defaults to a DRY RUN against the Firebase Emulator Suite. It will
// refuse to touch the real project unless you pass --live explicitly.
//
// Usage (dry run — start emulators first: `npm run emulators`):
//   FIRESTORE_EMULATOR_HOST=localhost:8081 \
//   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//   FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199 \
//     node scripts/migrate-to-firestore.mjs
//
// Usage (real project — after `firebase login`, MySQL/XAMPP running):
//     node scripts/migrate-to-firestore.mjs --live
//
// MySQL connection defaults match backend/config/database.php; override via
// env vars if yours differ: MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD.
//
// Firestore doc IDs are deterministic (`cust-{id}`, `inv-{id}`, `tx-{id}`, ...),
// derived from the MySQL primary key. This makes the script idempotent (safe
// to re-run — it overwrites rather than duplicates) and makes post-migration
// spot-checks trivial (a Firestore doc ID tells you exactly which MySQL row
// it came from). Auth UIDs are likewise set to `user-{id}` via `createUser({ uid })`.

import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const require = createRequire(import.meta.url)
const mysql = require('mysql2/promise')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.join(__dirname, '..', 'backend')

const isLive = process.argv.includes('--live')
const projectId = process.env.FIREBASE_PROJECT_ID || 'euro-motor-58710'
const storageBucket = process.env.STORAGE_BUCKET || `${projectId}.firebasestorage.app`

if (isLive && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`\n⚠️  LIVE MODE — this will write to the real "${projectId}" project (Firestore, Auth, Storage).`)
  console.log('   Make sure MySQL/XAMPP is running with your real data, and that you have run `firebase login`.\n')
} else if (!isLive && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    '\n❌ Refusing to run: no FIRESTORE_EMULATOR_HOST is set and --live was not passed.\n' +
    '   Start the emulators first (`npm run emulators`) and set FIRESTORE_EMULATOR_HOST / ' +
    'FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST, or pass --live to target the real project.\n'
  )
  process.exit(1)
}

const app = initializeApp({ projectId, storageBucket })
const auth = getAuth(app)
const db = getFirestore(app)
const bucket = getStorage(app).bucket()

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  database: process.env.MYSQL_DATABASE || 'motor_shop',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
})

const stats = { users: 0, customers: 0, inventory: 0, units: 0, transactions: 0, installmentPayments: 0, partsTransactions: 0 }
const warnings = []

// ---------------------------------------------------------------------------
// Storage upload helper — resolves a MySQL-stored path (e.g.
// "uploads/customers/169..._valid_id_photo.png") against backend/, uploads
// it to Storage under a Firestore-doc-scoped path, and returns a Firebase
// download-token URL (same format the client SDK's getDownloadURL() produces
// — see src/lib/customers.js/inventory.js). This is required rather than a
// plain public bucket URL: production Storage buckets use uniform
// bucket-level access (per-object ACLs are ignored) and storage.rules
// restrict reads to signed-in staff, so only the token-bearing URL actually
// resolves for an <img src> without auth headers. Missing files are logged
// as warnings and skipped (the migration continues rather than aborting on
// one bad row).
async function uploadIfExists(mysqlPath, storagePathPrefix, label) {
  if (!mysqlPath) return null
  const cleaned = String(mysqlPath).replace(/^\.\.[/\\]/, '').replace(/^backend[/\\]/, '')
  const localPath = path.join(backendDir, cleaned)
  if (!fs.existsSync(localPath)) {
    warnings.push(`${label}: file not found at ${localPath} (referenced as "${mysqlPath}")`)
    return null
  }
  const destination = `${storagePathPrefix}/${path.basename(localPath)}`
  const downloadToken = crypto.randomUUID()
  await bucket.upload(localPath, { destination, metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } } })

  const encodedPath = encodeURIComponent(destination)
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  const base = emulatorHost ? `http://${emulatorHost}` : 'https://firebasestorage.googleapis.com'
  return `${base}/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`
}

// ---------------------------------------------------------------------------
async function migrateUsers(rows) {
  console.log('\n--- users ---')
  for (const row of rows) {
    const uid = `user-${row.id}`
    try {
      await auth.createUser({
        uid,
        email: row.email,
        displayName: row.name,
        disabled: row.status !== 'active',
      })
    } catch (err) {
      if (err.code !== 'auth/uid-already-exists') throw err
    }
    // Re-import to set the original bcrypt hash — createUser() above can't set
    // a pre-hashed password directly, so importUsers() does the real password carry-over.
    await auth.importUsers(
      [{
        uid,
        email: row.email,
        displayName: row.name,
        disabled: row.status !== 'active',
        passwordHash: Buffer.from(row.password),
      }],
      { hash: { algorithm: 'BCRYPT' } }
    )
    await auth.setCustomUserClaims(uid, { role: row.role })
    await db.collection('users').doc(uid).set({
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at) : FieldValue.serverTimestamp(),
    })
    stats.users++
  }
  console.log(`  migrated ${stats.users} users`)
}

// ---------------------------------------------------------------------------
async function migrateCustomers(rows) {
  console.log('\n--- customers ---')
  for (const row of rows) {
    const customerId = `cust-${row.id}`
    const [validIdUrl, barangayClearanceUrl, utilityReceiptUrl, proofOfIncomeUrl, coMakerIdUrl] = await Promise.all([
      uploadIfExists(row.valid_id_path, `customers/${customerId}`, `customer ${row.id} valid_id`),
      uploadIfExists(row.barangay_clearance_path, `customers/${customerId}`, `customer ${row.id} barangay_clearance`),
      uploadIfExists(row.utility_receipt_path, `customers/${customerId}`, `customer ${row.id} utility_receipt`),
      uploadIfExists(row.proof_of_income_path, `customers/${customerId}`, `customer ${row.id} proof_of_income`),
      uploadIfExists(row.co_maker_id_path, `customers/${customerId}`, `customer ${row.id} co_maker_id`),
    ])

    const normalizedEmail = String(row.email).toLowerCase().trim()
    await db.collection('customerEmails').doc(normalizedEmail).set({ customerId })
    await db.collection('customers').doc(customerId).set({
      fullName: row.full_name,
      contactNumber: row.contact_number,
      email: normalizedEmail,
      homeAddress: row.home_address,
      birthDate: row.birth_date ? formatDateOnly(row.birth_date) : null,
      civilStatus: row.civil_status || null,
      occupation: row.occupation || null,
      monthlyIncome: row.monthly_income != null ? Number(row.monthly_income) : null,
      documents: { validIdUrl, barangayClearanceUrl, utilityReceiptUrl, proofOfIncomeUrl },
      coMaker: {
        name: row.co_maker_name || null,
        contact: row.co_maker_contact || null,
        relationship: row.co_maker_relationship || null,
        address: row.co_maker_address || null,
        idUrl: coMakerIdUrl,
      },
      addedBy: { uid: null, name: row.added_by_name || 'Unknown', role: row.added_by_role || 'staff' },
      createdAt: row.created_at ? new Date(row.created_at) : FieldValue.serverTimestamp(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : FieldValue.serverTimestamp(),
    })
    stats.customers++
  }
  console.log(`  migrated ${stats.customers} customers`)
}

// ---------------------------------------------------------------------------
async function migrateInventoryAndUnits(items, units) {
  console.log('\n--- inventory + inventory_units ---')
  const unitsByInventoryId = new Map()
  for (const unit of units) {
    if (!unitsByInventoryId.has(unit.inventory_id)) unitsByInventoryId.set(unit.inventory_id, [])
    unitsByInventoryId.get(unit.inventory_id).push(unit)
  }

  for (const item of items) {
    const inventoryId = `inv-${item.id}`
    const imageUrl = await uploadIfExists(item.image, `inventory/${inventoryId}`, `inventory ${item.id} image`)
    const isPart = !!item.is_part

    const itemUnits = unitsByInventoryId.get(item.id) || []
    let availableCount = 0
    for (const unit of itemUnits) {
      const unitId = `unit-${unit.id}`
      await db.collection('unitEngineNumbers').doc(unit.engine_number.toUpperCase()).set({ inventoryId, unitId })
      await db.collection('unitChassisNumbers').doc(unit.chassis_number.toUpperCase()).set({ inventoryId, unitId })
      await db.collection('inventory').doc(inventoryId).collection('units').doc(unitId).set({
        engineNumber: unit.engine_number.toUpperCase(),
        chassisNumber: unit.chassis_number.toUpperCase(),
        color: unit.color || null,
        status: unit.unit_status,
        purchaseDate: unit.purchase_date ? formatDateOnly(unit.purchase_date) : null,
        sellingPrice: unit.selling_price != null ? Number(unit.selling_price) : null,
        notes: unit.notes || '',
        createdAt: unit.created_at ? new Date(unit.created_at) : FieldValue.serverTimestamp(),
        updatedAt: unit.updated_at ? new Date(unit.updated_at) : FieldValue.serverTimestamp(),
      })
      if (unit.unit_status === 'Available') availableCount++
      stats.units++
    }

    // Motorcycles: stock is a live count of Available units (matches
    // statusFromAvailable() in functions/src/inventory.ts). Parts: stock
    // mirrors the row's own `quantity` column, same as the original.
    const stock = isPart ? Number(item.quantity) || 0 : availableCount
    await db.collection('inventory').doc(inventoryId).set({
      sku: item.sku,
      name: item.name,
      brand: isPart ? '' : (item.brand || ''),
      category: item.category,
      type: item.type,
      price: Number(item.price) || 0,
      description: item.description || '',
      color: item.color || null,
      isPart,
      quantity: isPart ? Number(item.quantity) || 0 : 0,
      imageUrl: imageUrl || '',
      stock,
      status: stock > 0 ? 'In Stock' : (itemUnits.length === 0 && !isPart ? 'No Units' : 'Out of Stock'),
      statusColor: stock > 0 ? 'green' : (itemUnits.length === 0 && !isPart ? 'gray' : 'red'),
      createdAt: item.created_at ? new Date(item.created_at) : FieldValue.serverTimestamp(),
      updatedAt: item.updated_at ? new Date(item.updated_at) : FieldValue.serverTimestamp(),
    })
    stats.inventory++
  }
  console.log(`  migrated ${stats.inventory} inventory items, ${stats.units} units`)
}

// ---------------------------------------------------------------------------
function monthKeyFromTransactionNo(transactionNo) {
  // "TRX-202608-00007" / "PRT-202608-00007" -> { monthKey: "202608", seq: 7 }
  const match = /-(\d{6})-(\d+)$/.exec(transactionNo)
  return match ? { monthKey: match[1], seq: Number(match[2]) } : null
}

async function seedCounters(prefix, counterState) {
  for (const [monthKey, maxSeq] of counterState.entries()) {
    await db.collection('counters').doc(`${prefix}-${monthKey}`).set({ count: maxSeq }, { merge: true })
  }
}

// ---------------------------------------------------------------------------
async function migrateTransactionsAndPayments(rows, payments) {
  console.log('\n--- transactions + installment_payments ---')
  const paymentsByTransactionId = new Map()
  for (const p of payments) {
    if (!paymentsByTransactionId.has(p.transaction_id)) paymentsByTransactionId.set(p.transaction_id, [])
    paymentsByTransactionId.get(p.transaction_id).push(p)
  }

  const trxCounters = new Map()

  for (const row of rows) {
    const transactionId = `tx-${row.id}`
    const customerId = `cust-${row.customer_id}`
    const inventoryId = `inv-${row.inventory_id}`
    const unitId = `unit-${row.unit_id}`

    const [customerSnap, inventorySnap, unitSnap] = await Promise.all([
      db.collection('customers').doc(customerId).get(),
      db.collection('inventory').doc(inventoryId).get(),
      db.collection('inventory').doc(inventoryId).collection('units').doc(unitId).get(),
    ])
    const customer = customerSnap.data() || {}
    const inventory = inventorySnap.data() || {}
    const unit = unitSnap.data() || {}
    if (!customerSnap.exists) warnings.push(`transaction ${row.id}: customer ${row.customer_id} not found`)
    if (!inventorySnap.exists) warnings.push(`transaction ${row.id}: inventory ${row.inventory_id} not found`)

    await db.collection('transactions').doc(transactionId).set({
      transactionNo: row.transaction_no,
      customerId,
      customerName: customer.fullName || '',
      customerContact: customer.contactNumber || '',
      inventoryId,
      inventoryName: inventory.name || '',
      inventorySku: inventory.sku || '',
      inventoryType: inventory.type || '',
      brand: inventory.brand || '',
      imageUrl: inventory.imageUrl || '',
      unitId,
      engineNumber: unit.engineNumber || '',
      chassisNumber: unit.chassisNumber || '',
      color: unit.color || '',
      paymentType: row.payment_type,
      sellingPrice: Number(row.selling_price) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      downPayment: Number(row.down_payment) || 0,
      terms: row.terms ?? null,
      monthlyAmount: row.monthly_amount != null ? Number(row.monthly_amount) : null,
      balance: Number(row.balance) || 0,
      transactionDate: formatDateOnly(row.transaction_date),
      notes: row.notes || '',
      status: row.status,
      remainingBalance: Number(row.remaining_balance) || 0,
      lastPaymentDate: row.last_payment_date ? formatDateOnly(row.last_payment_date) : null,
      nextDueDate: row.next_due_date ? formatDateOnly(row.next_due_date) : null,
      processedBy: {
        uid: row.processed_by_id ? `user-${row.processed_by_id}` : null,
        name: row.processed_by_name || 'Unknown',
        role: row.processed_by_role || 'Unknown',
      },
      createdAt: row.created_at ? new Date(row.created_at) : FieldValue.serverTimestamp(),
    })
    stats.transactions++

    const parsed = monthKeyFromTransactionNo(row.transaction_no)
    if (parsed) {
      const current = trxCounters.get(parsed.monthKey) || 0
      trxCounters.set(parsed.monthKey, Math.max(current, parsed.seq))
    }

    for (const payment of paymentsByTransactionId.get(row.id) || []) {
      await db.collection('transactions').doc(transactionId).collection('installmentPayments').doc(`pay-${payment.id}`).set({
        paymentNo: payment.payment_no,
        dueDate: formatDateOnly(payment.due_date),
        amountDue: Number(payment.amount_due) || 0,
        amountPaid: Number(payment.amount_paid) || 0,
        paymentDate: payment.payment_date ? formatDateOnly(payment.payment_date) : null,
        status: payment.status,
        penaltyAmount: Number(payment.penalty_amount) || 0,
        paymentMethod: payment.payment_method || 'Cash',
        referenceNo: payment.reference_no || null,
        notes: payment.notes || '',
        createdAt: payment.created_at ? new Date(payment.created_at) : FieldValue.serverTimestamp(),
        updatedAt: payment.updated_at ? new Date(payment.updated_at) : FieldValue.serverTimestamp(),
      })
      stats.installmentPayments++
    }
  }

  await seedCounters('TRX', trxCounters)
  console.log(`  migrated ${stats.transactions} transactions, ${stats.installmentPayments} installment payments`)
  console.log(`  seeded TRX counters for months: ${[...trxCounters.keys()].join(', ') || '(none)'}`)
}

// ---------------------------------------------------------------------------
async function migratePartsTransactions(rows) {
  console.log('\n--- parts_transactions ---')
  const prtCounters = new Map()

  for (const row of rows) {
    const partsTransactionId = `ptx-${row.id}`
    const inventoryId = `inv-${row.inventory_id}`
    const inventorySnap = await db.collection('inventory').doc(inventoryId).get()
    const inventory = inventorySnap.data() || {}
    if (!inventorySnap.exists) warnings.push(`parts transaction ${row.id}: inventory ${row.inventory_id} not found`)

    await db.collection('partsTransactions').doc(partsTransactionId).set({
      transactionNo: row.transaction_no,
      customerName: row.customer_name,
      inventoryId,
      inventoryName: inventory.name || '',
      imageUrl: inventory.imageUrl || '',
      quantity: Number(row.quantity) || 1,
      price: Number(row.price) || 0,
      totalAmount: Number(row.total_amount) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      changeAmount: Number(row.change_amount) || 0,
      paymentType: row.payment_type || 'Cash',
      transactionDate: formatDateOnly(row.transaction_date),
      notes: row.notes || '',
      status: row.status || 'Completed',
      processedBy: {
        uid: row.processed_by_id ? `user-${row.processed_by_id}` : null,
        name: row.processed_by_name || 'Unknown',
        role: row.processed_by_role || 'Unknown',
      },
      createdAt: row.created_at ? new Date(row.created_at) : FieldValue.serverTimestamp(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : FieldValue.serverTimestamp(),
    })
    stats.partsTransactions++

    const parsed = monthKeyFromTransactionNo(row.transaction_no)
    if (parsed) {
      const current = prtCounters.get(parsed.monthKey) || 0
      prtCounters.set(parsed.monthKey, Math.max(current, parsed.seq))
    }
  }

  await seedCounters('PRT', prtCounters)
  console.log(`  migrated ${stats.partsTransactions} parts transactions`)
  console.log(`  seeded PRT counters for months: ${[...prtCounters.keys()].join(', ') || '(none)'}`)
}

// ---------------------------------------------------------------------------
function formatDateOnly(value) {
  // mysql2 returns DATE columns as JS Date objects in local time; format as
  // a plain YYYY-MM-DD string per the project's date convention (see
  // docs/firestore-architecture.md "Date handling convention").
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`Migrating "${process.env.MYSQL_DATABASE || 'motor_shop'}" -> Firestore project "${projectId}"`)
  console.log(isLive ? 'Mode: LIVE (real project)' : 'Mode: DRY RUN (emulator)')

  const [[users], [customers], [items], [units], [transactions], [payments], [partsTransactions]] = await Promise.all([
    pool.query('SELECT * FROM users'),
    pool.query('SELECT * FROM customers'),
    pool.query('SELECT * FROM inventory'),
    pool.query('SELECT * FROM inventory_units'),
    pool.query('SELECT * FROM transactions'),
    pool.query('SELECT * FROM installment_payments'),
    pool.query('SELECT * FROM parts_transactions'),
  ])

  await migrateUsers(users)
  await migrateCustomers(customers)
  await migrateInventoryAndUnits(items, units)
  await migrateTransactionsAndPayments(transactions, payments)
  await migratePartsTransactions(partsTransactions)

  printSummary()
  await pool.end()
}

function printSummary() {
  console.log('\n=== Summary ===')
  console.table(stats)
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`)
    warnings.forEach((w) => console.log(`  - ${w}`))
  } else {
    console.log('\nNo warnings.')
  }
  console.log('\nNote: password_resets is intentionally not migrated — Firebase Auth\'s native password-reset flow replaces it (see Module 1).')
}

// Only run automatically when executed directly (`node scripts/migrate-to-firestore.mjs`),
// not when imported by a test harness against synthetic rows.
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((err) => {
    console.error('\n❌ Migration failed:', err)
    process.exit(1)
  })
}

export { migrateUsers, migrateCustomers, migrateInventoryAndUnits, migrateTransactionsAndPayments, migratePartsTransactions, stats, warnings, printSummary, db, auth, bucket, pool }
