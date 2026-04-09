'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuthStore from '@/store/auth.store';
import Cookies from 'js-cookie';

const PUBLIC_ROUTES = ['/auth/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Check if user has a token
    const token = Cookies.get('accessToken');

    // If no token and not on public route, redirect to login
    if (!token && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/auth/login');
    }

    // If has token but on login page, redirect to dashboard
    if (token && pathname === '/auth/login') {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  return <>{children}</>;
}