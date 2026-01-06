import { vi } from 'vitest';
import { convertPdfToImage } from '@/lib/pdf-to-image';

// Mock PDF.js for testing
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: vi.fn(() => Promise.resolve({
        getViewport: vi.fn(() => ({ width: 800, height: 600 })),
        render: vi.fn(() => ({
          promise: Promise.resolve()
        }))
      }))
    })
  })),
  GlobalWorkerOptions: { workerSrc: '' },
  version: '3.0.0'
}));

// Mock canvas and blob creation
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    // Mock canvas context
  })),
  toBlob: vi.fn((callback) => {
    const mockBlob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
    callback(mockBlob);
  })
};

// Mock document.createElement
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
  writable: true
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true
});

describe('PDF to Image Conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return disabled message for all PDF conversion attempts', async () => {
    const pdfUrl = 'https://example.com/test.pdf';
    
    const result = await convertPdfToImage(pdfUrl);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF conversion is temporarily disabled due to technical issues. Please convert your PDF to JPG or PNG format using an online converter or image editing software before uploading.');
    expect(result.imageUrl).toBeUndefined();
  });

  it('should return disabled message regardless of PDF URL', async () => {
    const pdfUrl = 'https://example.com/invalid.pdf';
    const result = await convertPdfToImage(pdfUrl);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF conversion is temporarily disabled due to technical issues. Please convert your PDF to JPG or PNG format using an online converter or image editing software before uploading.');
    expect(result.imageUrl).toBeUndefined();
  });

  it('should return disabled message with different quality settings', async () => {
    const pdfUrl = 'https://example.com/test.pdf';
    const result = await convertPdfToImage(pdfUrl, 0.9);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF conversion is temporarily disabled due to technical issues. Please convert your PDF to JPG or PNG format using an online converter or image editing software before uploading.');
    expect(result.imageUrl).toBeUndefined();
  });

  it('should return consistent disabled message for any PDF URL', async () => {
    const pdfUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDYgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA3IDAgUgo+PgplbmRvYmoKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjcyIDcyMCBUZAooSGVsbG8gV29ybGQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKOCAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKOSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgOCAwIFIKPj4KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTEyIDAwMDAwIG4KMDAwMDAwMDE2NSAwMDAwMCBuCjAwMDAwMDAyNzQgMDAwMDAgbgowMDAwMDAwMzI4IDAwMDAwIG4KMDAwMDAwMDQ2MSAwMDAwMCBuCjAwMDAwMDA1MTYgMDAwMDAgbgowMDAwMDAwNTY5IDAwMDAwIG4KMDAwMDAwMDY0NCAwMDAwMCBuCnRyYWlsZXIKPDwKL1NpemUgMTAKL1Jvb3QgOSAwIFIKPj4Kc3RhcnR4cmVmCjc0NAolJUVPRgo=';
    const result = await convertPdfToImage(pdfUrl);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF conversion is temporarily disabled due to technical issues. Please convert your PDF to JPG or PNG format using an online converter or image editing software before uploading.');
    expect(result.imageUrl).toBeUndefined();
  });

  it('should maintain consistent API interface despite being disabled', async () => {
    const pdfUrl = 'https://example.com/test.pdf';
    const result = await convertPdfToImage(pdfUrl);
    
    // Verify the result has the expected structure
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.error).toBe('string');
    // imageUrl should be undefined when disabled
    expect(result.imageUrl).toBeUndefined();
  });
});
