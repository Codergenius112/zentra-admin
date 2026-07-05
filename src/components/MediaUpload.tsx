'use client';

import { useState, useRef, DragEvent } from 'react';
import { apiClient } from '@/services/api';

interface MediaUploadProps {
  onUploadComplete: (urls: string[]) => void;
  existingUrls?: string[];
  maxFiles?: number;
  accept?: string;
}

export default function MediaUpload({ onUploadComplete, existingUrls = [], maxFiles = 10, accept = 'image/*,video/*' }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; file?: File }[]>(
    existingUrls.map(url => ({ url }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const fileArray = Array.from(files).slice(0, maxFiles - previews.length);
    if (fileArray.length === 0) {
      setError(`Maximum ${maxFiles} files allowed`);
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      fileArray.forEach(file => formData.append('files', file));

      const response = await apiClient.uploadFiles(formData);
      const newUrls = response.map((r: any) => r.url);

      const newPreviews = fileArray.map((file, i) => ({
        url: newUrls[i],
        file,
      }));

      setPreviews(prev => [...prev, ...newPreviews]);
      onUploadComplete([...previews.map(p => p.url), ...newUrls]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onUploadComplete(newPreviews.map(p => p.url));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="text-gray-400 mb-2">
          <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">
          {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images and videos up to 10MB each (max {maxFiles} files)
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
              {preview.url.match(/\.(mp4|mov|avi)$/i) ? (
                <video src={preview.url} className="w-full h-full object-cover" />
              ) : (
                <img src={preview.url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
