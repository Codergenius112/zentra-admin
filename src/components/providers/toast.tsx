'use client';

import useUIStore from '@/store/ui.store';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  const getBgColor = (type: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getBgColor(
            toast.type,
          )} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 min-w-[300px] animate-in slide-in-from-right`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:opacity-80 transition"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}