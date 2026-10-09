"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  Camera,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { clientUploadDocumentAction } from "@/app/actions/portal";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface InteractiveFileUploadProps {
  token: string;
  requirementId: string;
  requirementName: string;
  isReplacement?: boolean;
  onUploadComplete: () => void;
}

export function InteractiveFileUpload({
  token,
  requirementId,
  requirementName,
  isReplacement = false,
  onUploadComplete,
}: InteractiveFileUploadProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
      setError("Please upload a PDF or clear image scan (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds the 25 MB limit.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((p) => (p >= 85 ? 85 : p + 20));
    }, 150);

    try {
      // Read file into Data URL
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file buffer"));
        reader.readAsDataURL(selectedFile);
      });

      const fileData = await fileDataPromise;
      clearInterval(interval);
      setUploadProgress(90);

      const res = await clientUploadDocumentAction(token, requirementId, {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || "image/jpeg",
        data: fileData,
      });

      setUploadProgress(100);

      if (!res.success) {
        setError((res as any).error || "Upload failed");
        setUploading(false);
      } else {
        toast({
          title: "Document submitted!",
          description: `${requirementName} has been received for review.`,
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        onUploadComplete();
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Failed to upload document. Please retry.");
      setUploading(false);
    }
  };

  const handleCancelSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-200 ${
            isDragging
              ? "border-emerald-500 bg-emerald-50/60 scale-[1.01]"
              : isReplacement
              ? "border-rose-300 bg-rose-50/40 hover:border-rose-400 hover:bg-rose-50/70"
              : "border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:bg-amber-50/40"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Direct Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isReplacement
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{isReplacement ? "Rescan / Take New Photo" : "Take Photo / Scan"}</span>
            </button>

            {/* Direct Browse File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-neutral-600" />
              <span>{isReplacement ? "Choose New File or PDF" : "Choose File or PDF"}</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 mt-2.5 font-medium">
            Tap above or drag & drop • Supports PDF, JPG, PNG up to 25 MB
          </p>
        </div>
      ) : (
        /* Instant File Confirmation Card */
        <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Scan Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {formatBytes(selectedFile.size)} • {selectedFile.type || "Document"}
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={handleCancelSelection}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                title="Change File"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {uploading ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Encrypting & submitting...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                Choose Different File
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Confirm & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
