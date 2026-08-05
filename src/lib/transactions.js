import { collection, collectionGroup, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { callApi } from './api'

export function watchTransactions(onChange, onError) {
  const transactionsQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    transactionsQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

export function watchPartsTransactions(onChange, onError) {
  const partsQuery = query(collection(db, 'partsTransactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    partsQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

export function watchTransaction(transactionId, onChange, onError) {
  return onSnapshot(
    doc(db, 'transactions', transactionId),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  )
}

export function watchInstallmentPayments(transactionId, onChange, onError) {
  const paymentsQuery = query(
    collection(db, 'transactions', transactionId, 'installmentPayments'),
    orderBy('paymentNo')
  )
  return onSnapshot(
    paymentsQuery,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

// Replaces the old N+1 loop (one get-installment-payments.php fetch per
// installment transaction) with a single collectionGroup query for
// everything due today, across every transaction, in one round trip.
export function watchDueTodayTransactionIds(onChange, onError) {
  const today = new Date().toISOString().split('T')[0]
  const dueTodayQuery = query(collectionGroup(db, 'installmentPayments'), where('dueDate', '==', today))
  return onSnapshot(
    dueTodayQuery,
    (snapshot) => {
      const ids = new Set()
      snapshot.docs.forEach((d) => {
        if (d.data().status !== 'Paid') {
          ids.add(d.ref.parent.parent.id)
        }
      })
      onChange(Array.from(ids))
    },
    onError
  )
}

export async function createTransaction(payload) {
  return callApi('createTransaction', payload)
}

export async function recordPayment(payload) {
  return callApi('recordPayment', payload)
}

export async function deleteTransaction(transactionId) {
  return callApi('deleteTransaction', { transactionId })
}

export async function bulkDeleteTransactions(transactionIds) {
  return callApi('bulkDeleteTransactions', { transactionIds })
}

export async function createPartsTransaction(payload) {
  return callApi('createPartsTransaction', payload)
}

export async function deletePartsTransaction(transactionId) {
  return callApi('deletePartsTransaction', { transactionId })
}

export async function bulkDeletePartsTransactions(transactionIds) {
  return callApi('bulkDeletePartsTransactions', { transactionIds })
}
