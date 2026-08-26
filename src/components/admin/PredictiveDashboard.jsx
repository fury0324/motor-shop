// components/admin/PredictiveDashboard.jsx
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getPredictiveAnalysis } from '../../lib/dashboard';

function PredictiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const fetchPredictiveData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      const result = await getPredictiveAnalysis();

      if (result && result.motorcycle_sales) {
        setData(result);
      } else {
        setError('No data available for predictions. The server returned an empty response.');
        setDebugInfo({ result, message: 'No motorcycle_sales key in response' });
      }
    } catch (err) {
      console.error('Error fetching predictive analysis:', err);
      setError(`Connection error: ${err.message}`);
      setDebugInfo({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-mount: setLoading(true) runs before the first
    // await, which is the correct shape for this, not the "derived state"
    // anti-pattern the rule otherwise targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPredictiveData();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return '₱0';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  };

  // Monotone blue scale for the weekly bars — matches the rest of the app's
  // palette instead of a separate neon-green scheme just for this chart.
  const getBarColor = (revenue, maxRevenue) => {
    if (revenue === 0) return '#e5e7eb';
    const percentage = maxRevenue > 0 ? (revenue / maxRevenue) : 0;
    if (percentage < 0.25) return '#bfdbfe';
    if (percentage < 0.50) return '#60a5fa';
    if (percentage < 0.75) return '#3b82f6';
    if (percentage < 0.90) return '#2563eb';
    return '#1d4ed8';
  };

  const getConfidenceBadge = (level) => {
    switch (level) {
      case 'High': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-[#45464d]">Loading predictive insights...</p>
        <p className="text-xs text-[#76777d] mt-2">Fetching data from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-8 max-w-2xl w-full text-center">
          <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
          <h3 className="text-xl font-semibold mt-4 text-[#0b1c30]">Unable to Load Data</h3>
          <p className="text-sm text-[#45464d] mt-2">{error}</p>

          {debugInfo && (
            <div className="mt-4 text-left bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg p-4 overflow-auto max-h-60">
              <p className="text-xs font-semibold text-[#45464d] mb-2">Debug Information</p>
              <pre className="text-xs text-[#76777d] whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <button
              onClick={fetchPredictiveData}
              className="px-6 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>

          <p className="text-xs text-[#76777d] mt-4">
            Tip: Check the browser console (F12) for more details
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data?.motorcycle_sales?.map(item => ({
    month: item.month,
    revenue: parseFloat(item.total_revenue),
    transactions: parseInt(item.total_transactions),
    customers: parseInt(item.unique_customers),
  })) || [];

  // Get top products
  const topProducts = data?.top_products?.slice(0, 3) || [];

  // Get low stock alerts
  const lowStockItems = data?.low_stock_alerts || [];

  // Get next month prediction
  const prediction = data?.next_month_prediction || null;
  const productPredictions = data?.top_products_prediction || [];

  return (
    <div className="p-4 sm:p-5">
      {/* Header Section */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={fetchPredictiveData}
          className="px-4 py-2 bg-white border border-[#c6c6cd] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* ============ NEXT MONTH PREDICTION — KPI CARDS ============ */}
      {prediction && prediction.predicted_revenue > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#c6c6cd] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="material-symbols-outlined text-xl text-blue-600">trending_up</span>
                </div>
                <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Predicted Revenue</p>
              </div>
              <h3 className="text-2xl font-bold text-[#0b1c30]">{formatCurrency(prediction.predicted_revenue)}</h3>
              <p className="text-xs text-[#76777d] mt-1">for {prediction.next_month}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#c6c6cd] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="material-symbols-outlined text-xl text-purple-600">payments</span>
                </div>
                <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Monthly Average</p>
              </div>
              <h3 className="text-2xl font-bold text-[#0b1c30]">{formatCurrency(prediction.avg_monthly_revenue)}</h3>
              <p className="text-xs text-[#76777d] mt-1">across recorded months</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#c6c6cd] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${prediction.trend_percentage >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`material-symbols-outlined text-xl ${prediction.trend_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {prediction.trend_percentage >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                </div>
                <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Trend</p>
              </div>
              <h3 className={`text-2xl font-bold ${prediction.trend_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {prediction.trend_percentage >= 0 ? '+' : ''}{prediction.trend_percentage}%
              </h3>
              <p className="text-xs text-[#76777d] mt-1">vs. previous month</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#c6c6cd] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined text-xl text-gray-600">verified</span>
                </div>
                <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Confidence</p>
              </div>
              <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-bold ${getConfidenceBadge(prediction.confidence)}`}>
                {prediction.confidence} · {prediction.confidence_score}%
              </span>
            </div>
          </div>

          <p className="text-xs text-[#76777d] mt-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">info</span>
            Based on {prediction.based_on_months} months of historical data — {prediction.message}
          </p>
        </div>
      )}

      {/* ============ TOP PRODUCTS PREDICTION ============ */}
      {productPredictions.length > 0 && (
        <div className="mb-6 bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-black text-3xl">auto_awesome</span>
            <div>
              <h4 className="text-base font-semibold text-[#0b1c30]">Next Month Top Sellers Prediction</h4>
              <p className="text-sm text-[#45464d]">Predicted best-selling models for {prediction?.next_month || 'next month'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {productPredictions.map((product, index) => (
              <div key={index} className="bg-[#f8f9ff] rounded-lg p-4 border border-[#c6c6cd] hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#dce9ff] rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#76777d]">motorcycle</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold text-[#0b1c30] truncate">{product.name}</p>
                    <p className="text-xs text-[#45464d]">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[#45464d]">Current Sales</p>
                    <p className="font-bold text-[#0b1c30]">{product.total_sold} units</p>
                  </div>
                  <div>
                    <p className="text-[#45464d]">Predicted Next Month</p>
                    <p className="font-bold text-green-600">{product.predicted_next_month_sales} units</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[#45464d]">Predicted Revenue</p>
                    <p className="font-bold text-[#0b1c30]">{formatCurrency(product.predicted_next_month_revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ MAIN GRID: Chart + Lists ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Chart - 8 columns */}
        <div className="lg:col-span-8 bg-white border border-[#c6c6cd] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#c6c6cd] flex flex-wrap justify-between items-center gap-3 bg-[#f8f9ff]">
            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30]">Revenue Trend</h3>
              <p className="text-sm text-[#45464d]">Monthly performance overview</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#76777d]"></span> Transactions
              </span>
            </div>
          </div>
          <div className="p-5 min-h-[350px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" vertical={false}/>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#76777d' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#76777d' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₱${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Revenue') return formatCurrency(value);
                      return formatNumber(value);
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #c6c6cd',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#76777d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Transactions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#45464d]">
                No data available for chart
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 4 columns */}
        <div className="lg:col-span-4 space-y-6">

          {/* Top Products (Historical) */}
          <div className="bg-white border border-[#c6c6cd] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
              <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-black text-lg">history</span>
                Top Performing Models
              </h4>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={index} className="p-4 flex items-center gap-3 hover:bg-[#f8f9ff] transition">
                    <div className="w-14 h-11 bg-[#dce9ff] rounded border border-[#c6c6cd] overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.product_name} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#76777d] text-lg">motorcycle</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-[#0b1c30] truncate">{product.product_name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-[#45464d]">{formatCurrency(product.total_sales)} sold</span>
                        <span className="text-[10px] font-semibold bg-[#dce9ff] px-2 py-0.5 rounded-full">
                          {product.times_sold || 0} units
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-[#45464d]">
                  No sales data available
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Forecast — critical items surfaced inline instead of
              a separate dark banner section further down the page. */}
          <div className="bg-white border border-[#c6c6cd] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
              <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-black text-lg">settings_suggest</span>
                Low Stock Forecast
              </h4>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {lowStockItems.slice(0, 3).map((item, index) => {
                const isCritical = item.alert_level === 'Critical';
                return (
                  <div key={index} className={`p-4 flex items-center gap-3 ${isCritical ? 'bg-red-50' : ''}`}>
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isCritical ? 'bg-red-100 border-red-200' : 'bg-[#dce9ff] border-[#c6c6cd]'
                    }`}>
                      <span className={`material-symbols-outlined text-lg ${isCritical ? 'text-red-600' : 'text-black'}`}>
                        {isCritical ? 'warning' : 'inventory_2'}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-[#0b1c30] truncate">{item.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs font-medium ${isCritical ? 'text-red-600' : 'text-[#595f66]'}`}>
                          {isCritical
                            ? 'Stock-out risk'
                            : item.months_until_empty === 999
                              ? 'No recent sales'
                              : `${Math.round(item.months_until_empty)} months left`}
                        </span>
                        <span className="text-xs text-[#45464d]">Stock: {item.current_stock}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length === 0 && (
                <div className="p-4 text-center text-sm text-[#45464d]">
                  All parts have adequate stock
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Pattern */}
      {data?.seasonal_patterns && data.seasonal_patterns.length > 0 && (
        <div className="mt-6 bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-black text-3xl">calendar_month</span>
            <div>
              <h4 className="text-base font-semibold text-[#0b1c30]">Seasonal Pattern Analysis</h4>
              <p className="text-sm text-[#45464d]">Best performing months based on historical data</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            {data.seasonal_patterns.slice(0, 5).map((month, index) => (
              <div key={index} className="bg-[#f8f9ff] p-3 rounded-lg text-center border border-[#c6c6cd]">
                <p className="text-base font-bold text-[#0b1c30]">{month.month_name}</p>
                <p className="text-xs text-[#45464d]">{formatCurrency(month.total_revenue)}</p>
                <p className="text-xs text-[#45464d]">{month.total_sales} sales</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Pattern */}
      {data?.daily_patterns && data.daily_patterns.length > 0 && (
        <div className="mt-6 bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-black text-3xl">today</span>
            <div>
              <h4 className="text-base font-semibold text-[#0b1c30]">Weekly Sales Pattern</h4>
              <p className="text-sm text-[#45464d]">Best days for sales based on historical data</p>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-[#45464d]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#bfdbfe]"></span> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#60a5fa]"></span> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span> High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#1d4ed8]"></span> Peak
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <span className="w-3 h-3 rounded-full bg-[#e5e7eb]"></span> No Sales
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 mt-3">
            {data.daily_patterns.map((day, index) => {
              const revenue = parseFloat(day.total_revenue) || 0;
              const maxRevenue = Math.max(...data.daily_patterns.map(d => parseFloat(d.total_revenue) || 0));
              const heightPercentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

              const barColor = getBarColor(revenue, maxRevenue);

              return (
                <div key={index} className="text-center">
                  <div className="bg-[#f8f9ff] rounded-lg p-2 h-24 flex flex-col justify-end border border-[#c6c6cd] relative group">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0b1c30] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(revenue)}
                    </div>
                    <div
                      className="rounded-t-sm w-full transition-all duration-300"
                      style={{
                        height: `${Math.max(heightPercentage, revenue > 0 ? 8 : 4)}%`,
                        minHeight: revenue > 0 ? '8px' : '4px',
                        backgroundColor: barColor
                      }}
                    ></div>
                  </div>
                  <p className={`text-xs mt-1.5 font-semibold ${revenue > 0 ? 'text-[#0b1c30]' : 'text-[#a0a0a8]'}`}>
                    {day.day_of_week?.substring(0, 3)}
                  </p>
                  <p className={`text-[10px] font-bold ${revenue > 0 ? 'text-[#0b1c30]' : 'text-[#a0a0a8]'}`}>
                    {formatCurrency(revenue)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictiveDashboard;
