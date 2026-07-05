'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/services/api';
import type { Booking } from '@/types';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  COMPLETED:  'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-red-100 text-red-700',
  EXPIRED:    'bg-orange-100 text-orange-700',
};

function QRScanTab() {
  const addToast = useUIStore(s => s.addToast);
  const [qrInput, setQrInput]   = useState('');
  const [result, setResult]     = useState<{ success: boolean; booking?: Booking; message?: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { processingRef.current = processing; }, [processing]);

  // Attach stream to video element AFTER React renders it
  useEffect(() => {
    if (cameraActive && hasPermission && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive, hasPermission]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleQRData = useCallback(async (data: string) => {
    if (processingRef.current) return;
    setProcessing(true);
    setResult(null);
    try {
      // Try parsing as JSON first (structured QR), otherwise use raw string
      let qrPayload = data;
      try {
        const parsed = JSON.parse(data);
        qrPayload = parsed.qrCodeData ?? parsed.bookingId ?? data;
      } catch { /* raw string */ }
      const booking = await apiClient.tickets.scan(qrPayload.trim());
      setResult({ success: true, booking });
      addToast('Ticket checked in successfully', 'success');
      if ('vibrate' in navigator) navigator.vibrate(200);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Invalid or already scanned ticket';
      setResult({ success: false, message: msg });
      addToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  }, [addToast]);

  const startScanLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) await handleQRData(barcodes[0].rawValue);
        } catch (err) { console.error('Detection error:', err); }
      }
    }, 500);
  }, [cameraActive, handleQRData]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setHasPermission(true);
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setHasPermission(false);
      else setResult({ success: false, message: 'Camera error: ' + err.message });
    }
  }, []);

  // Start/stop scan loop when camera toggles
  useEffect(() => {
    if (cameraActive) startScanLoop();
    else if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cameraActive, startScanLoop]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleManualScan = async () => {
    if (!qrInput.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const booking = await apiClient.tickets.scan(qrInput.trim());
      setResult({ success: true, booking });
      addToast('Ticket checked in successfully', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Invalid or already scanned ticket';
      setResult({ success: false, message: msg });
      addToast(msg, 'error');
    } finally {
      setScanning(false);
      setQrInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      {/* Camera scanner */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📷 Live QR Scanner</h3>
          {cameraActive ? (
            <button onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Stop Camera</button>
          ) : (
            <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Start Camera</button>
          )}
        </div>

        {cameraActive && hasPermission && (
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-4 border-white/60 rounded-lg relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
              </div>
            </div>
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mx-auto mb-2" />
                  <p className="text-sm">Checking in...</p>
                </div>
              </div>
            )}
          </div>
        )}
        {hasPermission === false && (
          <p className="text-red-600 text-sm mb-3">Camera access denied. Please allow camera in browser settings.</p>
        )}
        <p className="text-xs text-gray-500">Point the camera at a ticket QR code for automatic check-in. Works best in Chrome/Edge.</p>
      </div>

      {/* Manual input fallback */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-3">⌨️ Manual Entry</h3>
        <div className="flex gap-2 mb-4">
          <input ref={inputRef} type="text" placeholder="Paste or type QR code data..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleManualScan(); }} />
          <button onClick={handleManualScan} disabled={scanning || !qrInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {scanning ? '...' : 'Scan'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-4 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.success && result.booking ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-xl">✅</span>
                <span className="font-semibold text-green-800">Check-in successful</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Booking ID:</strong> {result.booking.id.slice(0, 8)}...</p>
                <p><strong>Guest:</strong> {result.booking.user?.firstName} {result.booking.user?.lastName}</p>
                <p><strong>Status:</strong> {result.booking.status}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <span className="text-red-800 text-sm font-medium">{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'scan'>('list');
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await apiClient.tickets.list({ limit: 100, status: statusFilter || undefined }) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (activeTab === 'list') fetchTickets(); }, [activeTab, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total ticket bookings</p>
        </div>
        <div className="flex gap-2">
          {(['list', 'scan'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {tab === 'list' ? '🎟️ All Tickets' : '📷 QR Scanner'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'scan' ? (
        <QRScanTab />
      ) : (
        <>
          <div className="mb-4">
            <select className="px-3 py-2 border rounded-lg text-sm"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','EXPIRED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading tickets...</div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Booking ID','Guest','Status','Amount','Scanned','Created'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No tickets found</td></tr>
                  ) : bookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : b.userId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">₦{Number(b.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {b.scannedAt ? new Date(b.scannedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}