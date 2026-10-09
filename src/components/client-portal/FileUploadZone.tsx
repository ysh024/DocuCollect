"use client";

import { useState, useRef } from "react";
import { UploadCloud, AlertCircle, Loader2, ArrowUpCircle, Camera } from "lucide-react";
import { clientUploadDocumentAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface FileUploadZoneProps {
  token: string;
  requirementId: string;
  requirementName: string;
  isReplacement?: boolean;
  onUploadComplete: () => void;
}

export function FileUploadZone({
  token,
  requirementId,
  requirementName,
  isReplacement = false,
  onUploadComplete,
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
      setError("Only PDF, JPG, PNG, and photo scans are accepted.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File size exceeds 25 MB limit.");
      return;
    }

    setUploading(true);
    setProgress(20);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    try {
      await new Promise((r) => setTimeout(r, 600));
      clearInterval(interval);
      setProgress(100);

      const res = await clientUploadDocumentAction(token, requirementId, {
        name: file.name,
        size: file.size,
        type: file.type || "image/jpeg",
      });

      if (!res.success) {
        setError((res as any).error || "Upload failed");
      } else {
        toast({
          title: "Document submitted!",
          description: `${requirementName} has been received for advisor review.`,
        });
        onUploadComplete();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? "border-neutral-900 bg-neutral-100/80 scale-[1.005]"
            : isReplacement
            ? "border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:bg-amber-50/50"
            : "border-neutral-200/90 bg-neutral-50/50 hover:border-neutral-400 hover:bg-neutral-100/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {/* Hidden camera input for mobile quick scan */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {uploading ? (
          <div className="py-1.5 space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-neutral-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-900" />
              <span>Verifying & submitting... {progress}%</span>
            </div>
            <div className="w-40 mx-auto bg-neutral-200 rounded-full h-1 overflow-hidden">
              <div
                className="bg-neutral-900 h-full transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-left">
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isReplacement
                    ? "bg-amber-100/80 text-amber-800"
                    : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {isReplacement ? (
                  <ArrowUpCircle className="w-4 h-4" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-neutral-800">
                  {isReplacement ? "Upload replacement file" : "Select or drag file"}
                </p>
                <p className="text-[10px] text-neutral-400">PDF, JPG, PNG up to 25 MB</p>
              </div>
            </div>

            {/* Mobile Scan Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-[10px] font-medium text-neutral-700 shadow-2xs"
            >
              <Camera className="w-3 h-3" />
              Camera
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-1 text-[10px] text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
