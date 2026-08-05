import { onCall } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { assertStaffOrAbove, assertAdmin } from "./shared";

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthsAgoDateString(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

// Mirrors get-dashboard.php: a single read of the transactions collection
// replaces the original's half-dozen separate SQL aggregate queries, since
// Firestore has no GROUP BY — everything is folded client-side (Admin SDK)
// in one pass over the same in-memory list.
export const getDashboardStats = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const db = getFirestore();

  const [transactionsSnap, customersCountSnap, activeUsersCountSnap, inventorySnap, recentCustomersSnap] =
    await Promise.all([
      db.collection("transactions").orderBy("createdAt", "desc").get(),
      db.collection("customers").count().get(),
      db.collection("users").where("status", "==", "active").count().get(),
      db.collection("inventory").get(),
      db.collection("customers").orderBy("createdAt", "desc").limit(5).get(),
    ]);

  const transactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let totalRevenue = 0;
  const statusCounts: Record<string, number> = {};
  const paymentTypeCounts: Record<string, number> = {};
  const monthlyRevenue: Record<string, { revenue: number; transactions_count: number }> = {};
  const sixMonthsAgo = monthsAgoDateString(6);

  for (const t of transactions as Record<string, any>[]) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    if (t.paymentType) paymentTypeCounts[t.paymentType] = (paymentTypeCounts[t.paymentType] || 0) + 1;

    if (t.status === "Completed") {
      totalRevenue += Number(t.sellingPrice) || 0;
      if (t.transactionDate && t.transactionDate >= sixMonthsAgo) {
        const key = monthKey(t.transactionDate);
        if (!monthlyRevenue[key]) monthlyRevenue[key] = { revenue: 0, transactions_count: 0 };
        monthlyRevenue[key].revenue += Number(t.sellingPrice) || 0;
        monthlyRevenue[key].transactions_count += 1;
      }
    }
  }

  const completedCount = statusCounts["Completed"] || 0;
  const successRate = transactions.length > 0 ? (completedCount / transactions.length) * 100 : 0;
  const aiScore = transactions.length > 0 ? Math.min(Math.round(70 + successRate * 0.3), 98) : 94;

  const lowStockItems = inventorySnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, any>))
    .filter((item) => item.status === "In Stock" && Number(item.stock) <= 5)
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
    }));

  return {
    success: true,
    total_customers: customersCountSnap.data().count,
    total_transactions: transactions.length,
    total_revenue: totalRevenue,
    total_users: activeUsersCountSnap.data().count,
    ai_score: aiScore,
    recent_transactions: transactions.slice(0, 10).map((t: Record<string, any>) => ({
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
      const c = d.data();
      return {
        id: d.id,
        full_name: c.fullName,
        email: c.email,
        contact_number: c.contactNumber,
        created_at: toDate(c.createdAt)?.toISOString() ?? null,
      };
    }),
    monthly_revenue: Object.entries(monthlyRevenue)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, revenue: v.revenue, transactions_count: v.transactions_count })),
    status_counts: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    payment_type_counts: Object.entries(paymentTypeCounts).map(([payment_type, count]) => ({ payment_type, count })),
  };
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayOfWeekName(dateStr: string) {
  // getDay(): 0=Sunday..6=Saturday: rotate so Monday is index 0, matching DAY_NAMES.
  const jsDay = new Date(dateStr).getDay();
  return DAY_NAMES[(jsDay + 6) % 7];
}

// Mirrors predictive-analysis-data.php's PredictiveDataCollector: same
// heuristic trend/confidence math, ported from SQL aggregates to in-memory
// grouping over Admin SDK reads (Firestore has no GROUP BY/window functions).
// Still explicitly trend-based, not real ML — same honesty as the original.
export const getPredictiveAnalysis = onCall(async (request) => {
  assertAdmin(request.auth);
  const db = getFirestore();

  const [transactionsSnap, partsTransactionsSnap, inventorySnap, customersSnap, installmentPaymentsSnap] =
    await Promise.all([
      db.collection("transactions").where("status", "==", "Completed").get(),
      db.collection("partsTransactions").where("status", "==", "Completed").get(),
      db.collection("inventory").get(),
      db.collection("customers").get(),
      db.collectionGroup("installmentPayments").get(),
    ]);

  const transactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
  const partsTransactions = partsTransactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
  const inventory = inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
  const installmentPayments = installmentPaymentsSnap.docs.map((d) => d.data() as Record<string, any>);

  // ---- motorcycle_sales (last 6 months) ----
  const sixMonthsAgo = monthsAgoDateString(6);
  const motoByMonth: Record<
    string,
    { total_transactions: number; total_revenue: number; customers: Set<string>; cash: number; installment: number }
  > = {};
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < sixMonthsAgo) continue;
    const key = monthKey(t.transactionDate);
    if (!motoByMonth[key]) motoByMonth[key] = { total_transactions: 0, total_revenue: 0, customers: new Set(), cash: 0, installment: 0 };
    const bucket = motoByMonth[key];
    bucket.total_transactions += 1;
    bucket.total_revenue += Number(t.sellingPrice) || 0;
    if (t.customerId) bucket.customers.add(t.customerId);
    if (t.paymentType === "Cash") bucket.cash += 1;
    if (t.paymentType === "Installment") bucket.installment += 1;
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
    }));

  // ---- parts_sales (last 6 months) ----
  const partsByMonth: Record<
    string,
    { total_transactions: number; total_revenue: number; total_units_sold: number; customers: Set<string> }
  > = {};
  for (const t of partsTransactions) {
    if (!t.transactionDate || t.transactionDate < sixMonthsAgo) continue;
    const key = monthKey(t.transactionDate);
    if (!partsByMonth[key]) partsByMonth[key] = { total_transactions: 0, total_revenue: 0, total_units_sold: 0, customers: new Set() };
    const bucket = partsByMonth[key];
    bucket.total_transactions += 1;
    bucket.total_revenue += Number(t.totalAmount) || 0;
    bucket.total_units_sold += Number(t.quantity) || 0;
    if (t.customerName) bucket.customers.add(t.customerName);
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
    }));

  // ---- inventory_status ----
  const inventoryStatus = inventory.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    is_part: item.isPart ? 1 : 0,
    current_stock: item.isPart ? Number(item.quantity) || 0 : Number(item.stock) || 0,
    price: item.price,
    item_type: item.isPart ? "Part" : "Motorcycle",
    image: item.imageUrl || "",
    status: item.status,
  }));

  // ---- low_stock_alerts (parts only, last 3 months velocity) ----
  const threeMonthsAgo = monthsAgoDateString(3);
  const partsSoldByInventoryId: Record<string, number> = {};
  for (const t of partsTransactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo) continue;
    partsSoldByInventoryId[t.inventoryId] = (partsSoldByInventoryId[t.inventoryId] || 0) + (Number(t.quantity) || 0);
  }
  const lowStockAlerts = inventory
    .filter((item) => item.isPart && Number(item.quantity) > 0)
    .map((item) => {
      const totalSold3months = partsSoldByInventoryId[item.id] || 0;
      const avgMonthlySales = totalSold3months > 0 ? Math.round((totalSold3months / 3) * 100) / 100 : 0;
      const monthsUntilEmpty = avgMonthlySales > 0 ? Math.round((Number(item.quantity) / avgMonthlySales) * 10) / 10 : 999;
      let alertLevel: string;
      let recommendation: string;
      if (avgMonthlySales > 0 && monthsUntilEmpty < 3) {
        alertLevel = "Critical";
        recommendation = "Need to reorder within 3 months";
      } else if (avgMonthlySales > 0 && monthsUntilEmpty < 6) {
        alertLevel = "Warning";
        recommendation = "Monitor stock level";
      } else if (avgMonthlySales === 0) {
        alertLevel = "No History";
        recommendation = "No sales data available";
      } else {
        alertLevel = "Good";
        recommendation = "Stock is adequate";
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
      };
    })
    .filter((item) => item.months_until_empty < 3 || item.months_until_empty === 999)
    .sort((a, b) => a.months_until_empty - b.months_until_empty);

  // ---- customer_analysis ----
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixMonthsAgoDate = new Date();
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);
  const customerMonthly: Record<string, number> = {};
  let recentCustomerCount = 0;
  for (const c of customers) {
    const created = toDate(c.createdAt);
    if (!created) continue;
    if (created >= thirtyDaysAgo) recentCustomerCount += 1;
    if (created >= sixMonthsAgoDate) {
      const key = created.toISOString().slice(0, 7);
      customerMonthly[key] = (customerMonthly[key] || 0) + 1;
    }
  }
  const customerAnalysis = {
    total_customers: customers.length,
    new_customers_last_30days: recentCustomerCount,
    monthly_growth: Object.entries(customerMonthly)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, new_customers]) => ({ month, new_customers })),
  };

  // ---- payment_performance (installmentPayments, last 6 months by dueDate) ----
  const paymentByMonth: Record<
    string,
    { total_dues: number; total_amount_due: number; total_amount_paid: number; paid: number; pending: number; overdue: number; partial: number; overdue_amount: number }
  > = {};
  for (const p of installmentPayments) {
    if (!p.dueDate || p.dueDate < sixMonthsAgo) continue;
    const key = monthKey(p.dueDate);
    if (!paymentByMonth[key]) {
      paymentByMonth[key] = { total_dues: 0, total_amount_due: 0, total_amount_paid: 0, paid: 0, pending: 0, overdue: 0, partial: 0, overdue_amount: 0 };
    }
    const bucket = paymentByMonth[key];
    bucket.total_dues += 1;
    bucket.total_amount_due += Number(p.amountDue) || 0;
    bucket.total_amount_paid += Number(p.amountPaid) || 0;
    if (p.status === "Paid") bucket.paid += 1;
    else if (p.status === "Pending") bucket.pending += 1;
    else if (p.status === "Partial") bucket.partial += 1;
    else if (p.status === "Overdue") {
      bucket.overdue += 1;
      bucket.overdue_amount += Number(p.amountDue) || 0;
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
    }));

  // ---- seasonal_patterns (last 2 years, grouped by calendar month across years) ----
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const twoYearsAgoStr = twoYearsAgo.toISOString().split("T")[0];
  const seasonalByMonth: Record<number, { total_sales: number; total_revenue: number; customers: Set<string> }> = {};
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < twoYearsAgoStr) continue;
    const monthNum = new Date(t.transactionDate).getMonth();
    if (!seasonalByMonth[monthNum]) seasonalByMonth[monthNum] = { total_sales: 0, total_revenue: 0, customers: new Set() };
    seasonalByMonth[monthNum].total_sales += 1;
    seasonalByMonth[monthNum].total_revenue += Number(t.sellingPrice) || 0;
    if (t.customerId) seasonalByMonth[monthNum].customers.add(t.customerId);
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
    .slice(0, 5);

  // ---- daily_patterns (last 3 months, all 7 days always present) ----
  const dailyBuckets: Record<string, { total_transactions: number; total_revenue: number }> = {};
  for (const day of DAY_NAMES) dailyBuckets[day] = { total_transactions: 0, total_revenue: 0 };
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo) continue;
    const day = dayOfWeekName(t.transactionDate);
    dailyBuckets[day].total_transactions += 1;
    dailyBuckets[day].total_revenue += Number(t.sellingPrice) || 0;
  }
  const dailyPatterns = DAY_NAMES.map((day) => ({
    day_of_week: day,
    total_transactions: dailyBuckets[day].total_transactions,
    total_revenue: dailyBuckets[day].total_revenue,
    avg_sale: dailyBuckets[day].total_transactions > 0
      ? Math.round((dailyBuckets[day].total_revenue / dailyBuckets[day].total_transactions) * 100) / 100
      : 0,
  }));

  // ---- top_products (motorcycles, last 3 months) ----
  const salesByInventoryId: Record<string, { times_sold: number; cash: number; installment: number; total: number; prices: number[] }> = {};
  for (const t of transactions) {
    if (!t.transactionDate || t.transactionDate < threeMonthsAgo || !t.inventoryId) continue;
    if (!salesByInventoryId[t.inventoryId]) salesByInventoryId[t.inventoryId] = { times_sold: 0, cash: 0, installment: 0, total: 0, prices: [] };
    const bucket = salesByInventoryId[t.inventoryId];
    bucket.times_sold += 1;
    bucket.total += Number(t.sellingPrice) || 0;
    bucket.prices.push(Number(t.sellingPrice) || 0);
    if (t.paymentType === "Cash") bucket.cash += Number(t.sellingPrice) || 0;
    if (t.paymentType === "Installment") bucket.installment += Number(t.sellingPrice) || 0;
  }
  const topProducts = inventory
    .filter((item) => item.category === "Motorcycle")
    .map((item) => {
      const s = salesByInventoryId[item.id];
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
        image: item.imageUrl || "",
      };
    })
    .filter((item) => item.total_sales > 0)
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 10);

  // ---- next_month_prediction ----
  const nextMonthName = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  })();

  let nextMonthPrediction;
  const monthsCount = motorcycleSales.length + partsSales.length;
  if (monthsCount === 0) {
    nextMonthPrediction = {
      predicted_revenue: 0, avg_monthly_revenue: 0, trend_percentage: 0,
      confidence: "No Data", confidence_score: 0, based_on_months: 0,
      next_month: nextMonthName, message: "Not enough data for prediction",
    };
  } else {
    const totalRevenue = motorcycleSales.reduce((s, m) => s + m.total_revenue, 0) + partsSales.reduce((s, m) => s + m.total_revenue, 0);
    const avgMonthlyRevenue = totalRevenue / monthsCount;

    let trend = 0;
    if (motorcycleSales.length >= 2) {
      const recent = motorcycleSales.slice(-3);
      const previous = motorcycleSales.slice(0, 3);
      const recentAvg = recent.reduce((s, m) => s + m.total_revenue, 0) / recent.length;
      const previousAvg = previous.reduce((s, m) => s + m.total_revenue, 0) / previous.length;
      if (previousAvg > 0) trend = ((recentAvg - previousAvg) / previousAvg) * 100;
    }

    const totalTransactions = motorcycleSales.reduce((s, m) => s + m.total_transactions, 0)
      + partsSales.reduce((s, m) => s + m.total_transactions, 0);
    let confidence: { level: string; score: number; message: string };
    if (monthsCount < 3 || totalTransactions < 5) {
      confidence = { level: "Low", score: 30, message: "Need more historical data for accurate prediction" };
    } else if (monthsCount < 6 || totalTransactions < 15) {
      confidence = { level: "Medium", score: 60, message: "Moderate confidence - more data would improve accuracy" };
    } else {
      confidence = { level: "High", score: 85, message: "Sufficient data for reliable prediction" };
    }

    nextMonthPrediction = {
      predicted_revenue: Math.round(avgMonthlyRevenue * (1 + trend / 100) * 100) / 100,
      avg_monthly_revenue: Math.round(avgMonthlyRevenue * 100) / 100,
      trend_percentage: Math.round(trend * 100) / 100,
      confidence: confidence.level,
      confidence_score: confidence.score,
      based_on_months: monthsCount,
      next_month: nextMonthName,
      message: confidence.message,
    };
  }

  // ---- top_products_prediction (top 3 by velocity, last 3 months) ----
  const topProductsPrediction = inventory
    .filter((item) => item.category === "Motorcycle")
    .map((item) => {
      const s = salesByInventoryId[item.id];
      const totalSold = s?.times_sold || 0;
      const avgPrice = s && s.prices.length > 0 ? Math.round((s.prices.reduce((a, b) => a + b, 0) / s.prices.length) * 100) / 100 : 0;
      const velocity = Math.round((totalSold / 3) * 10) / 10;
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        image: item.imageUrl || "",
        total_revenue: Math.round((s?.total || 0) * 100) / 100,
        total_sold: totalSold,
        avg_price: avgPrice,
        monthly_sales_velocity: velocity,
      };
    })
    .filter((item) => item.total_sold > 0)
    .sort((a, b) => b.monthly_sales_velocity - a.monthly_sales_velocity)
    .slice(0, 3)
    .map((product) => ({
      ...product,
      predicted_next_month_sales: Math.round(product.monthly_sales_velocity * 1.1 * 10) / 10,
      predicted_next_month_revenue: Math.round(product.monthly_sales_velocity * 1.1 * product.avg_price * 100) / 100,
    }));

  // ---- summary ----
  const motorcycleRevenue = motorcycleSales.reduce((s, m) => s + m.total_revenue, 0);
  const partsRevenue = partsSales.reduce((s, m) => s + m.total_revenue, 0);
  const summaryMonthsCount = Math.max(motorcycleSales.length, partsSales.length);
  const summary = {
    total_revenue_last_6months: motorcycleRevenue + partsRevenue,
    total_motorcycle_sales: motorcycleRevenue,
    total_parts_sales: partsRevenue,
    total_transactions: transactions.length + partsTransactions.length,
    average_monthly_revenue: summaryMonthsCount > 0 ? (motorcycleRevenue + partsRevenue) / summaryMonthsCount : 0,
    total_customers: customerAnalysis.total_customers,
    total_products: inventory.length,
    low_stock_items: lowStockAlerts.length,
  };

  return {
    collected_at: new Date().toISOString(),
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
  };
});
