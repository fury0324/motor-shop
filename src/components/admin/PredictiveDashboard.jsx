// components/admin/PredictiveDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getPredictiveAnalysis } from '../../lib/dashboard';

function PredictiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchPredictiveData();
  }, []);

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

  // 🟢 GREEN COLOR PALETTE for weekly bars
  const getBarColor = (day, revenue, maxRevenue) => {
    if (revenue === 0) return '#e5e7eb';
    
    const percentage = maxRevenue > 0 ? (revenue / maxRevenue) : 0;
    
    if (percentage < 0.25) return '#86efac';
    if (percentage < 0.50) return '#4ade80';
    if (percentage < 0.75) return '#22c55e';
    if (percentage < 0.90) return '#16a34a';
    return '#15803d';
  };

  // Get confidence color
  const getConfidenceColor = (level) => {
    switch(level) {
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
              <p className="text-xs font-semibold text-[#45464d] mb-2">🔍 Debug Information:</p>
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
              🔄 Retry
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
  
  // Get critical items
  const criticalItems = lowStockItems.filter(
    item => item.months_until_empty < 1 && item.months_until_empty !== 999
  ).slice(0, 3);

  // Get next month prediction
  const prediction = data?.next_month_prediction || null;
  const productPredictions = data?.top_products_prediction || [];

  return (
    <div className="p-4 sm:p-5">
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0b1c30]">Predictions</h2>
          <p className="text-sm text-[#45464d] mt-1">Sales trends and inventory forecasts.</p>
        </div>
        <button
          onClick={fetchPredictiveData}
          className="px-4 py-2 bg-white border border-[#c6c6cd] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* ============ 📊 NEXT MONTH PREDICTION CARD ============ */}
      {prediction && prediction.predicted_revenue > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl">trending_up</span>
              <div>
                <p className="text-sm opacity-80">📊 Predicted Revenue for</p>
                <h3 className="text-2xl font-bold">{prediction.next_month}</h3>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm opacity-80">Predicted Revenue</p>
              <p className="text-4xl font-bold">{formatCurrency(prediction.predicted_revenue)}</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="text-center">
                <p className="text-sm opacity-80">Monthly Average</p>
                <p className="text-lg font-semibold">{formatCurrency(prediction.avg_monthly_revenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm opacity-80">Trend</p>
                <p className={`text-lg font-semibold ${prediction.trend_percentage >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {prediction.trend_percentage >= 0 ? '↑' : '↓'} {Math.abs(prediction.trend_percentage)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm opacity-80">Confidence</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence} {prediction.confidence_score}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs opacity-70 text-center md:text-left">
            Based on {prediction.based_on_months} months of historical data • {prediction.message}
          </div>
        </div>
      )}

      {/* ============ 🏍️ TOP PRODUCTS PREDICTION ============ */}
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
                <span className="w-3 h-3 rounded-full bg-black"></span> Revenue
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
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
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
                    stroke="#000000" 
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

          {/* Low Stock Forecast */}
          <div className="bg-white border border-[#c6c6cd] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
              <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-black text-lg">settings_suggest</span>
                Low Stock Forecast
              </h4>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {lowStockItems.slice(0, 3).map((item, index) => (
                <div key={index} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#dce9ff] rounded-full border border-[#c6c6cd] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-black text-lg">
                      {item.alert_level === 'Critical' ? 'warning' : 'inventory_2'}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-[#0b1c30]">{item.name}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        item.alert_level === 'Critical' ? 'text-[#ba1a1a]' : 'text-[#595f66]'
                      }`}>
                        {item.alert_level === 'Critical' ? '⚠️ STOCK-OUT RISK' : `${item.months_until_empty} months left`}
                      </span>
                      <span className="text-xs text-[#45464d]">Stock: {item.current_stock}</span>
                    </div>
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <div className="p-4 text-center text-sm text-[#45464d]">
                  ✅ All parts have adequate stock
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Stock-Out Risk Section */}
      {criticalItems.length > 0 && (
        <div className="mt-6 bg-[#0b1c30] text-white rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-black/20 blur-[100px] -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-4xl">warning</span>
              <div>
                <h2 className="text-xl font-bold">Critical Stock-Out Risk Analysis</h2>
                <p className="text-sm text-white/70">
                  The following high-demand components are predicted to deplete soon
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {criticalItems.map((item, index) => {
                const riskPercentage = Math.min(
                  Math.round((1 - (item.months_until_empty / 3)) * 100),
                  95
                );
                return (
                  <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                        Item Group
                      </span>
                      <span className="material-symbols-outlined text-white/50">inventory_2</span>
                    </div>
                    <p className="text-base font-bold">{item.name}</p>
                    <div className="h-1 bg-white/10 rounded-full w-full mt-3">
                      <div 
                        className="h-full bg-[#ba1a1a] rounded-full shadow-[0_0_10px_rgba(186,26,26,0.6)]"
                        style={{ width: `${riskPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs font-bold text-[#ba1a1a]">Stock: {item.current_stock} units</span>
                      <span className="text-xs text-white/70">
                        {item.months_until_empty === 999 ? 'No sales data' : `${Math.round(item.months_until_empty)} months left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button className="px-4 py-2 border border-white/30 rounded-lg text-xs font-semibold hover:bg-white/10 transition">
                Generate Vendor Orders
              </button>
              <button className="px-4 py-2 bg-[#ba1a1a] text-white rounded-lg text-xs font-bold shadow-lg hover:brightness-110 transition">
                Authorize Emergency Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seasonal Pattern */}
      {data?.seasonal_patterns && data.seasonal_patterns.length > 0 && (
        <div className="mt-6 bg-white border border-[#c6c6cd] rounded-xl p-5">
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

      {/* Weekly Pattern - GREEN COLOR SCHEME */}
      {data?.daily_patterns && data.daily_patterns.length > 0 && (
        <div className="mt-6 bg-[#f8f9ff] border border-[#c6c6cd] rounded-xl p-5">
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
              <span className="w-3 h-3 rounded-full bg-[#86efac]"></span> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#4ade80]"></span> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#15803d]"></span> Peak
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
              
              const barColor = getBarColor(day.day_of_week, revenue, maxRevenue);
              
              return (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-lg p-2 h-24 flex flex-col justify-end border border-[#c6c6cd] relative group">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0b1c30] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(revenue)}
                    </div>
                    <div 
                      className="rounded-t-sm w-full transition-all duration-300"
                      style={{ 
                        height: `${Math.max(heightPercentage, revenue > 0 ? 8 : 4)}%`,
                        minHeight: revenue > 0 ? '8px' : '4px',
                        backgroundColor: barColor,
                        boxShadow: revenue > 0 ? '0 2px 8px rgba(34, 197, 94, 0.3)' : 'none'
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

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-[#45464d] border-t border-[#c6c6cd] pt-4">
        MotoInsights v1.0 • Powered by Euro Motor Data
      </div>
    </div>
  );
}

export default PredictiveDashboard;