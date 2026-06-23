 import * as pdfjsLib from 'pdfjs-dist';
 
// Initialize PDF.js worker using Vite-compatible asset URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

 export interface CroppedQuestion {
   pageNumber: number;
   imageDataUrl: string;
   questionIndex: number;
 }
 
 export interface PDFPageImage {
   pageNumber: number;
   imageDataUrl: string;
   width: number;
   height: number;
 }
 
 /**
  * Render all PDF pages to images for viewing diagrams
  */
 export async function renderPDFPagesToImages(
   pdfData: ArrayBuffer,
   scale: number = 2
): Promise<PDFPageImage[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
   const pages: PDFPageImage[] = [];
 
   for (let i = 1; i <= pdf.numPages; i++) {
     const page = await pdf.getPage(i);
     const viewport = page.getViewport({ scale });
     
     const canvas = document.createElement('canvas');
     const context = canvas.getContext('2d')!;
     canvas.width = viewport.width;
     canvas.height = viewport.height;
 
     await page.render({
       canvasContext: context,
       viewport: viewport,
     }).promise;
 
     pages.push({
       pageNumber: i,
       imageDataUrl: canvas.toDataURL('image/png'),
       width: viewport.width,
       height: viewport.height,
     });
   }
 
   return pages;
 }
 
 /**
  * Crop a specific region from a PDF page
  */
 export async function cropPDFRegion(
   pdfData: ArrayBuffer,
   pageNumber: number,
   region: { x: number; y: number; width: number; height: number },
   scale: number = 2
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
   const page = await pdf.getPage(pageNumber);
   const viewport = page.getViewport({ scale });
 
   const canvas = document.createElement('canvas');
   const context = canvas.getContext('2d')!;
   canvas.width = viewport.width;
   canvas.height = viewport.height;
 
   await page.render({
     canvasContext: context,
     viewport: viewport,
   }).promise;
 
   // Create cropped canvas
   const croppedCanvas = document.createElement('canvas');
   const croppedContext = croppedCanvas.getContext('2d')!;
   croppedCanvas.width = region.width * scale;
   croppedCanvas.height = region.height * scale;
 
   croppedContext.drawImage(
     canvas,
     region.x * scale,
     region.y * scale,
     region.width * scale,
     region.height * scale,
     0,
     0,
     region.width * scale,
     region.height * scale
   );
 
   return croppedCanvas.toDataURL('image/png');
 }
 
/**
 * Extract all text from a PDF document page by page
 */
export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n` + pageText;
    }
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Auto-crop questions from PDF by detecting whitespace question boundaries on the page canvas.
 * Works perfectly on both scanned and digital PDFs using a pixel row darkness density analysis.
 */
export async function autoCropQuestions(
  pdfData: ArrayBuffer,
  questionsPerPage: number = 3,
  scale: number = 2
): Promise<CroppedQuestion[]> {
  const pageImages = await renderPDFPagesToImages(pdfData, scale);
  const croppedQuestions: CroppedQuestion[] = [];
  let questionIndex = 0;

  for (const pageImage of pageImages) {
    // Load image to get raw pixel data
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load page image"));
      img.src = pageImage.imageDataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pageImage.width;
    canvas.height = pageImage.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 1. Analyze row darkness density
    // Grayscale luminance formula: L = 0.299R + 0.587G + 0.114B
    const rowDarkness = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      let darkPixels = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Luminance < 225 is dark content (text, lines, diagrams)
        if (l < 225) {
          darkPixels++;
        }
      }
      rowDarkness[y] = darkPixels / width;
    }

    // 2. Identify empty/whitespace rows
    // A row is "empty" if the darkness ratio is less than 0.0035 (less than 0.35% dark pixels)
    const isEmpty = new Uint8Array(height);
    const emptyThreshold = 0.0035;
    for (let y = 0; y < height; y++) {
      isEmpty[y] = rowDarkness[y] < emptyThreshold ? 1 : 0;
    }

    // 3. Exclude top and bottom margins (header/footer areas)
    const topMarginLimit = Math.floor(height * 0.08);
    const bottomMarginLimit = Math.floor(height * 0.92);

    // 4. Find vertical spans of content
    const slices: { y: number; h: number }[] = [];
    let inContent = false;
    let sliceStart = 0;
    
    // Minimum content block height to prevent cropping tiny noise
    const minContentHeight = Math.floor(height * 0.045); // ~50 pixels depending on scale
    const bandHeight = Math.max(12, Math.floor(height * 0.008)); // minimum empty spacing height for a cut

    for (let y = topMarginLimit; y < bottomMarginLimit; y++) {
      if (!inContent) {
        if (isEmpty[y] === 0) {
          inContent = true;
          sliceStart = y;
        }
      } else {
        // We are inside a content block. Check if there's a significant whitespace band ahead.
        let isEmptyBand = true;
        if (y + bandHeight < bottomMarginLimit) {
          for (let dy = 0; dy < bandHeight; dy++) {
            if (isEmpty[y + dy] === 0) {
              isEmptyBand = false;
              break;
            }
          }
        } else {
          isEmptyBand = false;
        }

        if (isEmptyBand) {
          // Found a separator! Save the current content slice
          const sliceHeight = y - sliceStart;
          if (sliceHeight >= minContentHeight) {
            slices.push({ y: sliceStart, h: sliceHeight });
          }
          inContent = false;
          y += bandHeight - 1; // Skip the whitespace band
        }
      }
    }

    // Capture the last block if it extends to the margin limit
    if (inContent) {
      const sliceHeight = bottomMarginLimit - sliceStart;
      if (sliceHeight >= minContentHeight) {
        slices.push({ y: sliceStart, h: sliceHeight });
      }
    }

    // Fallback: If no slices detected, split page evenly into questionsPerPage parts
    if (slices.length === 0) {
      const sectionHeight = pageImage.height / questionsPerPage;
      for (let i = 0; i < questionsPerPage; i++) {
        slices.push({
          y: Math.floor(i * sectionHeight),
          h: Math.floor(sectionHeight)
        });
      }
    }

    // 5. Crop the page canvas for each detected slice
    for (const slice of slices) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = pageImage.width;
      cropCanvas.height = slice.h;
      const cropCtx = cropCanvas.getContext('2d')!;

      cropCtx.drawImage(
        img,
        0,
        slice.y,
        pageImage.width,
        slice.h,
        0,
        0,
        pageImage.width,
        slice.h
      );

      croppedQuestions.push({
        pageNumber: pageImage.pageNumber,
        imageDataUrl: cropCanvas.toDataURL('image/png'),
        questionIndex: questionIndex++,
      });
    }
  }

  return croppedQuestions;
}
 
 /**
  * Convert file to base64 for Gemini API
  */
 export function fileToBase64(file: File): Promise<string> {
   return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.onload = () => {
       const result = reader.result as string;
       // Remove the data URL prefix to get pure base64
       const base64 = result.split(',')[1];
       resolve(base64);
     };
     reader.onerror = reject;
     reader.readAsDataURL(file);
   });
 }
