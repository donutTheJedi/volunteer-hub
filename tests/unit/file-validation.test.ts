import { isValidImageFile, isPdfFile, sanitizeFilename } from '@/lib/file-validation';

describe('file validation', () => {
  describe('isValidImageFile', () => {
    it('accepts valid image files and PDFs (PDFs are converted to JPG at upload)', () => {
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });

      expect(isValidImageFile(jpgFile)).toBe(true);
      expect(isValidImageFile(pngFile)).toBe(true);
      expect(isValidImageFile(pdfFile)).toBe(true); // PDFs are accepted and converted to JPG
    });

    it('rejects invalid file types', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const docFile = new File([''], 'test.doc', { type: 'application/msword' });

      expect(isValidImageFile(txtFile)).toBe(false);
      expect(isValidImageFile(docFile)).toBe(false);
    });

    it('validates by file extension when MIME type is missing', () => {
      const jpgFile = new File([''], 'test.jpg', { type: '' });
      const pngFile = new File([''], 'test.png', { type: '' });
      const pdfFile = new File([''], 'test.pdf', { type: '' });

      expect(isValidImageFile(jpgFile)).toBe(true);
      expect(isValidImageFile(pngFile)).toBe(true);
      expect(isValidImageFile(pdfFile)).toBe(true); // PDFs validated by extension
    });
  });

  describe('isPdfFile', () => {
    it('identifies PDF files correctly', () => {
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const pdfUrl = 'https://example.com/poster.pdf';
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const jpgUrl = 'https://example.com/poster.jpg';

      expect(isPdfFile(pdfFile)).toBe(true);
      expect(isPdfFile(pdfUrl)).toBe(true);
      expect(isPdfFile(jpgFile)).toBe(false);
      expect(isPdfFile(jpgUrl)).toBe(false);
    });

    it('handles case insensitive file extensions', () => {
      const pdfFileUpper = new File([''], 'test.PDF', { type: 'application/pdf' });
      const pdfUrlUpper = 'https://example.com/poster.PDF';

      expect(isPdfFile(pdfFileUpper)).toBe(true);
      expect(isPdfFile(pdfUrlUpper)).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('removes special characters and replaces with underscores', () => {
      const filename = 'Social service recruitment poster - Francia Ruiz, Cortés, Elizabeth Valle.png';
      const expected = 'Social_service_recruitment_poster_Francia_Ruiz_Cort_s_Elizabeth_Valle.png';
      expect(sanitizeFilename(filename)).toBe(expected);
    });

    it('handles multiple consecutive special characters', () => {
      const filename = 'file!!!@@@###.png';
      const expected = 'file_.png';
      expect(sanitizeFilename(filename)).toBe(expected);
    });

    it('removes leading and trailing underscores', () => {
      const filename = '_test_file_.png';
      const expected = 'test_file_.png';
      expect(sanitizeFilename(filename)).toBe(expected);
    });

    it('preserves valid characters', () => {
      const filename = 'valid-file-name123.png';
      const expected = 'valid_file_name123.png';
      expect(sanitizeFilename(filename)).toBe(expected);
    });

    it('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('handles filename with only special characters', () => {
      const filename = '!!!@@@###';
      const expected = '';
      expect(sanitizeFilename(filename)).toBe(expected);
    });
  });
});

