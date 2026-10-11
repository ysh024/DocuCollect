"use client";

/**
 * Downloads a file via fetch and blob URL with immediate user notification and error handling.
 */
export async function downloadFileWithFeedback({
  url,
  fileName,
  toast,
  onStart,
  onComplete,
}: {
  url: string;
  fileName: string;
  toast?: (options: { title: string; description?: string; type?: "success" | "error" | "info" }) => void;
  onStart?: () => void;
  onComplete?: () => void;
}): Promise<boolean> {
  if (onStart) onStart();

  if (toast) {
    toast({
      title: "Download Started",
      description: `Downloading "${fileName}"...`,
      type: "info",
    });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);

    if (toast) {
      toast({
        title: "Download Complete",
        description: `"${fileName}" has been downloaded successfully.`,
        type: "success",
      });
    }

    if (onComplete) onComplete();
    return true;
  } catch (err: any) {
    console.error("Download error:", err);
    if (toast) {
      toast({
        title: "Download Failed",
        description: err?.message || `Could not download "${fileName}". Please check your internet connection.`,
        type: "error",
      });
    }
    if (onComplete) onComplete();
    return false;
  }
}
