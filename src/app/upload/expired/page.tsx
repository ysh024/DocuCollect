import Link from "next/link";
import { Clock, AlertCircle, ArrowLeft, Mail } from "lucide-react";

export const metadata = {
  title: "Link Expired | DocuCollect",
  description: "This document upload link is expired or has been revoked.",
};

export default function UploadExpiredPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 text-neutral-900">
      <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Upload Link Expired or Inactive
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            This document request link has either expired or been refreshed by your Chartered Accountant / consultant for security reasons.
          </p>
        </div>

        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left space-y-2 text-xs text-neutral-600">
          <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-neutral-500" /> What should you do?
          </p>
          <p>
            Please reply to the WhatsApp or email message sent by your service provider and ask them to share a new upload link.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to DocuCollect Home
          </Link>
        </div>
      </div>
    </div>
  );
}
