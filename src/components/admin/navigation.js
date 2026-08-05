// src/components/admin/navigation.js
// Shared between Sidebar (renders the menu) and AdminLayout (needs the same
// active-menu info for the header title) — kept out of the component files
// so exporting it doesn't break Fast Refresh, which only works reliably when
// a component file exports components alone. Mirrors cashier/navigation.js.
export const MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', hasSubmenu: false, path: '/admin/dashboard' },
  { id: 'users', name: 'User Management', icon: 'group', hasSubmenu: false, path: '/admin/users' },
  {
    id: 'customers',
    name: 'Customers',
    icon: 'people',
    hasSubmenu: true,
    path: '/admin/customers',
    submenus: [
      { id: 'customer-list', name: 'Customer List', icon: 'list_alt', path: '/admin/customers' },
      { id: 'add-customer', name: 'Add Customer', icon: 'person_add', path: '/admin/customers/add' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: 'inventory',
    hasSubmenu: false,
    path: '/admin/inventory'
  },
  {
    id: 'transactions',
    name: 'Transactions',
    icon: 'receipt_long',
    hasSubmenu: true,
    path: '/admin/transactions',
    submenus: [
      { id: 'transaction-list', name: 'Transaction List', icon: 'list_alt', path: '/admin/transactions' },
      { id: 'new-transaction', name: 'New Transaction', icon: 'add_shopping_cart', path: '/admin/transactions/new' }
    ]
  },
  {
    id: 'predictions',
    name: 'Predictions',
    icon: 'analytics',
    hasSubmenu: false,
    path: '/admin/predictions',
    badge: 'NEW'
  },
  {
    id: 'ai',
    name: 'AI Helper',
    icon: 'smart_toy',
    hasSubmenu: false,
    path: '/admin/ai'
  },
]

// Picks the longest menu/submenu path that matches the current URL —
// replaces a hand-maintained if/else chain that used to duplicate every
// route's path here, in Sidebar, and in every navigation callback.
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
