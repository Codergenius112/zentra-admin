'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuthStore from '@/store/auth.store';
import Cookies from 'js-cookie';
import { UserRole, BusinessScope } from '@/types';

const PUBLIC_ROUTES = ['/auth/login'];

interface RouteAccess {
  roles?: UserRole[];
  scopes?: BusinessScope[];
  superAdminOnly?: boolean;
}

const ROUTE_ACCESS: Record<string, RouteAccess> = {
  '/dashboard':         { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.WAITER, UserRole.KITCHEN_STAFF, UserRole.BAR_STAFF, UserRole.DOOR_STAFF] },
  '/bookings':          { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/orders':            { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.WAITER, UserRole.KITCHEN_STAFF, UserRole.BAR_STAFF] },
  '/staff':             { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/analytics':         { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/audit':             { roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  '/events':            { scopes: [BusinessScope.EVENT_TICKETING] },
  '/tickets':           { scopes: [BusinessScope.EVENT_TICKETING] },
  '/tables':            { scopes: [BusinessScope.TABLE_CLUB], roles: [UserRole.WAITER] },
  '/queue':             { scopes: [BusinessScope.TABLE_CLUB], roles: [UserRole.DOOR_STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/apartments':        { scopes: [BusinessScope.APARTMENT] },
  '/cars':              { scopes: [BusinessScope.CAR_RENTAL] },
  '/inventory':         { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/campaigns':         { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/scanner':           { roles: [UserRole.DOOR_STAFF, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
  '/platform-settings': { superAdminOnly: true },
};

function canAccess(
  pathname: string,
  user: { role: string; businessScopes?: BusinessScope[] | null } | null,
): boolean {
  if (!user) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;

  const matchKey = Object.keys(ROUTE_ACCESS)
    .filter((key) => pathname === key || pathname.startsWith(key + '/'))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchKey) return true;

  const rule = ROUTE_ACCESS[matchKey];
  if (rule.superAdminOnly) return false;
  if (rule.roles && rule.roles.includes(user.role as UserRole)) return true;
  if (rule.scopes) {
    const userScopes = user.businessScopes ?? [];
    return rule.scopes.some((s) => userScopes.includes(s));
  }
  if (rule.roles && !rule.roles.includes(user.role as UserRole)) return false;
  return true;
}

function getDefaultRoute(
  user: { role: string; businessScopes?: BusinessScope[] | null } | null,
): string {
  if (!user) return '/auth/login';
  if (user.role === UserRole.SUPER_ADMIN) return '/dashboard';

  const routeOrder = [
    '/dashboard', '/orders', '/tables', '/queue', '/bookings',
    '/staff', '/events', '/tickets', '/apartments', '/cars',
    '/inventory', '/analytics', '/campaigns', '/audit',
  ];
  for (const route of routeOrder) {
    if (canAccess(route, user)) return route;
  }
  return '/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user            = useAuthStore((state) => state.user);
  const sessionRestored = useAuthStore((state) => state.sessionRestored);
  const restoreSession  = useAuthStore((state) => state.restoreSession);

  // Start as true so we never flash protected content before the check.
  const [isChecking, setIsChecking] = useState(true);

  // Restore session from backend when cookie exists but user is missing
  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (token && !user && !sessionRestored) {
      restoreSession().finally(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isChecking) return; // wait for session restore first

    const token = Cookies.get('accessToken');
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!token && !isPublic) {
      router.push('/auth/login');
      return;
    }

    if ((token || isAuthenticated) && pathname === '/auth/login') {
      router.push(getDefaultRoute(user));
      return;
    }

    if ((token || isAuthenticated) && user && !isPublic) {
      if (!canAccess(pathname, user)) {
        router.push(getDefaultRoute(user));
      }
    }
  }, [pathname, router, isAuthenticated, user, isChecking]);

  // Show loading spinner while we resolve auth state.
  if (isChecking && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}