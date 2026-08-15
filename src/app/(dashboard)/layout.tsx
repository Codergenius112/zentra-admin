'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/auth.store';
import { UserRole, BusinessScope } from '@/types';

const ALL_ADMIN_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SUPER_ADMIN,
];

const navItemsData = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: [...ALL_ADMIN_ROLES] },
  { label: 'Bookings', href: '/bookings', icon: '📋', roles: ALL_ADMIN_ROLES },
  { label: 'Orders', href: '/orders', icon: '🍽️', roles: [...ALL_ADMIN_ROLES] },
  { label: 'Staff', href: '/staff', icon: '👥', roles: ALL_ADMIN_ROLES },
  { label: 'Analytics', href: '/analytics', icon: '📈', roles: [...ALL_ADMIN_ROLES] },
  { label: 'Events', href: '/events', icon: '🎪', scopes: [BusinessScope.EVENT_TICKETING] },
  { label: 'Tickets', href: '/tickets', icon: '🎟️', scopes: [BusinessScope.EVENT_TICKETING] },
  { label: 'Tables', href: '/tables', icon: '🪑', scopes: [BusinessScope.TABLE_CLUB] },
  { label: 'Queue', href: '/queue', icon: '🚶', scopes: [BusinessScope.TABLE_CLUB] },
  { label: 'Venues', href: '/venues', icon: '🏢', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { label: 'Inventory', href: '/inventory', icon: '📦', scopes: [BusinessScope.TABLE_CLUB, BusinessScope.EVENT_TICKETING] },
  { label: 'Apartments', href: '/apartments', icon: '🏠', scopes: [BusinessScope.APARTMENT] },
  { label: 'Cars', href: '/cars', icon: '🚗', scopes: [BusinessScope.CAR_RENTAL] },
  { label: 'Campaigns', href: '/campaigns', icon: '📣', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  { label: 'Platform Settings', href: '/platform-settings', icon: '⚙️', roles: [UserRole.SUPER_ADMIN] },
  { label: 'Audit Log', href: '/audit', icon: '🔍', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const { user, logout } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
  }));

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const hasScope = (scopes: BusinessScope[]) => {
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;
    const userScopes: BusinessScope[] = user.businessScopes ?? [];
    return scopes.some((s) => userScopes.includes(s));
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role as UserRole);
  };

  const visibleItems = navItemsData.filter((item) => {
    if (!user) return false;

    const itemRoles = (item as { roles?: UserRole[] }).roles;
    const itemScopes = (item as { scopes?: BusinessScope[] }).scopes;

    if (itemRoles && itemScopes) {
      return hasRole(itemRoles) || hasScope(itemScopes);
    }

    if (itemRoles) return hasRole(itemRoles);
    if (itemScopes) return hasScope(itemScopes);

    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold">D&apos;LIFESTYLE</h1>
          <p className="text-blue-200 text-sm">Admin Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-blue-800 transition text-sm"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-300 mb-2 truncate">
            {user?.email}
          </div>

          <div className="text-xs text-blue-400 mb-3">{user?.role}</div>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex justify-between">
            <h2 className="text-xl font-semibold">
              {user
                ? `Welcome, ${user.firstName} ${user.lastName}`
                : "D'Lifestyle Admin"}
            </h2>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}