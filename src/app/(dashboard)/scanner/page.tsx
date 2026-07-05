'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';

interface ScanResult {
  ticketId: string;
  eventId?: string;
  status?: string;
  guestCount?: number;
  result?: string;
  timestamp: Date;
}

export default function ScannerPage() {
  const addToast = useUIStore(s => s.addToast);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);

  // Keep refs in sync with state for use in interval callback
  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleQRCode = useCallback(async (data: string) => {
    if (processingRef.current) return;
    setProcessing(true);
    
    try {
      let ticketData;
      try {
        ticketData = JSON.parse(data);
      } catch {
        setError('Invalid QR code format');
        setProcessing(false);
        return;
      }

      if (!ticketData.ticketId) {
        setError('Missing ticket ID in QR code');
        setProcessing(false);
        return;
      }

      // Check in the ticket
      await apiClient.bookings.updateStatus(ticketData.ticketId, 'CHECKED_IN');
      addToast('Ticket checked in successfully', 'success');
      
      setLastScan({
        ticketId: ticketData.ticketId,
        eventId: ticketData.eventId,
        status: 'CHECKED_IN',
        guestCount: ticketData.guestCount || 1,
        result: 'Success',
        timestamp: new Date(),
      });
      
      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
      
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to check in ticket';
      const cleanMsg = Array.isArray(msg) ? msg[0] : msg;
      addToast(cleanMsg, 'error');
      setError(cleanMsg);
      setLastScan({
        ticketId: 'Unknown',
        result: 'Failed: ' + msg,
        timestamp: new Date(),
      });
    } finally {
      setProcessing(false);
    }
  }, [addToast]);

  const startScanning = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !scanningRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Use BarcodeDetector if available (Chrome/Edge)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore - BarcodeDetector is not in all TypeScript definitions
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          
          if (barcodes.length > 0) {
            const data = barcodes[0].rawValue;
            await handleQRCode(data);
          }
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
    }, 500);
  }, [handleQRCode]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setScanning(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setHasPermission(false);
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    }
  }, [startScanning]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan ticket QR codes to check in guests
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Camera view */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-square mb-4">
          {hasPermission === null ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Start Scanner
              </button>
            </div>
          ) : hasPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <svg className="w-16 h-16 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-lg font-medium mb-2">Camera Access Denied</p>
              <p className="text-sm text-gray-400">
                Please allow camera access in your browser settings to use the scanner.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-white rounded-lg relative">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
                </div>
              </div>
              
              {processing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3" />
                    <p>Checking in...</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {hasPermission && (
          <div className="flex gap-3 mb-4">
            {scanning ? (
              <button
                onClick={stopCamera}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Stop Scanner
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Start Scanner
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Last scan result */}
        {lastScan && (
          <div className={`p-4 rounded-lg border ${
            lastScan.result === 'Success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              {lastScan.result === 'Success' ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {lastScan.result === 'Success' ? 'Ticket Checked In' : 'Check-in Failed'}
                </p>
                <p className="text-sm text-gray-600">
                  {lastScan.result === 'Success' 
                    ? `Guests: ${lastScan.guestCount || 1}`
                    : lastScan.result}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {lastScan.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How to use</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
            <li>Point the camera at the ticket's QR code</li>
            <li>Guests will be automatically checked in when scanned</li>
            <li>Make sure you have proper lighting for best results</li>
            <li>Works best in Chrome or Edge browsers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
