import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFPageImage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface CropRegion {
  x: number; y: number; width: number; height: number;
}

interface CroppedImage {
  dataUrl: string; pageNumber: number; index: number;
}

interface PDFCropToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PDFPageImage[];
  onCroppedQuestions: (images: CroppedImage[]) => void;
}

export function PDFCropTool({ open, onOpenChange, pages, onCroppedQuestions }: PDFCropToolProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const page = pages[currentPage];

  useEffect(() => {
    if (open) { setCurrentPage(0); setCropRegion(null); setCropStart(null); setIsDrawing(false); }
  }, [open]);

  // Get coords relative to the inner wrapper (which contains image + overlay)
  const getRelativeCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { x: 0, y: 0 };
    const rect = wrapper.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setCropStart(coords);
    setCropRegion(null);
    setIsDrawing(true);
  }, [getRelativeCoords]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !cropStart) return;
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setCropRegion({
      x: Math.min(cropStart.x, coords.x),
      y: Math.min(cropStart.y, coords.y),
      width: Math.abs(coords.x - cropStart.x),
      height: Math.abs(coords.y - cropStart.y),
    });
  }, [isDrawing, cropStart, getRelativeCoords]);

  const handleEnd = useCallback(() => { setIsDrawing(false); }, []);

  const handleCrop = useCallback(() => {
    if (!cropRegion || !page || !imgRef.current) return;
    const img = imgRef.current;
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    if (displayW === 0 || displayH === 0) return;

    const scaleX = img.naturalWidth / displayW;
    const scaleY = img.naturalHeight / displayH;

    const srcX = Math.max(0, cropRegion.x * scaleX);
    const srcY = Math.max(0, cropRegion.y * scaleY);
    const srcW = Math.min(img.naturalWidth - srcX, cropRegion.width * scaleX);
    const srcH = Math.min(img.naturalHeight - srcY, cropRegion.height * scaleY);

    if (srcW < 5 || srcH < 5) return;

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d')!;

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      ctx.drawImage(tempImg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      setCroppedImages(prev => [...prev, {
        dataUrl: canvas.toDataURL('image/png'),
        pageNumber: page.pageNumber,
        index: prev.length,
      }]);
      setCropRegion(null);
    };
    tempImg.src = page.imageDataUrl;
  }, [cropRegion, page]);

  const handleDone = () => { onCroppedQuestions(croppedImages); onOpenChange(false); };

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[95vh] p-3 md:p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm md:text-base">
            <Crop className="h-5 w-5 text-primary" /> Manual Crop — Page {currentPage + 1}/{pages.length}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-3 h-[78vh]">
          {/* Main crop area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" disabled={currentPage === 0}
                  onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs md:text-sm px-2">Page {currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" disabled={currentPage === pages.length - 1}
                  onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCropRegion(null)} disabled={!cropRegion}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button size="sm" disabled={!cropRegion || cropRegion.width < 10 || cropRegion.height < 10} onClick={handleCrop}>
                  <Crop className="h-4 w-4 mr-1" /> Crop
                </Button>
              </div>
            </div>

            {/* Scrollable container with inner positioned wrapper */}
            <div className="relative border rounded-lg overflow-auto flex-1 bg-muted/30">
              <div
                ref={wrapperRef}
                className="relative inline-block cursor-crosshair select-none"
                style={{ touchAction: 'none' }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              >
                <img
                  ref={imgRef}
                  src={page.imageDataUrl}
                  alt={`Page ${currentPage + 1}`}
                  className="max-w-full pointer-events-none"
                  draggable={false}
                  style={{ display: 'block' }}
                />
                {/* Crop overlay - positioned relative to inner wrapper, tracks with image */}
                {cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
                  <div
                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                    style={{
                      left: cropRegion.x,
                      top: cropRegion.y,
                      width: cropRegion.width,
                      height: cropRegion.height,
                      borderStyle: 'dashed',
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      {Math.round(cropRegion.width)}×{Math.round(cropRegion.height)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-1">
              Click & drag to select region → Crop → Repeat for each question/diagram
            </p>
          </div>

          {/* Cropped images panel */}
          <div className="w-full lg:w-48 flex flex-col min-h-0">
            <p className="text-sm font-medium mb-2">Crops ({croppedImages.length})</p>
            <ScrollArea className="flex-1">
              <div className="flex lg:flex-col gap-2 pr-2 overflow-x-auto lg:overflow-x-visible">
                {croppedImages.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Crop regions from PDF pages.</p>
                )}
                {croppedImages.map((ci, i) => (
                  <div key={i} className="relative border rounded overflow-hidden group bg-card flex-shrink-0 w-32 lg:w-full">
                    <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full" />
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded font-medium">
                      Q{i + 1} (P{ci.pageNumber})
                    </div>
                    <button
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setCroppedImages(prev => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {croppedImages.length > 0 && (
              <Button onClick={handleDone} className="w-full mt-2" size="sm">
                <Download className="h-4 w-4 mr-1" /> Use {croppedImages.length} Crops
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
