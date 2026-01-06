/**
 * Validates if a file is an allowed poster format (JPG, PNG, or PDF)
 * @param file - The file to validate
 * @returns true if valid, false if invalid
 */
export function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  
  // Check MIME type
  if (allowedTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check file extension as fallback
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Gets the error message for invalid file format
 * @param t - Translation function
 * @returns Error message string
 */
export function getInvalidFileFormatMessage(t: (key: string) => string): string {
  return t('organizations.invalidFileFormat');
}

/**
 * Checks if a file URL or file is a PDF
 * @param fileOrUrl - File object or URL string
 * @returns true if PDF, false otherwise
 */
export function isPdfFile(fileOrUrl: File | string): boolean {
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl.toLowerCase().endsWith('.pdf');
  }
  return fileOrUrl.type === 'application/pdf' || fileOrUrl.name.toLowerCase().endsWith('.pdf');
}

/**
 * Sanitizes a filename to remove special characters that can cause storage issues
 * @param filename - The original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.]/g, '_') // Replace special chars (including hyphens) with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_/, '') // Remove leading underscore
    .replace(/_$/, ''); // Remove trailing underscore
}
