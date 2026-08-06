// src/components/staff/navigation.js
// Mirrors admin/navigation.js and cashier/navigation.js — shared between
// StaffSidebar (renders the menu) and StaffLayout (needs the same
// active-menu info for the header title).
export const MENU_ITEMS = [
  { id: 'dashboard', name: 'Home', icon: 'home', path: '/staff/dashboard' },
  { id: 'add-new', name: 'Add New', icon: 'add_circle', path: '/staff/add-new' },
  { id: 'inventory', name: 'Inventory', icon: 'inventory_2', path: '/staff/inventory' },
  { id: 'ai', name: 'AI Helper', icon: 'smart_toy', path: '/staff/ai' },
  { id: 'settings', name: 'Settings', icon: 'settings', path: '/staff/settings' },
]

export function matchActive(pathname) {
  const match = MENU_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
  return { activeMenu: match ? match.id : 'dashboard', activeSubMenu: null }
}
