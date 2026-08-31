import { Router } from 'express'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { assertStaffOrAbove, assertAdmin, callable, HttpsError } from '../shared.js'
import { chatCompletion } from '../openrouter.js'
import { aiRateLimiter } from '../aiRateLimit.js'

const router = Router()

function monthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function monthsAgoDateString(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

function daysAgoDateString(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (typeof value === 'string') return new Date(value)
  return null
}

// Extracted so the AI Assistant's get_dashboard_summary tool (server/src/aiTools.js)
// can reuse the exact same aggregation logic instead of duplicating it.
export async function getDashboardStats(db) {
  const [transactionsSnap, customersCountSnap, activeUsersCountSnap, inventorySnap, recentCustomersSnap, installmentPaymentsSnap] =
    await Promise.all([
      db.collection('transactions').orderBy('createdAt', 'desc').get(),
      db.collection('customers').count().get(),
      db.collection('users').where('status', '==', 'active').count().get(),
      db.collection('inventory').get(),
      db.collection('customers').orderBy('createdAt', 'desc').limit(5).get(),
      db.collectionGroup('installmentPayments').get(),
    ])

  const transactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const installmentPayments = installmentPaymentsSnap.docs.map((d) => d.data())

  let totalRevenue = 0
  const statusCounts = {}
  const paymentTypeCounts = {}
  const monthlyRevenue = {}
  const dailyRevenue = {}
  const sixMonthsAgo = monthsAgoDateString(6)
  const thirtyDaysAgo = daysAgoDateString(29)

  // Income is cash actually collected, not the full sale price recognized
  // up front: a Cash sale's full price lands on the sale date, an
  // Installment sale's down payment lands on the sale date, and each later
  // installment payment (recordPayment in transactions.js) lands on the day
  // it was actually paid. Note: a payment row only stores its current
  // cumulative amountPaid/paymentDate, not a history of partial payments,
  // so a due installment paid across multiple days lands entirely on the
  // date of its most recent payment.
  function addCollectedAmount(dateStr, amount) {
    if (!dateStr || !(amount > 0)) return
    totalRevenue += amount
    if (dateStr >= sixMonthsAgo) {
      const key = monthKey(dateStr)
      if (!monthlyRevenue[key]) monthlyRevenue[key] = { revenue: 0, transactions_count: 0 }
      monthlyRevenue[key].revenue += amount
      monthlyRevenue[key].transactions_count += 1
    }
    if (dateStr >= thirtyDaysAgo) {
      dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + amount
    }
  }

  for (const t of transactions) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    if (t.paymentType) paymentTypeCounts[t.paymentType] = (paymentTypeCounts[t.paymentType] || 0) + 1

    if (t.status === 'Completed') {
      const collectedOnSaleDate = t.paymentType === 'Installment'
        ? Number(t.downPayment) || 0
        : Number(t.sellingPrice) || 0
      addCollectedAmount(t.transactionDate, collectedOnSaleDate)
    }
  }

  for (const p of installmentPayments) {
    addCollectedAmount(p.paymentDate, Number(p.amountPaid) || 0)
  }

  // Fill in every day of the trailing 30-day window (including zero-revenue
  // days) so the daily income chart renders a continuous series.
  const dailyRevenueSeries = []
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    dailyRevenueSeries.push({ date: key, revenue: dailyRevenue[key] || 0 })
  }

  const completedCount = statusCounts['Completed'] || 0
  const successRate = transactions.length > 0 ? (completedCount / transactions.length) * 100 : 0
  const aiScore = transactions.length > 0 ? Math.min(Math.round(70 + successRate * 0.3), 98) : 94

  const lowStockItems = inventorySnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((item) => item.status === 'In Stock' && Number(item.stock) <= 5)
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      stock: item.stock,
      price: item.price,
      category: item.category,
      status: item.status,
    }))

  return {
    success: true,
    total_customers: customersCountSnap.data().count,
    total_transactions: transactions.length,
    total_revenue: totalRevenue,
    total_users: activeUsersCountSnap.data().count,
    ai_score: aiScore,
    recent_transactions: transactions.slice(0, 10).map((t) => ({
      id: t.id,
      transaction_no: t.transactionNo,
      transaction_date: t.transactionDate,
      selling_price: t.sellingPrice,
      payment_type: t.paymentType,
      status: t.status,
      customer_name: t.customerName,
      contact_number: t.customerContact,
      product_name: t.inventoryName,
      brand: t.brand,
      engine_number: t.engineNumber,
      chassis_number: t.chassisNumber,
    })),
    low_stock_items: lowStockItems,
    recent_customers: recentCustomersSnap.docs.map((d) => {
      const c = d.data()
      return {
        id: d.id,
        full_name: c.fullName,
        email: c.email,
        contact_number: c.contactNumber,
        created_at: toDate(c.createdAt)?.toISOString() ?? null,
      }
    }),
    monthly_revenue: Object.entries(monthlyRevenue)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, revenue: v.revenue, transactions_count: v.transactions_count })),
    daily_revenue: dailyRevenueSeries,
    status_counts: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    payment_type_counts: Object.entries(paymentTypeCounts).map(([payment_type, count]) => ({ payment_type, count })),
  }
}

router.post('/getDashboardStats', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  return getDashboardStats(getFirestore())
}))

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dayOfWeekName(dateStr) {
  const jsDay = new Date(dateStr).getDay()
  return DAY_NAMES[(jsDay + 6) % 7]
}

async function buildPredictiveAnalysis(db) {
  const [transactionsSnap, partsTransactionsSnap, inventorySnap, customersSnap, installmentPaymentsSnap] =
    await Promise.all([
      db.collection('transactions').where('status', '==', 'Completed').get(),
      db.collection('partsTransactions').where('status', '==', 'Completed').get(),
      db.collection('inventory').get(),
      db.collection('customers').get(),
      db.collectionGroup('installmentPayments').get(),
    ])

  const transactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const partsTransactions = partsTransactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const inventory = inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const installmentPayments = installmentPaymentsSnap.docs.map((d) => d.data())

  // Actual calendar-day totals (not day-of-week buckets) for the last 30
  // days, combining motorcycle + parts sales — powers the "Daily Sale"
  // chart on the Predictions page.
  const thirtyOneDaysAgo = daysAgoDateString(30)
  const dailySalesByDate = {}
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < thirtyOneDaysAgo) continue
    const key = t.transactionDate.slice(0, 10)
    if (!dailySalesByDate[key]) dailySalesByDate[key] = { revenue: 0, transactions: 0 }
    dailySalesByDate[key].revenue += Number(t.sellingPrice) || 0
    dailySalesByDate[key].transactions += 1
  }
  for (const t of partsTransactions) {
    if (!t.transactionDate || t.transactionDate < thirtyOneDaysAgo) continue
    const key = t.transactionDate.slice(0, 10)
    if (!dailySalesByDate[key]) dailySalesByDate[key] = { revenue: 0, transactions: 0 }
    dailySalesByDate[key].revenue += Number(t.totalAmount) || 0
    dailySalesByDate[key].transactions += 1
  }
  const dailySales = []
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const bucket = dailySalesByDate[key]
    dailySales.push({
      date: key,
      total_revenue: Math.round((bucket?.revenue || 0) * 100) / 100,
      total_transactions: bucket?.transactions || 0,
    })
  }

  const sixMonthsAgo = monthsAgoDateString(6)
  const motoByMonth = {}
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < sixMonthsAgo) continue
    const key = monthKey(t.transactionDate)
    if (!motoByMonth[key]) motoByMonth[key] = { total_transactions: 0, total_revenue: 0, customers: new Set(), cash: 0, installment: 0 }
    const bucket = motoByMonth[key]
    bucket.total_transactions += 1
    bucket.total_revenue += Number(t.sellingPrice) || 0
    if (t.customerId) bucket.customers.add(t.customerId)
    if (t.paymentType === 'Cash') bucket.cash += 1
    if (t.paymentType === 'Installment') bucket.installment += 1
  }
  const motorcycleSales = Object.entries(motoByMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, b]) => ({
      month,
      total_transactions: b.total_transactions,
      total_revenue: b.total_revenue,
      avg_transaction_value: b.total_transactions > 0 ? Math.round((b.total_revenue / b.total_transactions) * 100) / 100 : 0,
      unique_customers: b.customers.size,
      cash_transactions: b.cash,
      installment_transactions: b.installment,
    }))

  const partsByMonth = {}
  for (const t of partsTransactions) {
    if (!t.transactionDate || t.transactionDate < sixMonthsAgo) continue
    const key = monthKey(t.transactionDate)
    if (!partsByMonth[key]) partsByMonth[key] = { total_transactions: 0, total_revenue: 0, total_units_sold: 0, customers: new Set() }
    const bucket = partsByMonth[key]
    bucket.total_transactions += 1
    bucket.total_revenue += Number(t.totalAmount) || 0
    bucket.total_units_sold += Number(t.quantity) || 0
    if (t.customerName) bucket.customers.add(t.customerName)
  }
  const partsSales = Object.entries(partsByMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, b]) => ({
      month,
      total_transactions: b.total_transactions,
      total_revenue: b.total_revenue,
      total_units_sold: b.total_units_sold,
      avg_transaction_value: b.total_transactions > 0 ? Math.round((b.total_revenue / b.total_transactions) * 100) / 100 : 0,
      unique_customers: b.customers.size,
    }))

  const inventoryStatus = inventory.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    is_part: item.isPart ? 1 : 0,
    current_stock: item.isPart ? Number(item.quantity) || 0 : Number(item.stock) || 0,
    price: item.price,
    item_type: item.isPart ? 'Part' : 'Motorcycle',
    image: item.imageUrl || '',
    status: item.status,
  }))

  const threeMonthsAgo = monthsAgoDateString(3)
  const partsSoldByInventoryId = {}
  for (const t of partsTransactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo) continue
    partsSoldByInventoryId[t.inventoryId] = (partsSoldByInventoryId[t.inventoryId] || 0) + (Number(t.quantity) || 0)
  }
  const lowStockAlerts = inventory
    .filter((item) => item.isPart && Number(item.quantity) > 0)
    .map((item) => {
      const totalSold3months = partsSoldByInventoryId[item.id] || 0
      const avgMonthlySales = totalSold3months > 0 ? Math.round((totalSold3months / 3) * 100) / 100 : 0
      const monthsUntilEmpty = avgMonthlySales > 0 ? Math.round((Number(item.quantity) / avgMonthlySales) * 10) / 10 : 999
      let alertLevel
      let recommendation
      if (avgMonthlySales > 0 && monthsUntilEmpty < 3) {
        alertLevel = 'Critical'
        recommendation = 'Need to reorder within 3 months'
      } else if (avgMonthlySales > 0 && monthsUntilEmpty < 6) {
        alertLevel = 'Warning'
        recommendation = 'Monitor stock level'
      } else if (avgMonthlySales === 0) {
        alertLevel = 'No History'
        recommendation = 'No sales data available'
      } else {
        alertLevel = 'Good'
        recommendation = 'Stock is adequate'
      }
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        current_stock: Number(item.quantity) || 0,
        total_sold_3months: totalSold3months,
        avg_monthly_sales: avgMonthlySales,
        months_until_empty: monthsUntilEmpty,
        alert_level: alertLevel,
        recommendation,
      }
    })
    .filter((item) => item.months_until_empty < 3 || item.months_until_empty === 999)
    .sort((a, b) => a.months_until_empty - b.months_until_empty)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixMonthsAgoDate = new Date()
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6)
  const customerMonthly = {}
  let recentCustomerCount = 0
  for (const c of customers) {
    const created = toDate(c.createdAt)
    if (!created) continue
    if (created >= thirtyDaysAgo) recentCustomerCount += 1
    if (created >= sixMonthsAgoDate) {
      const key = created.toISOString().slice(0, 7)
      customerMonthly[key] = (customerMonthly[key] || 0) + 1
    }
  }
  const customerAnalysis = {
    total_customers: customers.length,
    new_customers_last_30days: recentCustomerCount,
    monthly_growth: Object.entries(customerMonthly)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, new_customers]) => ({ month, new_customers })),
  }

  const paymentByMonth = {}
  for (const p of installmentPayments) {
    if (!p.dueDate || p.dueDate < sixMonthsAgo) continue
    const key = monthKey(p.dueDate)
    if (!paymentByMonth[key]) {
      paymentByMonth[key] = { total_dues: 0, total_amount_due: 0, total_amount_paid: 0, paid: 0, pending: 0, overdue: 0, partial: 0, overdue_amount: 0 }
    }
    const bucket = paymentByMonth[key]
    bucket.total_dues += 1
    bucket.total_amount_due += Number(p.amountDue) || 0
    bucket.total_amount_paid += Number(p.amountPaid) || 0
    if (p.status === 'Paid') bucket.paid += 1
    else if (p.status === 'Pending') bucket.pending += 1
    else if (p.status === 'Partial') bucket.partial += 1
    else if (p.status === 'Overdue') {
      bucket.overdue += 1
      bucket.overdue_amount += Number(p.amountDue) || 0
    }
  }
  const paymentPerformance = Object.entries(paymentByMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, b]) => ({
      month,
      total_dues: b.total_dues,
      total_amount_due: b.total_amount_due,
      total_amount_paid: b.total_amount_paid,
      collection_rate: b.total_amount_due > 0 ? Math.round((b.total_amount_paid / b.total_amount_due) * 10000) / 100 : 0,
      paid_count: b.paid,
      pending_count: b.pending,
      partial_count: b.partial,
      overdue_count: b.overdue,
      overdue_amount: b.overdue_amount,
    }))

  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0]
  const seasonalByMonth = {}
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < twoYearsAgoStr) continue
    const monthNum = new Date(t.transactionDate).getMonth()
    if (!seasonalByMonth[monthNum]) seasonalByMonth[monthNum] = { total_sales: 0, total_revenue: 0, customers: new Set() }
    seasonalByMonth[monthNum].total_sales += 1
    seasonalByMonth[monthNum].total_revenue += Number(t.sellingPrice) || 0
    if (t.customerId) seasonalByMonth[monthNum].customers.add(t.customerId)
  }
  const seasonalPatterns = Object.entries(seasonalByMonth)
    .map(([monthNum, b]) => ({
      month_num: Number(monthNum) + 1,
      month_name: MONTH_NAMES[Number(monthNum)],
      total_sales: b.total_sales,
      total_revenue: b.total_revenue,
      unique_customers: b.customers.size,
      avg_sale: b.total_sales > 0 ? Math.round((b.total_revenue / b.total_sales) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 5)

  const dailyBuckets = {}
  for (const day of DAY_NAMES) dailyBuckets[day] = { total_transactions: 0, total_revenue: 0 }
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo) continue
    const day = dayOfWeekName(t.transactionDate)
    dailyBuckets[day].total_transactions += 1
    dailyBuckets[day].total_revenue += Number(t.sellingPrice) || 0
  }
  const dailyPatterns = DAY_NAMES.map((day) => ({
    day_of_week: day,
    total_transactions: dailyBuckets[day].total_transactions,
    total_revenue: dailyBuckets[day].total_revenue,
    avg_sale: dailyBuckets[day].total_transactions > 0
      ? Math.round((dailyBuckets[day].total_revenue / dailyBuckets[day].total_transactions) * 100) / 100
      : 0,
  }))

  const salesByInventoryId = {}
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo || !t.inventoryId) continue
    if (!salesByInventoryId[t.inventoryId]) salesByInventoryId[t.inventoryId] = { times_sold: 0, cash: 0, installment: 0, total: 0, prices: [] }
    const bucket = salesByInventoryId[t.inventoryId]
    bucket.times_sold += 1
    bucket.total += Number(t.sellingPrice) || 0
    bucket.prices.push(Number(t.sellingPrice) || 0)
    if (t.paymentType === 'Cash') bucket.cash += Number(t.sellingPrice) || 0
    if (t.paymentType === 'Installment') bucket.installment += Number(t.sellingPrice) || 0
  }
  const topProducts = inventory
    .filter((item) => item.category === 'Motorcycle')
    .map((item) => {
      const s = salesByInventoryId[item.id]
      return {
        product_name: item.name,
        sku: item.sku,
        category: item.category,
        is_part: 0,
        current_stock: Number(item.stock) || 0,
        times_sold: s?.times_sold || 0,
        cash_sales: s?.cash || 0,
        installment_sales: s?.installment || 0,
        total_sales: s?.total || 0,
        image: item.imageUrl || '',
      }
    })
    .filter((item) => item.total_sales > 0)
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 10)

  const nextMonthName = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  })()

  let nextMonthPrediction
  // Union of months either category actually sold in — motoByMonth/
  // partsByMonth are built above from the same >= sixMonthsAgo filter as
  // motorcycleSales/partsSales. Using the union (not
  // motorcycleSales.length + partsSales.length) avoids double-counting a
  // month that had both motorcycle and parts sales.
  const mergedMonthKeys = Array.from(new Set([...Object.keys(motoByMonth), ...Object.keys(partsByMonth)])).sort()
  const mergedRevenueSeries = mergedMonthKeys.map(
    (k) => (motoByMonth[k]?.total_revenue || 0) + (partsByMonth[k]?.total_revenue || 0)
  )
  const monthsCount = mergedMonthKeys.length
  if (monthsCount === 0) {
    nextMonthPrediction = {
      predicted_revenue: 0, avg_monthly_revenue: 0, trend_percentage: 0,
      confidence: 'No Data', confidence_score: 0, based_on_months: 0,
      next_month: nextMonthName, message: 'Not enough data for prediction',
    }
  } else {
    const totalRevenue = mergedRevenueSeries.reduce((s, v) => s + v, 0)
    const avgMonthlyRevenue = totalRevenue / monthsCount

    // Least-squares trend line over every available month (x = month index)
    // instead of comparing just the first 3 vs last 3 motorcycle-only
    // months — uses all the data, includes parts revenue, and still
    // degrades sensibly with only 2-3 months on hand.
    let trend = 0
    let predictedRevenue = avgMonthlyRevenue
    if (monthsCount >= 2) {
      const n = monthsCount
      const sumX = mergedRevenueSeries.reduce((s, _, i) => s + i, 0)
      const sumY = totalRevenue
      const sumXY = mergedRevenueSeries.reduce((s, v, i) => s + i * v, 0)
      const sumXX = mergedRevenueSeries.reduce((s, _, i) => s + i * i, 0)
      const denominator = n * sumXX - sumX * sumX
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
      const intercept = (sumY - slope * sumX) / n
      predictedRevenue = Math.max(0, slope * n + intercept)
      if (avgMonthlyRevenue > 0) trend = (slope / avgMonthlyRevenue) * 100
    }

    const totalTransactions = motorcycleSales.reduce((s, m) => s + m.total_transactions, 0)
      + partsSales.reduce((s, m) => s + m.total_transactions, 0)
    let confidence
    if (monthsCount < 3 || totalTransactions < 5) {
      confidence = { level: 'Low', score: 30, message: 'Need more historical data for accurate prediction' }
    } else if (monthsCount < 6 || totalTransactions < 15) {
      confidence = { level: 'Medium', score: 60, message: 'Moderate confidence - more data would improve accuracy' }
    } else {
      confidence = { level: 'High', score: 85, message: 'Sufficient data for reliable prediction' }
    }

    // Enough months/transactions doesn't mean the trend is trustworthy if
    // revenue swings wildly month to month — downgrade confidence a tier
    // when the coefficient of variation is high, rather than letting a
    // volatile series claim High confidence just because it's old enough.
    const variance = mergedRevenueSeries.reduce((s, v) => s + (v - avgMonthlyRevenue) ** 2, 0) / monthsCount
    const coefficientOfVariation = avgMonthlyRevenue > 0 ? Math.sqrt(variance) / avgMonthlyRevenue : 0
    if (coefficientOfVariation > 0.75) {
      if (confidence.level === 'High') {
        confidence = { level: 'Medium', score: 55, message: 'Revenue varies a lot month to month — moderate confidence despite sufficient history' }
      } else if (confidence.level === 'Medium') {
        confidence = { level: 'Low', score: 25, message: 'Revenue varies a lot month to month — low confidence in this projection' }
      }
    }

    nextMonthPrediction = {
      predicted_revenue: Math.round(predictedRevenue * 100) / 100,
      avg_monthly_revenue: Math.round(avgMonthlyRevenue * 100) / 100,
      trend_percentage: Math.round(trend * 100) / 100,
      confidence: confidence.level,
      confidence_score: confidence.score,
      based_on_months: monthsCount,
      next_month: nextMonthName,
      message: confidence.message,
    }
  }

  // Ties each product's projection to the same real, computed shop-wide
  // trend instead of an arbitrary flat +10% assumption applied to every
  // product regardless of what the data shows.
  const shopTrendPercentage = nextMonthPrediction.trend_percentage || 0
  const topProductsPrediction = inventory
    .filter((item) => item.category === 'Motorcycle')
    .map((item) => {
      const s = salesByInventoryId[item.id]
      const totalSold = s?.times_sold || 0
      const avgPrice = s && s.prices.length > 0 ? Math.round((s.prices.reduce((a, b) => a + b, 0) / s.prices.length) * 100) / 100 : 0
      const velocity = Math.round((totalSold / 3) * 10) / 10
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        image: item.imageUrl || '',
        total_revenue: Math.round((s?.total || 0) * 100) / 100,
        total_sold: totalSold,
        avg_price: avgPrice,
        monthly_sales_velocity: velocity,
      }
    })
    .filter((item) => item.total_sold > 0)
    .sort((a, b) => b.monthly_sales_velocity - a.monthly_sales_velocity)
    .slice(0, 3)
    .map((product) => {
      const predictedSales = Math.max(0, product.monthly_sales_velocity * (1 + shopTrendPercentage / 100))
      return {
        ...product,
        predicted_next_month_sales: Math.round(predictedSales * 10) / 10,
        predicted_next_month_revenue: Math.round(predictedSales * product.avg_price * 100) / 100,
      }
    })

  const motorcycleRevenue = motorcycleSales.reduce((s, m) => s + m.total_revenue, 0)
  const partsRevenue = partsSales.reduce((s, m) => s + m.total_revenue, 0)

  // "This month vs last month" — reuses the monthly buckets already built
  // above (motoByMonth/partsByMonth cover the last 6 months, which always
  // includes both). Powers the "Past vs Present" chart.
  const monthTotal = (key) => ({
    month: key,
    total_revenue: (motoByMonth[key]?.total_revenue || 0) + (partsByMonth[key]?.total_revenue || 0),
    total_transactions: (motoByMonth[key]?.total_transactions || 0) + (partsByMonth[key]?.total_transactions || 0),
  })
  const now = new Date()
  const thisMonthKey = now.toISOString().slice(0, 7)
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)
  const pastVsPresent = {
    last_month: monthTotal(lastMonthKey),
    this_month: monthTotal(thisMonthKey),
  }

  // Motorcycle vs Parts share of total revenue — powers the "Overall Sale"
  // pie chart.
  const revenueSplit = {
    motorcycle: Math.round(motorcycleRevenue * 100) / 100,
    parts: Math.round(partsRevenue * 100) / 100,
  }

  const summaryMonthsCount = Math.max(motorcycleSales.length, partsSales.length)
  const summary = {
    total_revenue_last_6months: motorcycleRevenue + partsRevenue,
    total_motorcycle_sales: motorcycleRevenue,
    total_parts_sales: partsRevenue,
    total_transactions: transactions.length + partsTransactions.length,
    average_monthly_revenue: summaryMonthsCount > 0 ? (motorcycleRevenue + partsRevenue) / summaryMonthsCount : 0,
    total_customers: customerAnalysis.total_customers,
    total_products: inventory.length,
    low_stock_items: lowStockAlerts.length,
  }

  return {
    collected_at: new Date().toISOString(),
    daily_sales: dailySales,
    past_vs_present: pastVsPresent,
    revenue_split: revenueSplit,
    motorcycle_sales: motorcycleSales,
    parts_sales: partsSales,
    inventory_status: inventoryStatus,
    low_stock_alerts: lowStockAlerts,
    customer_analysis: customerAnalysis,
    payment_performance: paymentPerformance,
    seasonal_patterns: seasonalPatterns,
    daily_patterns: dailyPatterns,
    top_products: topProducts,
    next_month_prediction: nextMonthPrediction,
    top_products_prediction: topProductsPrediction,
    summary,
  }
}

router.post('/getPredictiveAnalysis', callable(async (request) => {
  assertAdmin(request.auth)
  const db = getFirestore()
  return buildPredictiveAnalysis(db)
}))

const INSIGHTS_SYSTEM_PROMPT =
  'You are a business analyst for Euro Motor Shop, a motorcycle dealership. ' +
  'You will be given a JSON snapshot of the shop\'s recent sales, inventory, ' +
  'and forecast data. Write a short (2-3 sentence) plain-language summary of ' +
  'the current trend, followed by 3-4 concise, concrete, actionable ' +
  'recommendations (restocking, promotions, things to watch). Base every ' +
  'claim strictly on the numbers provided — never invent a figure that ' +
  'isn\'t in the data. If the forecast\'s confidence is Low or Medium, say ' +
  'so plainly and hedge your recommendations accordingly instead of stating ' +
  'the prediction as if it were certain.'

const MAX_INSIGHTS_PROMPT_CHARS = 6000

function buildInsightsPrompt(analysis) {
  const snapshot = {
    next_month_prediction: analysis.next_month_prediction,
    summary: analysis.summary,
    top_products: analysis.top_products?.slice(0, 3) || [],
    low_stock_alerts: (analysis.low_stock_alerts || [])
      .filter((item) => item.alert_level === 'Critical')
      .slice(0, 3),
    seasonal_patterns: analysis.seasonal_patterns?.slice(0, 3) || [],
    daily_patterns: analysis.daily_patterns || [],
  }
  return JSON.stringify(snapshot).slice(0, MAX_INSIGHTS_PROMPT_CHARS)
}

router.post('/getPredictiveAiInsights', aiRateLimiter, callable(async (request) => {
  assertAdmin(request.auth)
  if (!process.env.OPENROUTER_API_KEY) {
    throw new HttpsError('failed-precondition', 'AI Assistant is not configured yet.')
  }
  const db = getFirestore()
  const analysis = await buildPredictiveAnalysis(db)

  let completion
  try {
    completion = await chatCompletion({
      messages: [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        { role: 'user', content: buildInsightsPrompt(analysis) },
      ],
    })
  } catch (err) {
    console.error('OpenRouter request failed:', err)
    throw new HttpsError('internal', 'Could not reach the AI service.')
  }

  const text = (completion?.choices?.[0]?.message?.content || '').trim()
  if (!text) {
    throw new HttpsError('internal', 'The AI service returned an unexpected response.')
  }
  return { insight: text }
}))

export default router
