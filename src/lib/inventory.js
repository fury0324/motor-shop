import { collection, collectionGroup, doc, onSnapshot, orderBy, query, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { callApi, uploadFile } from './api'

export function newInventoryId() {
  return doc(collection(db, 'inventory')).id
}

export async function uploadInventoryImage(itemId, file) {
  return uploadFile(file, `inventory/${itemId}`)
}

export function watchInventory(onChange, onError) {
  const inventoryQuery = query(collection(db, 'inventory'), orderBy('name'))
  return onSnapshot(
    inventoryQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

// Mirrors get-inventory.php's eager join: every item comes with its full
// `units` array attached (used for the always-visible stock-summary badges
// on cards/rows, not just the on-demand "view units" expansion). A
// collectionGroup listener + client-side grouping replaces the N+1 query
// the PHP version ran per item.
export function watchInventoryWithUnits(onChange, onError) {
  let items = []
  let unitsByItem = {}
  let itemsReady = false
  let unitsReady = false

  const emit = () => {
    if (!itemsReady || !unitsReady) return
    onChange(items.map((item) => ({ ...item, units: unitsByItem[item.id] || [] })))
  }

  const unsubItems = onSnapshot(
    query(collection(db, 'inventory'), orderBy('name')),
    (snapshot) => {
      items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      itemsReady = true
      emit()
    },
    onError
  )

  const unsubUnits = onSnapshot(
    collectionGroup(db, 'units'),
    (snapshot) => {
      const grouped = {}
      snapshot.docs.forEach((d) => {
        const inventoryId = d.ref.parent.parent.id
        if (!grouped[inventoryId]) grouped[inventoryId] = []
        grouped[inventoryId].push({ id: d.id, ...d.data() })
      })
      unitsByItem = grouped
      unitsReady = true
      emit()
    },
    onError
  )

  return () => {
    unsubItems()
    unsubUnits()
  }
}

export function watchInventoryUnits(inventoryId, onChange, onError) {
  const unitsQuery = query(collection(db, 'inventory', inventoryId, 'units'))
  return onSnapshot(
    unitsQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

// Mirrors add-inventory.php's validation/defaults exactly: parts force
// brand='' and type='Part' and their stock mirrors quantity; models force
// category='Motorcycle' and quantity=0 (their stock comes from units instead).
export async function createInventoryItem({
  itemId, isPart, sku, name, brand, category, type, price, description, color, quantity, imageUrl,
  installmentMarkupPercent,
}) {
  if (isPart) {
    if (!name || !price || !(Number(quantity) > 0)) {
      throw new Error('Name, quantity, and price are required for a part.')
    }
  } else if (!name || !brand || !category || !type || !price) {
    throw new Error('Name, brand, category, type, and price are required for a model.')
  }

  const qty = isPart ? Number(quantity) || 0 : 0
  await setDoc(doc(db, 'inventory', itemId), {
    sku: sku || '',
    name,
    brand: isPart ? '' : brand,
    category: isPart ? 'Part' : 'Motorcycle',
    type: isPart ? 'Part' : type,
    price: Number(price) || 0,
    description: description || '',
    color: color || null,
    imageUrl: imageUrl || '',
    isPart,
    quantity: qty,
    stock: isPart ? qty : 0,
    status: isPart ? 'In Stock' : 'No Units',
    statusColor: isPart ? 'green' : 'gray',
    // Parts never carry an installment markup override — cash/installment
    // pricing only applies to motorcycles (see Transaction.jsx/NewTransaction.jsx).
    installmentMarkupPercent: isPart || installmentMarkupPercent === '' || installmentMarkupPercent == null
      ? null
      : Number(installmentMarkupPercent),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return itemId
}

// Mirrors update-inventory.php, with one documented fix: a part's
// status/statusColor now actually reflects its quantity (Out of
// Stock/red at 0) instead of always being hardcoded to In Stock/green
// regardless of stock level, which is what the original PHP did.
export async function updateInventoryItem({
  itemId, isPart, name, brand, category, type, price, description, color, quantity, imageUrl,
  installmentMarkupPercent,
}) {
  if (isPart) {
    if (!name || !price || !(Number(quantity) >= 0)) {
      throw new Error('Name, quantity, and price are required for a part.')
    }
  } else if (!name || !brand || !category || !type || !price) {
    throw new Error('Name, brand, category, type, and price are required for a model.')
  }

  const update = {
    name,
    brand: isPart ? '' : brand,
    category: isPart ? 'Part' : category,
    type: isPart ? 'Part' : type,
    price: Number(price) || 0,
    description: description || '',
    color: color || null,
    installmentMarkupPercent: isPart || installmentMarkupPercent === '' || installmentMarkupPercent == null
      ? null
      : Number(installmentMarkupPercent),
    updatedAt: serverTimestamp(),
  }
  if (imageUrl) update.imageUrl = imageUrl

  if (isPart) {
    const qty = Number(quantity) || 0
    update.quantity = qty
    update.stock = qty
    update.status = qty > 0 ? 'In Stock' : 'Out of Stock'
    update.statusColor = qty > 0 ? 'green' : 'red'
  } else {
    update.quantity = 0
  }

  await updateDoc(doc(db, 'inventory', itemId), update)
}

export async function addInventoryUnit(payload) {
  return callApi('addInventoryUnit', payload)
}

export async function deleteInventoryUnit(payload) {
  return callApi('deleteInventoryUnit', payload)
}

export async function deleteInventoryItem(inventoryId) {
  return callApi('deleteInventoryItem', { inventoryId })
}
