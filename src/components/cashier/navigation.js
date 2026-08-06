// src/components/cashier/navigation.js
// Shared between CashierSidebar (renders the menu) and CashierLayout (needs
// the same active-menu info for CashierHeader's title) — kept out of the
// component files so exporting it doesn't break Fast Refresh, which only
// works reliably when a component file exports components alone.
export const MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', hasSubmenu: false, path: '/cashier' },
  {
    id: 'transactions',
    name: 'Transactions',
    icon: 'receipt_long',
    hasSubmenu: true,
    path: '/cashier/transactions',
    submenus: [
      { id: 'new-transaction', name: 'New Transaction', icon: 'add_shopping_cart', path: '/cashier/new-transaction' },
      { id: 'transaction-history', name: 'Transaction History', icon: 'history', path: '/cashier/transaction-history' }
    ]
  },
  {
    id: 'customers',
    name: 'Customers',
    icon: 'people',
    hasSubmenu: true,
    path: '/cashier/customers',
    submenus: [
      { id: 'customer-list', name: 'Customer List', icon: 'list_alt', path: '/cashier/customer-list' },
      { id: 'register-customer', name: 'Register Customer', icon: 'person_add', path: '/cashier/register-customer' }
    ]
  },
  { id: 'inventory', name: 'Check Inventory', icon: 'inventory_2', hasSubmenu: false, path: '/cashier/inventory' },
  { id: 'ai', name: 'AI Helper', icon: 'smart_toy', hasSubmenu: false, path: '/cashier/ai' },
]

// Picks the longest menu/submenu path that matches the current URL —
// replaces a hand-maintained if/else chain that used to duplicate every
// route's path here, in CashierSidebar, and in CashierLayout.
export function matchActive(pathname) {
  const candidates = []
  for (const item of MENU_ITEMS) {
    if (item.submenus) {
      for (const sub of item.submenus) candidates.push({ menuId: item.id, subId: sub.id, path: sub.path })
    } else {
      candidates.push({ menuId: item.id, subId: null, path: item.path })
    }
  }
  candidates.sort((a, b) => b.path.length - a.path.length)
  const match = candidates.find((c) => pathname === c.path || pathname.startsWith(`${c.path}/`))
  return match ? { activeMenu: match.menuId, activeSubMenu: match.subId } : { activeMenu: 'dashboard', activeSubMenu: null }
}
