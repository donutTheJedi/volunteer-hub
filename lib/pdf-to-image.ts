// PDF.js implementation with better error handling
let pdfjsLib: any = null;

// Initialize PDF.js only on client side
async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used on the client side');
  }
  
  if (!pdfjsLib) {
    try {
      console.log('Loading PDF.js library...');
      pdfjsLib = await import('pdfjs-dist');
      console.log('PDF.js version:', pdfjsLib.version);
      
      // Disable worker completely to avoid loading issues
      pdfjsLib.GlobalWorkerOptions.workerSrc = false;
      console.log('PDF.js worker disabled completely');
    } catch (error) {
      console.error('Failed to load PDF.js:', error);
      throw new Error(`Failed to load PDF.js library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return pdfjsLib;
}

export interface PdfToImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Converts the first page of a PDF to a JPG image
 * @param pdfUrl - URL of the PDF file
 * @param quality - Image quality (0-1, default 0.8)
 * @returns Promise with the result containing imageUrl or error
 */
export async function convertPdfToImage(
  pdfUrl: string, 
  quality: number = 0.8
): Promise<PdfToImageResult> {
  // Temporarily disable PDF conversion due to persistent worker issues
  // Users should convert PDFs to JPG/PNG manually before uploading
  return {
    success: false,
    error: 'PDF conversion is temporarily disabled due to technical issues. Please convert your PDF to JPG or PNG format using an online converter or image editing software before uploading.'
  };
}

/**
 * Converts PDF to image and uploads to Supabase storage
 * @param pdfUrl - URL of the PDF file
 * @param supabase - Supabase client instance
 * @returns Promise with the public URL of the uploaded image
 */
export async function convertAndUploadPdfToImage(
  pdfUrl: string,
  supabase: any
): Promise<PdfToImageResult> {
  try {
    // Convert PDF to image
    const conversionResult = await convertPdfToImage(pdfUrl);
    
    if (!conversionResult.success || !conversionResult.imageUrl) {
      return conversionResult;
    }
    
    // Fetch the blob data
    const response = await fetch(conversionResult.imageUrl);
    const blob = await response.blob();
    
    // Create a unique filename
    const fileName = `pdf_preview_${Date.now()}.jpg`;
    const storagePath = `pdf-previews/${fileName}`;
    
    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('senior-projects-posters')
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (uploadError) {
      return { success: false, error: 'Failed to upload converted image' };
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('senior-projects-posters')
      .getPublicUrl(storagePath);
    
    // Clean up the object URL
    URL.revokeObjectURL(conversionResult.imageUrl);
    
    return { 
      success: true, 
      imageUrl: publicUrlData.publicUrl 
    };
    
  } catch (error) {
    console.error('PDF conversion and upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
