 import * as pdfjsLib from 'pdfjs-dist';
 
// Initialize PDF.js worker using Vite-compatible asset URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
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
  * Auto-crop questions from PDF by detecting question boundaries
  * This is a simplified version - for complex PDFs, AI-based cropping is better
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
     // Simple approach: divide page into equal sections
     const sectionHeight = pageImage.height / questionsPerPage;
 
     for (let i = 0; i < questionsPerPage; i++) {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d')!;
       
       canvas.width = pageImage.width;
       canvas.height = sectionHeight;
 
       const img = new Image();
       await new Promise<void>((resolve) => {
         img.onload = () => resolve();
         img.src = pageImage.imageDataUrl;
       });
 
       ctx.drawImage(
         img,
         0,
         i * sectionHeight,
         pageImage.width,
         sectionHeight,
         0,
         0,
         pageImage.width,
         sectionHeight
       );
 
       croppedQuestions.push({
         pageNumber: pageImage.pageNumber,
         imageDataUrl: canvas.toDataURL('image/png'),
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