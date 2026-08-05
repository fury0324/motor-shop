import { Router } from 'express'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { assertAdmin, callable } from '../shared.js'

const router = Router()

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function customerReminderEmail(opts) {
  return `
    <html><head><style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background: #0b1c30; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
      .amount { font-size: 32px; font-weight: bold; color: #ba1a1a; }
      .due-date { font-size: 18px; font-weight: bold; color: #0b1c30; }
      .details { background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .details table { width: 100%; }
      .details td { padding: 5px 0; }
      .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 5px; margin: 10px 0; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
    </style></head><body>
      <div class="container">
        <div class="header"><h1>🏍️ Euro Motor Shop</h1><p>Payment Reminder</p></div>
        <p>Dear <strong>${opts.customerName}</strong>,</p>
        <p>This is a friendly reminder that your installment payment is due today.</p>
        <div class="warning">⚠️ <strong>Please settle your payment today to avoid penalties.</strong></div>
        <div class="details"><table>
          <tr><td><strong>Transaction No:</strong></td><td>${opts.transactionNo}</td></tr>
          <tr><td><strong>Item:</strong></td><td>${opts.itemName}</td></tr>
          <tr><td><strong>Due Date:</strong></td><td class="due-date">${formatDate(opts.dueDate)}</td></tr>
          <tr><td><strong>Amount Due:</strong></td><td class="amount">₱${formatCurrency(opts.amountDue)}</td></tr>
        </table></div>
        <p>You can pay at our store or through the following methods:</p>
        <ul><li>💵 Cash at our branch</li><li>🏦 Bank Transfer (BPI, BDO, Metrobank)</li><li>📱 GCash / PayMaya</li></ul>
        <p>If you have already made the payment, please disregard this reminder.</p>
        <p>Thank you for your cooperation!</p>
        <div class="footer">
          <p>Euro Motor Shop • Your Trusted Motorcycle Dealer</p>
          <p>📍 123 Main Street, Zamboanga City</p>
          <p>📞 (062) 123-4567 • 📧 support@euromotor.com</p>
        </div>
      </div>
    </body></html>
  `
}

function staffAlertEmail(opts) {
  const rowsHtml = opts.rows
    .map(
      (r) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.customerName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.transactionNo}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.itemName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₱${formatCurrency(r.amountDue)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.customerContact}</td>
        </tr>`
    )
    .join('')

  return `
    <html><head><style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
      .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background: #0b1c30; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #f8f9ff; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
      .action-btn { display: inline-block; background: #0b1c30; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
    </style></head><body>
      <div class="container">
        <div class="header"><h1>🏍️ Euro Motor Shop</h1><p>⚠️ Due Payment Alert</p></div>
        <p>Hello <strong>${opts.staffName}</strong>,</p>
        <p>There are <strong>${opts.rows.length}</strong> payment(s) due today (${formatDate(opts.dueDate)}).</p>
        <h3 style="margin-top:20px;">📋 List of Customers with Due Payments:</h3>
        <table>
          <thead><tr><th>Customer</th><th>Transaction</th><th>Item</th><th style="text-align:right;">Amount Due</th><th>Contact</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p style="margin-top:20px;">
          <a href="https://euro-motor-58710.web.app/admin/installment-payments" class="action-btn" style="color:white;text-decoration:none;">
            📊 View in Dashboard
          </a>
        </p>
        <p>Please follow up with these customers to ensure timely payments.</p>
        <div class="footer"><p>This is an automated notification. Please do not reply to this email.</p></div>
      </div>
    </body></html>
  `
}

// Mirrors send-due-payment-notifications.php, minus the raw SMTP/PHPMailer
// plumbing: this writes to mail/ and the Trigger Email extension does the
// actual sending.
export async function runDuePaymentReminders() {
  const db = getFirestore()
  const today = new Date().toISOString().split('T')[0]

  const dueSnap = await db
    .collectionGroup('installmentPayments')
    .where('dueDate', '==', today)
    .where('status', 'in', ['Pending', 'Partial'])
    .get()

  if (dueSnap.empty) {
    return { dueCount: 0, customersNotified: 0, staffNotified: 0 }
  }

  const transactionRefs = dueSnap.docs.map((d) => d.ref.parent.parent)
  const uniqueTransactionRefs = [...new Map(transactionRefs.map((r) => [r.path, r])).values()]
  const transactionDocs = await db.getAll(...uniqueTransactionRefs)
  const transactionById = new Map(transactionDocs.map((d) => [d.id, d.data()]))

  const duePayments = dueSnap.docs.map((paymentDoc) => {
    const transaction = transactionById.get(paymentDoc.ref.parent.parent.id) ?? {}
    return {
      amountDue: Number(paymentDoc.data().amountDue) || 0,
      dueDate: paymentDoc.data().dueDate,
      transactionNo: transaction.transactionNo,
      customerId: transaction.customerId,
      customerName: transaction.customerName,
      customerContact: transaction.customerContact,
      itemName: transaction.inventoryName,
    }
  })

  const customerIds = [...new Set(duePayments.map((p) => p.customerId).filter(Boolean))]
  const customerRefs = customerIds.map((id) => db.collection('customers').doc(id))
  const customerDocs = customerRefs.length > 0 ? await db.getAll(...customerRefs) : []
  const customerEmailById = new Map(customerDocs.map((d) => [d.id, d.data()?.email]))

  const mailCollection = db.collection('mail')
  let customersNotified = 0
  const customerFailed = []

  for (const payment of duePayments) {
    const email = customerEmailById.get(payment.customerId)
    if (!email) {
      customerFailed.push(`${payment.customerName} (no email)`)
      continue
    }
    await mailCollection.add({
      to: [email],
      message: {
        subject: '🔔 Payment Reminder - Euro Motor Shop',
        html: customerReminderEmail({
          customerName: payment.customerName,
          transactionNo: payment.transactionNo,
          itemName: payment.itemName,
          dueDate: payment.dueDate,
          amountDue: payment.amountDue,
        }),
      },
      createdAt: FieldValue.serverTimestamp(),
    })
    customersNotified += 1
  }

  const staffSnap = await db.collection('users').where('role', 'in', ['admin', 'cashier']).where('status', '==', 'active').get()
  let staffNotified = 0
  for (const staffDoc of staffSnap.docs) {
    const staff = staffDoc.data()
    if (!staff.email) continue
    await mailCollection.add({
      to: [staff.email],
      message: {
        subject: `⚠️ Payment Alert - ${duePayments.length} due today`,
        html: staffAlertEmail({
          staffName: staff.name,
          dueDate: today,
          rows: duePayments.map((p) => ({
            customerName: p.customerName,
            transactionNo: p.transactionNo,
            itemName: p.itemName,
            amountDue: p.amountDue,
            customerContact: p.customerContact,
          })),
        }),
      },
      createdAt: FieldValue.serverTimestamp(),
    })
    staffNotified += 1
  }

  return { dueCount: duePayments.length, customersNotified, customerFailed, staffNotified }
}

// Manual trigger for admins (support/testing use) without waiting for the
// GitHub Actions schedule.
router.post('/sendDuePaymentRemindersNow', callable(async (request) => {
  assertAdmin(request.auth)
  return runDuePaymentReminders()
}))

export default router
