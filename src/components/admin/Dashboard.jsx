function Dashboard() {
  const stats = [
    { id: 1, title: 'Total Users', value: '12,842', change: '+4.2%', icon: 'group' },
    { id: 2, title: 'Active Listings', value: '456', change: '+12', icon: 'directions_car' },
    { id: 3, title: 'Monthly Revenue', value: '€2.48M', change: '+8.1%', icon: 'payments' },
    { id: 4, title: 'AI Insights Score', value: '94/100', change: 'AI POWERED', icon: 'smart_toy', isAi: true },
  ]

  const transactions = [
    { id: '#TRX-8821', customer: 'Marco Rossi', vehicle: '2023 Porsche 911 GT3', amount: '€195,400', status: 'CASH', statusColor: 'green' },
    { id: '#TRX-8820', customer: 'Isabella Moretti', vehicle: '2024 BMW M4 Competition', amount: '€104,200', status: 'INSTALLMENT', statusColor: 'blue' },
    { id: '#TRX-8819', customer: 'Hans Schmidt', vehicle: '2023 Audi RS6 Avant', amount: '€128,900', status: 'CASH', statusColor: 'green' },
    { id: '#TRX-8818', customer: 'Luca Bianchi', vehicle: '2022 Lamborghini Urus', amount: '€245,000', status: 'INSTALLMENT', statusColor: 'blue' },
    { id: '#TRX-8817', customer: 'Sofia Weber', vehicle: '2024 Mercedes-AMG G63', amount: '€189,500', status: 'CASH', statusColor: 'green' },
  ]

  return (
    <div className="p-5">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0b1c30]">Admin Overview</h2>
        <p className="text-base text-[#45464d] mt-1">Real-time performance metrics and inventory health.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-white p-4 rounded-xl border border-[#c6c6cd] shadow-sm hover:border-black hover:shadow-md transition-all relative overflow-hidden"
          >
            {stat.isAi && (
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <span className="material-symbols-outlined text-6xl">auto_awesome</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-[#dae2fd] rounded-lg">
                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
              </div>
              <span className={`text-xs font-medium ${stat.isAi ? 'bg-[#d3e4fe] text-black px-2 py-0.5 rounded' : 'text-green-600'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">{stat.title}</p>
            <h3 className="text-2xl font-bold text-[#0b1c30] mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Recent Transactions Table - Ito lang ang nasa baba */}
      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#c6c6cd] flex justify-between items-center">
          <h4 className="text-lg font-semibold text-[#0b1c30]">Recent Transactions</h4>
          <button className="text-black text-xs font-semibold tracking-wide hover:underline">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">ID</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide hidden sm:table-cell">Vehicle</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c6cd]">
              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={`hover:bg-[#f8f9ff] transition-colors ${
                    index % 2 === 1 ? 'bg-[#f8f9ff]/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-sm text-[#76777d]">{transaction.id}</td>
                  <td className="px-4 py-3 font-medium text-sm">{transaction.customer}</td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{transaction.vehicle}</td>
                  <td className="px-4 py-3 text-sm font-medium">{transaction.amount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        transaction.statusColor === 'green'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard