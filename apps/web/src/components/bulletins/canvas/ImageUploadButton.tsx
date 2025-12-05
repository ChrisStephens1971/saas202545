'use client';

import { useRef, useState } from 'react';

interface ImageUploadButtonProps {
  currentImageUrl?: string;
  onImageSelected: (imageUrl: string) => void;
  disabled?: boolean;
}

/**
 * ImageUploadButton - Provides native file picker for image selection
 *
 * For now, converts images to data URLs which can be stored in the layout JSON.
 * In production, you'd want to upload to a CDN/storage service.
 *
 * WARNING: Base64 images significantly increase JSON size. Multiple large images
 * can cause save failures. The API server allows up to 10MB payloads, but
 * performance degrades with large layouts.
 */
export function ImageUploadButton({
  currentImageUrl,
  onImageSelected,
  disabled = false
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsLoading(true);

    try {
      // Convert to data URL for now (in production, upload to CDN)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onImageSelected(dataUrl);
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
      setIsLoading(false);
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * SECURITY: Validate image URLs to prevent:
   * - javascript: URLs (XSS attacks)
   * - data: URLs with potentially malicious content
   * - Insecure HTTP URLs (prefer HTTPS)
   */
  const validateImageUrl = (url: string): { valid: boolean; error?: string } => {
    const trimmedUrl = url.trim();

    // Empty is technically valid (clears the image)
    if (!trimmedUrl) {
      return { valid: true };
    }

    try {
      const parsedUrl = new URL(trimmedUrl);

      // Block dangerous URL schemes
      const blockedSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
      if (blockedSchemes.some((scheme) => parsedUrl.protocol === scheme)) {
        return { valid: false, error: 'This URL type is not allowed for security reasons' };
      }

      // Allow only HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }

      // Warn about non-HTTPS (but still allow)
      if (parsedUrl.protocol === 'http:') {
        console.warn('Using non-HTTPS image URL:', trimmedUrl);
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  };

  const handleUrlInput = () => {
    const url = prompt('Enter image URL:', currentImageUrl || '');
    if (url !== null && url.trim()) {
      // SECURITY: Validate URL before accepting
      const validation = validateImageUrl(url);
      if (!validation.valid) {
        alert(validation.error || 'Invalid URL');
        return;
      }

      setPreview(url);
      onImageSelected(url);
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isLoading}
        className="hidden"
        aria-label="Select image file"
      />

      {/* Image preview */}
      {preview && (
        <div className="relative w-full h-32 bg-gray-100 rounded border">
          {/* eslint-disable-next-line @next/next/no-img-element -- Data URL preview from file input; not a network resource */}
          <img
            src={preview}
            alt="Selected image"
            className="w-full h-full object-contain rounded"
          />
          {!disabled && (
            <button
              onClick={() => {
                setPreview(null);
                onImageSelected('');
              }}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
              title="Remove image"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleButtonClick}
          disabled={disabled || isLoading}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {preview ? 'Change' : 'Choose'} Image
            </>
          )}
        </button>

        <button
          onClick={handleUrlInput}
          disabled={disabled}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          title="Enter image URL"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      {/* File type hint */}
      <p className="text-xs text-gray-500">
        Accepts: JPG, PNG, GIF, WebP (max 5MB)
      </p>
    </div>
  );
}