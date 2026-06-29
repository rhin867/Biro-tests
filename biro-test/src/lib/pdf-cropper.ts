import * as pdfjsLib from 'pdfjs-dist';

// ── Worker setup (works on Vite + CDN fallback) ──────────────────────────────
if (typeof window !== 'undefined') {
  try {
    // Vite-native (preferred)
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // CDN fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export interface CroppedQuestion {
  pageNumber: number;
  imageDataUrl: string;
  questionIndex: number;
}

/** Result from auto-crop — one detected question region */
export interface CropResult {
  id: string;
  questionIndex: number;
  pageNumber: number;
  imageDataUrl: string;
}

// ── Existing helpers (kept for backward compatibility) ────────────────────────

/** Render all PDF pages to images (used by PDFCropTool + page preview) */
export async function renderPDFPagesToImages(
  pdfData: ArrayBuffer,
  scale = 1.5
): Promise<PDFPageImage[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
  const pages: PDFPageImage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({
      pageNumber: i,
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: canvas.width,
      height: canvas.height,
    });
  }
  return pages;
}

/** Crop a specific pixel region from a PDF page */
export async function cropPDFRegion(
  pdfData: ArrayBuffer,
  pageNumber: number,
  region: { x: number; y: number; width: number; height: number },
  scale = 2
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const out = document.createElement('canvas');
  const octx = out.getContext('2d')!;
  out.width = Math.round(region.width * scale);
  out.height = Math.round(region.height * scale);
  octx.drawImage(
    canvas,
    region.x * scale, region.y * scale,
    region.width * scale, region.height * scale,
    0, 0, out.width, out.height
  );
  return out.toDataURL('image/png');
}

/** Convert File to base64 string (no data-URI prefix) */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Auto-crop engine ──────────────────────────────────────────────────────────

/** Render a single page to canvas at given scale */
async function renderPageCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas;
}

/**
 * Detect if a page is laid out in 2 columns.
 * Checks whether the centre vertical strip is almost entirely white.
 */
function isDoubleColumn(
  imgData: ImageData,
  gapWidthFraction = 0.08,
  maxDarkFraction = 0.015
): boolean {
  const { data, width, height } = imgData;
  const gW = Math.floor(width * gapWidthFraction);
  const gX = Math.floor(width / 2) - Math.floor(gW / 2);
  const yTop = Math.floor(height * 0.08);
  const yBot = Math.floor(height * 0.92);
  let dark = 0, total = 0;

  for (let y = yTop; y < yBot; y++) {
    for (let x = gX; x < gX + gW; x++) {
      const i = (y * width + x) * 4;
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 180) dark++;
      total++;
    }
  }
  return total > 0 && dark / total < maxDarkFraction;
}

/** Compute per-row darkness fraction over a horizontal strip [xStart, xEnd) */
function rowDarknessSlice(
  imgData: ImageData,
  xStart: number,
  xEnd: number,
  threshold = 180
): number[] {
  const { data, width, height } = imgData;
  const cols = xEnd - xStart;
  const out = new Array<number>(height);
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = xStart; x < xEnd; x++) {
      const i = (y * width + x) * 4;
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < threshold) dark++;
    }
    out[y] = dark / cols;
  }
  return out;
}

/** Find question block boundaries from per-row darkness array */
function findBlocks(
  darkness: number[],
  opts: {
    gapThr?: number;    // row is a "gap" if darkness < this
    minGap?: number;    // min consecutive gap rows to split blocks
    minBlock?: number;  // min content rows to count as a question
    topSkip?: number;   // skip top N rows (header)
    botSkip?: number;   // skip bottom N rows (footer)
  } = {}
): Array<{ start: number; end: number }> {
  const {
    gapThr = 0.018,
    minGap = 7,
    minBlock = 40,
    topSkip = Math.floor(darkness.length * 0.03),
    botSkip = Math.floor(darkness.length * 0.03),
  } = opts;

  const H = darkness.length;
  const blocks: Array<{ start: number; end: number }> = [];
  let inContent = false;
  let blockStart = -1;
  let gapCount = 0;

  for (let y = topSkip; y < H - botSkip; y++) {
    const isContent = darkness[y] > gapThr;
    if (isContent) {
      gapCount = 0;
      if (!inContent) { inContent = true; blockStart = y; }
    } else {
      gapCount++;
      if (inContent && gapCount >= minGap) {
        const end = y - gapCount + 1;
        if (end - blockStart >= minBlock) blocks.push({ start: blockStart, end });
        inContent = false; blockStart = -1;
      }
    }
  }
  if (inContent && blockStart >= 0) {
    const end = H - botSkip;
    if (end - blockStart >= minBlock) blocks.push({ start: blockStart, end });
  }
  return blocks;
}

/** Crop a rectangular region from a canvas and return a PNG data-URI */
function cropRegion(
  src: HTMLCanvasElement,
  x: number, y: number, w: number, h: number,
  pad = 12
): string {
  const px = Math.max(0, x - pad);
  const py = Math.max(0, y - pad);
  const pw = Math.min(src.width - px, w + pad * 2);
  const ph = Math.min(src.height - py, h + pad * 2);
  const out = document.createElement('canvas');
  out.width = pw; out.height = ph;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, pw, ph);
  ctx.drawImage(src, px, py, pw, ph, 0, 0, pw, ph);
  return out.toDataURL('image/png');
}

/**
 * AUTO-CROP: Processes every page and returns detected question regions.
 * 100% browser-side, zero AI credits, works on scanned & digital PDFs.
 *
 * @param pdfFile   The uploaded PDF file
 * @param onProgress  Optional callback (0-100, status string)
 */
export async function autoCropPDF(
  pdfFile: File,
  onProgress?: (pct: number, msg: string) => void
): Promise<CropResult[]> {
  const buffer = await pdfFile.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const numPages = pdfDoc.numPages;
  const results: CropResult[] = [];
  let qIdx = 0;

  for (let p = 1; p <= numPages; p++) {
    const pct = Math.round(((p - 1) / numPages) * 94);
    onProgress?.(pct, `Scanning page ${p} / ${numPages}…`);

    try {
      const canvas = await renderPageCanvas(pdfDoc, p, 1.8);
      const ctx = canvas.getContext('2d')!;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (isDoubleColumn(imgData)) {
        // Two-column layout — process each half independently
        const mid = Math.floor(canvas.width / 2);
        for (const col of [{ x: 0, w: mid }, { x: mid, w: canvas.width - mid }]) {
          const darkness = rowDarknessSlice(imgData, col.x, col.x + col.w);
          for (const b of findBlocks(darkness)) {
            results.push({
              id: `${p}-${qIdx}`,
              questionIndex: qIdx++,
              pageNumber: p,
              imageDataUrl: cropRegion(canvas, col.x, b.start, col.w, b.end - b.start),
            });
          }
        }
      } else {
        // Single-column layout
        const darkness = rowDarknessSlice(imgData, 0, canvas.width);
        for (const b of findBlocks(darkness)) {
          results.push({
            id: `${p}-${qIdx}`,
            questionIndex: qIdx++,
            pageNumber: p,
            imageDataUrl: cropRegion(canvas, 0, b.start, canvas.width, b.end - b.start),
          });
        }
      }
    } catch (err) {
      console.error(`autoCropPDF: page ${p} failed`, err);
    }
  }

  onProgress?.(100, `Done — ${results.length} questions detected`);
  return results;
}

/** Stitch two PNG data-URIs vertically into one (for merge) */
export async function mergeImagesVertical(
  topDataUrl: string,
  botDataUrl: string
): Promise<string> {
  const load = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

  const [top, bot] = await Promise.all([load(topDataUrl), load(botDataUrl)]);
  const w = Math.max(top.width, bot.width);
  const h = top.height + bot.height + 4; // 4px gap
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(top, 0, 0);
  ctx.drawImage(bot, 0, top.height + 4);
  return canvas.toDataURL('image/png');
}
