'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/events?tab=tickets');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-500 text-sm">Redirecting to Events & Tickets...</p>
    </div>
  );
}
