'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DataSharingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/business-settings?tab=data-sharing');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-500 text-sm">Redirecting to Business Settings...</p>
    </div>
  );
}
