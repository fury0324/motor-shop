#!/usr/bin/env node
// Populates the Firebase Emulator Suite with realistic sample data across
// every collection in docs/firestore-architecture.md, so the running app
// (npm run dev, with VITE_USE_FIREBASE_EMULATOR=true) has something to show
// instead of empty screens. Writes directly via the Admin SDK (bypassing
// Cloud Functions/rules), same approach as scripts/migrate-to-firestore.mjs.
//
// Refuses to run unless FIRESTORE_EMULATOR_HOST is set — this must never
// touch the real project.
//
// Usage:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 \
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//     node scripts/seed-emulator.mjs

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    '\n❌ Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
    '   This script only ever targets the emulator. Start it first (`npm run emulators`) and set\n' +
    '   FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST before running.\n'
  )
  process.exit(1)
}

const app = initializeApp({ projectId: 'euro-motor-58710' })
const auth = getAuth(app)
const db = getFirestore(app)

function isoDate(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}
const today = new Date()
const monthKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`

// ---------------------------------------------------------------------------
async function seedUser({ uid, name, email, password, role }) {
  // The account may already exist from an earlier bootstrap-admin.mjs run
  // (with a different, randomly-assigned uid) — reuse it instead of
  // colliding on email.
  let actualUid = uid
  try {
    const existing = await auth.getUserByEmail(email)
    actualUid = existing.uid
  } catch {
    await auth.createUser({ uid, email, password, displayName: name })
  }
  await auth.setCustomUserClaims(actualUid, { role })
  await db.collection('users').doc(actualUid).set({
    name, email, role, status: 'active', createdAt: FieldValue.serverTimestamp(),
  })
  return actualUid
}

console.log('--- users ---')
const adminUid = await seedUser({ uid: 'seed-admin', name: 'Test Admin', email: 'admin@test.com', password: 'password123', role: 'admin' })
const cashierUid = await seedUser({ uid: 'seed-cashier', name: 'Test Cashier', email: 'cashier@test.com', password: 'password123', role: 'cashier' })
await seedUser({ uid: 'seed-staff', name: 'Test Staff', email: 'staff@test.com', password: 'password123', role: 'staff' })
console.log('  admin@test.com / cashier@test.com / staff@test.com — all password123')

// ---------------------------------------------------------------------------
console.log('\n--- customers ---')
const customerSeeds = [
  { fullName: 'Juan Dela Cruz', contactNumber: '09171234567', email: 'juan.delacruz@example.com', homeAddress: '123 Rizal St, Zamboanga City', civilStatus: 'Married', occupation: 'Tricycle Driver', monthlyIncome: 18000 },
  { fullName: 'Maria Santos', contactNumber: '09181234567', email: 'maria.santos@example.com', homeAddress: '45 Mabini Ave, Zamboanga City', civilStatus: 'Single', occupation: 'Sari-sari Store Owner', monthlyIncome: 22000 },
  { fullName: 'Pedro Reyes', contactNumber: '09191234567', email: 'pedro.reyes@example.com', homeAddress: '78 Burgos St, Zamboanga City', civilStatus: 'Married', occupation: 'Fisherman', monthlyIncome: 15000 },
  { fullName: 'Ana Lim', contactNumber: '09201234567', email: 'ana.lim@example.com', homeAddress: '12 Veterans Ave, Zamboanga City', civilStatus: 'Single', occupation: 'Nurse', monthlyIncome: 28000 },
  { fullName: 'Carlos Garcia', contactNumber: '09211234567', email: 'carlos.garcia@example.com', homeAddress: '90 Governor Alvarez, Zamboanga City', civilStatus: 'Married', occupation: 'Carpenter', monthlyIncome: 17000 },
]
const customerIds = []
for (const c of customerSeeds) {
  const ref = db.collection('customers').doc()
  await db.collection('customerEmails').doc(c.email).set({ customerId: ref.id })
  await ref.set({
    fullName: c.fullName,
    contactNumber: c.contactNumber,
    email: c.email,
    homeAddress: c.homeAddress,
    birthDate: '1990-01-15',
    civilStatus: c.civilStatus,
    occupation: c.occupation,
    monthlyIncome: c.monthlyIncome,
    documents: { validIdUrl: null, barangayClearanceUrl: null, utilityReceiptUrl: null, proofOfIncomeUrl: null },
    coMaker: { name: null, contact: null, relationship: null, address: null, idUrl: null },
    addedBy: { uid: adminUid, name: 'Test Admin', role: 'admin' },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  customerIds.push({ id: ref.id, ...c })
}
console.log(`  seeded ${customerIds.length} customers`)

// ---------------------------------------------------------------------------
console.log('\n--- inventory + units ---')
const motorcycleSeeds = [
  { name: 'Honda Click 125i', brand: 'Honda', sku: 'HC125', type: 'Scooter', price: 89000, units: [['Red', 'Available'], ['Blue', 'Available'], ['Black', 'Sold']] },
  { name: 'Yamaha Mio Sporty', brand: 'Yamaha', sku: 'YMS110', type: 'Scooter', price: 75000, units: [['White', 'Available'], ['Red', 'Sold']] },
  { name: 'Suzuki Raider 150', brand: 'Suzuki', sku: 'SR150', type: 'Sports', price: 118000, units: [['Blue', 'Available'], ['Black', 'Available']] },
  { name: 'Kawasaki Barako II', brand: 'Kawasaki', sku: 'KB2', type: 'Utility', price: 68000, units: [['Green', 'Available']] },
]
const partSeeds = [
  { name: 'Brake Pad Set', sku: 'BP-001', price: 500, quantity: 25 },
  { name: 'Engine Oil 1L', sku: 'EO-001', price: 350, quantity: 40 },
  { name: 'Spark Plug', sku: 'SP-001', price: 150, quantity: 3 },
]

const inventory = {}
for (const m of motorcycleSeeds) {
  const itemRef = db.collection('inventory').doc()
  const unitRefs = []
  for (const [color, status] of m.units) {
    const unitRef = itemRef.collection('units').doc()
    const engineNumber = `ENG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const chassisNumber = `CHS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    await db.collection('unitEngineNumbers').doc(engineNumber).set({ inventoryId: itemRef.id, unitId: unitRef.id })
    await db.collection('unitChassisNumbers').doc(chassisNumber).set({ inventoryId: itemRef.id, unitId: unitRef.id })
    await unitRef.set({
      engineNumber, chassisNumber, color, status,
      purchaseDate: isoDate(-60), sellingPrice: m.price, notes: '',
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
    unitRefs.push({ id: unitRef.id, color, status, engineNumber, chassisNumber })
  }
  const availableCount = unitRefs.filter((u) => u.status === 'Available').length
  await itemRef.set({
    sku: m.sku, name: m.name, brand: m.brand, category: 'Motorcycle', type: m.type,
    price: m.price, description: `${m.name} — brand new unit.`, color: null, isPart: false, quantity: 0,
    imageUrl: '', stock: availableCount, status: availableCount > 0 ? 'In Stock' : 'Out of Stock',
    statusColor: availableCount > 0 ? 'green' : 'red',
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  inventory[m.sku] = { id: itemRef.id, ...m, units: unitRefs }
}
for (const p of partSeeds) {
  const itemRef = db.collection('inventory').doc()
  await itemRef.set({
    sku: p.sku, name: p.name, brand: '', category: 'Part', type: 'Part',
    price: p.price, description: '', color: null, isPart: true, quantity: p.quantity,
    imageUrl: '', stock: p.quantity, status: p.quantity > 0 ? 'In Stock' : 'Out of Stock',
    statusColor: p.quantity > 0 ? 'green' : 'red',
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  inventory[p.sku] = { id: itemRef.id, ...p }
}
console.log(`  seeded ${motorcycleSeeds.length} motorcycles (${motorcycleSeeds.reduce((s, m) => s + m.units.length, 0)} units) + ${partSeeds.length} parts`)

// ---------------------------------------------------------------------------
console.log('\n--- transactions + installment payments ---')
let trxSeq = 0
async function nextTransactionNo() {
  trxSeq += 1
  return `TRX-${monthKey}-${String(trxSeq).padStart(5, '0')}`
}

async function seedCashTransaction({ customer, item, unit, processedBy }) {
  const ref = db.collection('transactions').doc()
  const transactionNo = await nextTransactionNo()
  await ref.set({
    transactionNo, customerId: customer.id, customerName: customer.fullName, customerContact: customer.contactNumber,
    inventoryId: item.id, inventoryName: item.name, inventorySku: item.sku, inventoryType: item.type,
    brand: item.brand, imageUrl: '', unitId: unit.id, engineNumber: unit.engineNumber, chassisNumber: unit.chassisNumber,
    color: unit.color, paymentType: 'Cash', sellingPrice: item.price, amountPaid: item.price, downPayment: 0,
    terms: null, monthlyAmount: null, balance: 0, transactionDate: isoDate(-Math.floor(Math.random() * 20)),
    notes: '', status: 'Completed', remainingBalance: 0, lastPaymentDate: null, nextDueDate: null,
    processedBy, createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

async function seedInstallmentTransaction({ customer, item, unit, processedBy, paidInstallments }) {
  const ref = db.collection('transactions').doc()
  const transactionNo = await nextTransactionNo()
  const downPayment = Math.round(item.price * 0.2)
  const remaining = item.price - downPayment
  const terms = 6
  const monthlyAmount = Math.round((remaining / terms) * 100) / 100
  const transactionDate = isoDate(-60)

  const installments = []
  for (let i = 1; i <= terms; i++) {
    const dueDate = new Date(transactionDate)
    dueDate.setMonth(dueDate.getMonth() + i)
    installments.push({ paymentNo: i, dueDate: dueDate.toISOString().split('T')[0], amountDue: monthlyAmount })
  }

  let remainingBalance = remaining
  let lastPaymentDate = null
  let nextDueDate = installments[0].dueDate
  for (let i = 0; i < installments.length; i++) {
    const isPaid = i < paidInstallments
    const status = isPaid ? 'Paid' : (installments[i].dueDate < isoDate(0) ? 'Overdue' : 'Pending')
    const paymentRef = ref.collection('installmentPayments').doc()
    await paymentRef.set({
      paymentNo: installments[i].paymentNo, dueDate: installments[i].dueDate, amountDue: installments[i].amountDue,
      amountPaid: isPaid ? installments[i].amountDue : 0, paymentDate: isPaid ? isoDate(-30 + i * 5) : null,
      status, penaltyAmount: 0, paymentMethod: 'Cash', referenceNo: null, notes: '',
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
    if (isPaid) {
      remainingBalance -= installments[i].amountDue
      lastPaymentDate = isoDate(-30 + i * 5)
    }
  }
  const nextPending = installments.find((_, i) => i >= paidInstallments)
  nextDueDate = nextPending ? nextPending.dueDate : null

  await ref.set({
    transactionNo, customerId: customer.id, customerName: customer.fullName, customerContact: customer.contactNumber,
    inventoryId: item.id, inventoryName: item.name, inventorySku: item.sku, inventoryType: item.type,
    brand: item.brand, imageUrl: '', unitId: unit.id, engineNumber: unit.engineNumber, chassisNumber: unit.chassisNumber,
    color: unit.color, paymentType: 'Installment', sellingPrice: item.price, amountPaid: downPayment, downPayment,
    terms, monthlyAmount, balance: remaining, transactionDate, notes: '', status: 'Completed',
    remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100), lastPaymentDate, nextDueDate,
    processedBy, createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

const adminBy = { uid: adminUid, name: 'Test Admin', role: 'admin' }
const cashierBy = { uid: cashierUid, name: 'Test Cashier', role: 'cashier' }

const click = inventory['HC125']
const mio = inventory['YMS110']
const raider = inventory['SR150']

await seedCashTransaction({ customer: customerIds[0], item: click, unit: click.units[2], processedBy: cashierBy })
await seedCashTransaction({ customer: customerIds[1], item: mio, unit: mio.units[1], processedBy: adminBy })
await seedInstallmentTransaction({ customer: customerIds[2], item: raider, unit: raider.units[0], processedBy: cashierBy, paidInstallments: 2 })
await seedInstallmentTransaction({ customer: customerIds[3], item: click, unit: click.units[0], processedBy: adminBy, paidInstallments: 4 })
console.log(`  seeded ${trxSeq} transactions (2 cash, 2 installment)`)
await db.collection('counters').doc(`TRX-${monthKey}`).set({ count: trxSeq })

// ---------------------------------------------------------------------------
console.log('\n--- parts transactions ---')
let prtSeq = 0
async function seedPartsTransaction({ customerName, item, quantity, processedBy }) {
  const ref = db.collection('partsTransactions').doc()
  prtSeq += 1
  const transactionNo = `PRT-${monthKey}-${String(prtSeq).padStart(5, '0')}`
  const totalAmount = item.price * quantity
  await ref.set({
    transactionNo, customerName, inventoryId: item.id, inventoryName: item.name, imageUrl: '',
    quantity, price: item.price, totalAmount, amountPaid: totalAmount, changeAmount: 0,
    paymentType: 'Cash', transactionDate: isoDate(-Math.floor(Math.random() * 15)), notes: '', status: 'Completed',
    processedBy, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
}
await seedPartsTransaction({ customerName: 'Walk-in Customer', item: inventory['BP-001'], quantity: 2, processedBy: cashierBy })
await seedPartsTransaction({ customerName: 'Roberto Cruz', item: inventory['EO-001'], quantity: 4, processedBy: cashierBy })
await seedPartsTransaction({ customerName: 'Walk-in Customer', item: inventory['SP-001'], quantity: 1, processedBy: adminBy })
console.log(`  seeded ${prtSeq} parts transactions`)
await db.collection('counters').doc(`PRT-${monthKey}`).set({ count: prtSeq })

console.log('\n=== Done ===')
console.log('Log in at http://localhost:5173/login with any of:')
console.log('  admin@test.com / password123')
console.log('  cashier@test.com / password123')
console.log('  staff@test.com / password123')
