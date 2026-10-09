"use client";

import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Move,
} from "lucide-react";
import { uploadFirmLogoAction } from "@/app/actions/auth";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface SquareLogoCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLogoUrl: string) => void;
}

export function SquareLogoCropperModal({
  isOpen,
  onClose,
  onSuccess,
}: SquareLogoCropperModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Crop & Transform State
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Output Preview Stats
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image when selected
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please select an image file (PNG, JPG, WebP)." });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Render to square canvas whenever zoom or offsets change
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 320; // High-DPI square output size
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions to fit square
    const imgAspect = imageObj.width / imageObj.height;
    let drawWidth = size * zoom;
    let drawHeight = size * zoom;

    if (imgAspect > 1) {
      drawWidth = size * imgAspect * zoom;
    } else {
      drawHeight = (size / imgAspect) * zoom;
    }

    const drawX = (size - drawWidth) / 2 + offsetX;
    const drawY = (size - drawHeight) / 2 + offsetY;

    ctx.drawImage(imageObj, drawX, drawY, drawWidth, drawHeight);

    // Calculate compressed preview size
    canvas.toBlob(
      (blob) => {
        if (blob) setOptimizedSize(blob.size);
      },
      "image/webp",
      0.88
    );
  }, [imageObj, zoom, offsetX, offsetY]);

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageObj) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageObj || e.touches.length === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - offsetX, y: e.touches[0].clientY - offsetY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    setOffsetX(e.touches[0].clientX - dragStart.x);
    setOffsetY(e.touches[0].clientY - dragStart.y);
  };

  // Confirm and upload
  const handleSaveLogo = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const base64Data = canvas.toDataURL("image/webp", 0.88);

    setUploading(true);
    try {
      const res = await uploadFirmLogoAction({
        logoBase64: base64Data,
        mimeType: "image/webp",
      });

      if (res.success && res.logoUrl) {
        toast({
          title: "Firm Logo Uploaded!",
          description: "Your custom square logo is now live on your client portals and dashboard.",
        });
        onSuccess(res.logoUrl);
        handleReset();
        onClose();
      } else {
        toast({ title: "Upload Failed", description: res.error || "Could not save logo" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save logo" });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setImageObj(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setOptimizedSize(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Custom Square Logo</h3>
              <p className="text-[11px] text-neutral-500">Crop and optimize your firm branding</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {!imageSrc ? (
          /* File Selector Dropzone */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-800">Click to select firm logo</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Supports PNG, JPG, or WebP</p>
            </div>
            <span className="inline-block px-3 py-1 bg-neutral-900 text-white text-[11px] font-bold rounded-lg shadow-2xs">
              Choose Image File
            </span>
          </div>
        ) : (
          /* Interactive Square Cropper & Resizer */
          <div className="space-y-4">
            <div className="relative mx-auto w-64 h-64 bg-neutral-100 rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-inner flex items-center justify-center cursor-move select-none group">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="w-full h-full object-contain"
              />

              {/* Overlay hint */}
              <div className="absolute bottom-2 left-2 right-2 bg-neutral-950/70 backdrop-blur-xs text-white text-[10px] py-1 px-2 rounded-md flex items-center justify-center gap-1.5 opacity-80 pointer-events-none">
                <Move className="w-3 h-3" />
                <span>Drag to position • 1:1 Square</span>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1.5 px-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                <span className="flex items-center gap-1">
                  <ZoomOut className="w-3.5 h-3.5" />
                  Zoom
                </span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Image Compression Stats */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Original File</span>
                <p className="font-bold text-neutral-800">{selectedFile ? formatBytes(selectedFile.size) : "—"}</p>
              </div>
              <span className="text-neutral-400">→</span>
              <div className="text-right">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold">Optimized Logo Size</span>
                <p className="font-bold text-emerald-700">
                  {optimizedSize ? formatBytes(optimizedSize) : "Calculating..."}{" "}
                  {selectedFile && optimizedSize && (
                    <span className="text-[10px] font-normal text-emerald-600">
                      (-{Math.max(0, Math.round((1 - optimizedSize / selectedFile.size) * 100))}%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Choose Other</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={handleSaveLogo}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Square Logo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
