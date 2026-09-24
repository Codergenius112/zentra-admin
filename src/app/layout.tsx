import type { Metadata } from 'next';
import '@/app/globals.css';
import QueryProvider from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ToastContainer } from '@/components/providers/toast';

export const metadata: Metadata = {
  title: 'Zentra Admin',
  description: 'Admin panel for Zentra platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <ToastContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}