import { useState, useEffect } from 'react';
import { isPdfFile } from './file-validation';

interface UsePdfPreviewResult {
  previewUrl: string | null;
  isLoading: boolean;
  error: string | null;
  isPdf: boolean;
}

export function usePdfPreview(originalUrl: string): UsePdfPreviewResult {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    if (!originalUrl) {
      setPreviewUrl(null);
      setIsPdf(false);
      return;
    }

    const isPdf = isPdfFile(originalUrl);
    setIsPdf(isPdf);

    // If it's not a PDF, use the original URL
    if (!isPdf) {
      setPreviewUrl(originalUrl);
      return;
    }

    // For PDFs, convert to image (only on client side)
    const convertPdf = async () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        setPreviewUrl(originalUrl); // Fallback to original URL on server
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check if we already have a cached preview
        const cacheKey = `pdf_preview_${originalUrl}`;
        const cachedPreview = localStorage.getItem(cacheKey);
        
        if (cachedPreview) {
          setPreviewUrl(cachedPreview);
          setIsLoading(false);
          return;
        }

        // Dynamically import the conversion function
        const { convertPdfToImage } = await import('./pdf-to-image');
        
        // Convert PDF to image
        const result = await convertPdfToImage(originalUrl);
        
        if (result.success && result.imageUrl) {
          setPreviewUrl(result.imageUrl);
          // Cache the result (it's a blob URL, so it will be valid for the session)
          localStorage.setItem(cacheKey, result.imageUrl);
        } else {
          setError(result.error || 'Failed to convert PDF');
        }
      } catch (err) {
        console.error('PDF conversion error:', err);
        setError('Failed to convert PDF to image');
      } finally {
        setIsLoading(false);
      }
    };

    convertPdf();
  }, [originalUrl]);

  return { previewUrl, isLoading, error, isPdf };
}

