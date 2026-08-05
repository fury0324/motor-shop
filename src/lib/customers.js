import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import { callApi, uploadFile } from './api'

// Firestore lets you mint a document ID before writing anything — used here
// so KYC documents can be uploaded under customers/{id}/... before the
// customer record itself exists (createCustomer needs those URLs).
export function newCustomerId() {
  return doc(collection(db, 'customers')).id
}

export async function uploadCustomerFile(customerId, docType, file) {
  return uploadFile(file, `customers/${customerId}/${docType}`)
}

export function watchCustomers(onChange, onError) {
  const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    customersQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

export async function createCustomer(payload) {
  return callApi('createCustomer', payload)
}

export async function updateCustomer(payload) {
  return callApi('updateCustomer', payload)
}

export async function deleteCustomer(customerId) {
  return callApi('deleteCustomer', { customerId })
}
