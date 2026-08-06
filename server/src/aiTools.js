import { getDashboardStats } from './routes/dashboard.js'

// This is the ENTIRE data-access surface the AI Assistant model has onto
// Firestore. There is no generic "run a query" tool exposed to the model —
// every function here reads exactly one known collection, with server-side
// clamped bounds (limits, date filters), and returns a hand-picked field
// subset rather than raw documents. Notably, customer ID-document URLs
// (documents.*Url) and co-maker ID URLs are never included even though
// staff can see them in the regular UI — the model has no legitimate need
// to see or repeat links to scanned ID photos, so they're left out entirely
// as a data-minimization step, not because the UI restricts them.
//
// Each tool declares a minRole:
//   'staff' — allowed for admin, cashier, and staff (mirrors assertStaffOrAbove)
//   'admin' — allowed for admin only (mirrors assertAdmin)
// This must never be more permissive than the equivalent read already granted
// by firestore.rules / the existing REST routes for the same collection.

const MAX_LIMIT = 25
const DEFAULT_LIMIT = 10
const SCAN_LIMIT = 300 // bound on raw docs fetched before in-process filtering

function clampLimit(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}

function matchesSearch(haystack, search) {
  if (!search) return true
  const needle = String(search).trim().toLowerCase()
  if (!needle) return true
  return haystack.some((v) => String(v || '').toLowerCase().includes(needle))
}

function toIso(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  return null
}

async function listCustomers(db, args) {
  const limit = clampLimit(args.limit)
  const snap = await db.collection('customers').orderBy('createdAt', 'desc').limit(SCAN_LIMIT).get()
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => matchesSearch([c.fullName, c.email, c.contactNumber], args.search))
    .slice(0, limit)
  return {
    count: rows.length,
    customers: rows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      contactNumber: c.contactNumber,
      email: c.email,
      occupation: c.occupation,
      createdAt: toIso(c.createdAt),
    })),
  }
}

async function getCustomerById(db, args) {
  if (!args.customerId) return { error: 'customerId is required.' }
  const doc = await db.collection('customers').doc(args.customerId).get()
  if (!doc.exists) return { error: 'Customer not found.' }
  const c = doc.data()
  return {
    id: doc.id,
    fullName: c.fullName,
    contactNumber: c.contactNumber,
    email: c.email,
    homeAddress: c.homeAddress,
    civilStatus: c.civilStatus,
    occupation: c.occupation,
    monthlyIncome: c.monthlyIncome,
    createdAt: toIso(c.createdAt),
  }
}

async function listInventory(db, args) {
  const limit = clampLimit(args.limit)
  const snap = await db.collection('inventory').orderBy('createdAt', 'desc').limit(SCAN_LIMIT).get()
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((i) => !args.category || i.category === args.category)
    .filter((i) => !args.status || i.status === args.status)
    .filter((i) => matchesSearch([i.name, i.brand, i.sku], args.search))
    .slice(0, limit)
  return {
    count: rows.length,
    items: rows.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      brand: i.brand,
      category: i.category,
      type: i.type,
      price: i.price,
      stock: i.isPart ? i.quantity : i.stock,
      status: i.status,
      isPart: !!i.isPart,
    })),
  }
}

async function getInventoryItem(db, args) {
  if (!args.inventoryId) return { error: 'inventoryId is required.' }
  const ref = db.collection('inventory').doc(args.inventoryId)
  const [doc, unitsSnap] = await Promise.all([ref.get(), ref.collection('units').get()])
  if (!doc.exists) return { error: 'Inventory item not found.' }
  const i = doc.data()
  const unitsByStatus = {}
  for (const unitDoc of unitsSnap.docs) {
    const status = unitDoc.data().status || 'Unknown'
    unitsByStatus[status] = (unitsByStatus[status] || 0) + 1
  }
  return {
    id: doc.id,
    sku: i.sku,
    name: i.name,
    brand: i.brand,
    category: i.category,
    type: i.type,
    price: i.price,
    description: i.description,
    stock: i.isPart ? i.quantity : i.stock,
    status: i.status,
    isPart: !!i.isPart,
    units: { total: unitsSnap.size, byStatus: unitsByStatus },
  }
}

async function listTransactions(db, args) {
  const limit = clampLimit(args.limit)
  const snap = await db.collection('transactions').orderBy('createdAt', 'desc').limit(SCAN_LIMIT).get()
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !args.status || t.status === args.status)
    .filter((t) => !args.paymentType || t.paymentType === args.paymentType)
    .filter((t) => !args.customerId || t.customerId === args.customerId)
    .filter((t) => !args.dateFrom || (t.transactionDate && t.transactionDate >= args.dateFrom))
    .filter((t) => !args.dateTo || (t.transactionDate && t.transactionDate <= args.dateTo))
    .slice(0, limit)
  return {
    count: rows.length,
    transactions: rows.map((t) => ({
      id: t.id,
      transactionNo: t.transactionNo,
      customerName: t.customerName,
      inventoryName: t.inventoryName,
      paymentType: t.paymentType,
      sellingPrice: t.sellingPrice,
      amountPaid: t.amountPaid,
      balance: t.balance,
      status: t.status,
      transactionDate: t.transactionDate,
      processedBy: t.processedBy?.name || null,
    })),
  }
}

async function getTransactionById(db, args) {
  if (!args.transactionId) return { error: 'transactionId is required.' }
  const ref = db.collection('transactions').doc(args.transactionId)
  const [doc, paymentsSnap] = await Promise.all([
    ref.get(),
    ref.collection('installmentPayments').orderBy('dueDate', 'asc').get(),
  ])
  if (!doc.exists) return { error: 'Transaction not found.' }
  const t = doc.data()
  return {
    id: doc.id,
    transactionNo: t.transactionNo,
    customerName: t.customerName,
    inventoryName: t.inventoryName,
    paymentType: t.paymentType,
    sellingPrice: t.sellingPrice,
    downPayment: t.downPayment,
    terms: t.terms,
    monthlyAmount: t.monthlyAmount,
    amountPaid: t.amountPaid,
    balance: t.balance,
    remainingBalance: t.remainingBalance,
    status: t.status,
    transactionDate: t.transactionDate,
    nextDueDate: t.nextDueDate,
    processedBy: t.processedBy?.name || null,
    installmentPayments: paymentsSnap.docs.map((d) => {
      const p = d.data()
      return {
        paymentNo: p.paymentNo,
        dueDate: p.dueDate,
        amountDue: p.amountDue,
        amountPaid: p.amountPaid,
        status: p.status,
        paymentDate: p.paymentDate,
      }
    }),
  }
}

async function listPartsTransactions(db, args) {
  const limit = clampLimit(args.limit)
  const snap = await db.collection('partsTransactions').orderBy('createdAt', 'desc').limit(SCAN_LIMIT).get()
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !args.dateFrom || (t.transactionDate && t.transactionDate >= args.dateFrom))
    .filter((t) => !args.dateTo || (t.transactionDate && t.transactionDate <= args.dateTo))
    .slice(0, limit)
  return {
    count: rows.length,
    transactions: rows.map((t) => ({
      id: t.id,
      transactionNo: t.transactionNo,
      customerName: t.customerName,
      inventoryName: t.inventoryName,
      quantity: t.quantity,
      price: t.price,
      totalAmount: t.totalAmount,
      paymentType: t.paymentType,
      status: t.status,
      transactionDate: t.transactionDate,
      processedBy: t.processedBy?.name || null,
    })),
  }
}

async function getDashboardSummary(db) {
  return getDashboardStats(db)
}

async function listUsers(db, args) {
  const limit = clampLimit(args.limit)
  const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(SCAN_LIMIT).get()
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => !args.role || u.role === args.role)
    .filter((u) => !args.status || u.status === args.status)
    .slice(0, limit)
  return {
    count: rows.length,
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: toIso(u.createdAt),
    })),
  }
}

async function getUserSummary(db) {
  const snap = await db.collection('users').get()
  const byRole = {}
  const byStatus = {}
  for (const doc of snap.docs) {
    const u = doc.data()
    byRole[u.role] = (byRole[u.role] || 0) + 1
    byStatus[u.status] = (byStatus[u.status] || 0) + 1
  }
  return { total: snap.size, byRole, byStatus }
}

export const AI_TOOLS = [
  {
    name: 'list_customers',
    minRole: 'staff',
    description: `Search/list customers by name, email, or contact number. Returns up to ${MAX_LIMIT} matches.`,
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional substring to match against name, email, or contact number.' },
        limit: { type: 'integer', description: `Max results, up to ${MAX_LIMIT}.` },
      },
    },
    handler: listCustomers,
  },
  {
    name: 'get_customer_by_id',
    minRole: 'staff',
    description: 'Get full details for one customer by their document ID.',
    parameters: {
      type: 'object',
      properties: { customerId: { type: 'string' } },
      required: ['customerId'],
    },
    handler: getCustomerById,
  },
  {
    name: 'list_inventory',
    minRole: 'staff',
    description: 'Search/list inventory (motorcycles and parts) by name, brand, SKU, category, or status.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        category: { type: 'string', enum: ['Motorcycle', 'Part'] },
        status: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
    handler: listInventory,
  },
  {
    name: 'get_inventory_item',
    minRole: 'staff',
    description: 'Get full details for one inventory item, including a summary of its serial-numbered units grouped by status.',
    parameters: {
      type: 'object',
      properties: { inventoryId: { type: 'string' } },
      required: ['inventoryId'],
    },
    handler: getInventoryItem,
  },
  {
    name: 'list_transactions',
    minRole: 'staff',
    description: 'Search/list motorcycle sales transactions by status, payment type, customer, or date range (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        paymentType: { type: 'string', enum: ['Cash', 'Installment'] },
        customerId: { type: 'string' },
        dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'integer' },
      },
    },
    handler: listTransactions,
  },
  {
    name: 'get_transaction_by_id',
    minRole: 'staff',
    description: 'Get full details for one transaction, including its installment payment schedule if it has one.',
    parameters: {
      type: 'object',
      properties: { transactionId: { type: 'string' } },
      required: ['transactionId'],
    },
    handler: getTransactionById,
  },
  {
    name: 'list_parts_transactions',
    minRole: 'staff',
    description: 'Search/list parts sales transactions by date range (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'integer' },
      },
    },
    handler: listPartsTransactions,
  },
  {
    name: 'get_dashboard_summary',
    minRole: 'staff',
    description: 'Get aggregate business metrics: total revenue, customers, transactions, low-stock items, and monthly revenue trend.',
    parameters: { type: 'object', properties: {} },
    handler: (db) => getDashboardSummary(db),
  },
  {
    name: 'list_users',
    minRole: 'admin',
    description: 'List staff accounts by role or status. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['admin', 'cashier', 'staff'] },
        status: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
    handler: listUsers,
  },
  {
    name: 'get_user_summary',
    minRole: 'admin',
    description: 'Get staff account counts by role and status. Admin only.',
    parameters: { type: 'object', properties: {} },
    handler: getUserSummary,
  },
]

// 'staff' tools are allowed for admin/cashier/staff alike (mirrors
// assertStaffOrAbove); 'admin' tools are admin-only (mirrors assertAdmin).
function roleAllowsTool(role, minRole) {
  if (minRole === 'admin') return role === 'admin'
  return role === 'admin' || role === 'cashier' || role === 'staff'
}

// Builds the OpenRouter `tools` payload for one request, filtered to what
// this caller's role may use — a cashier's request never even lists
// list_users/get_user_summary, so the model has no way to know they exist.
export function toolsForRole(role) {
  return AI_TOOLS.filter((t) => roleAllowsTool(role, t.minRole)).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

// Executes one tool call. Re-checks the role gate here too (defense in
// depth) — even though the model is only ever offered tools its role may
// use, this doesn't trust that the model actually respected that list.
export async function executeTool(db, role, name, args) {
  const tool = AI_TOOLS.find((t) => t.name === name)
  if (!tool) return { error: `Unknown tool: ${name}` }
  if (!roleAllowsTool(role, tool.minRole)) {
    return { error: 'Not authorized to use this tool.' }
  }
  try {
    return await tool.handler(db, args || {})
  } catch (err) {
    console.error(`AI tool "${name}" failed:`, err)
    return { error: 'This tool failed to execute.' }
  }
}
