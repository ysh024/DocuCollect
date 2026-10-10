"use client";

import { useState, useRef } from "react";
import {
  FileUp,
  FileText,
  AlertCircle,
  Loader2,
  X,
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

  const handleFile = (file: File) => {
    setError(null);

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
      setError("Please select a PDF or clear image scan (JPG, PNG).");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File exceeds the 10 MB limit (${formatBytes(file.size)}). Please select a file under 10 MB.`);
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
          title: "Uploaded successfully",
          description: `${requirementName} received for review.`,
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
    <div className="w-full space-y-2">
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden file input supporting camera & gallery */}
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

      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
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
          className={`w-full py-3 px-4 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            isDragging
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : isReplacement
              ? "border-rose-300 bg-rose-50/50 hover:bg-rose-100/70 text-rose-800"
              : "border-neutral-300 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileUp className="w-4 h-4 text-neutral-500" />
            <span>{isReplacement ? "Tap to upload corrected file or photo" : "Tap to choose file or photo"}</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-normal">PDF, JPG, PNG up to 10 MB</span>
        </button>
      ) : (
        /* Compact File Confirmation Card */
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-500">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={handleCancelSelection}
                className="w-6 h-6 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 flex items-center justify-center transition"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {uploading ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  Uploading...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200/60">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Upload</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
