"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  MessageSquareShare,
  Info,
  PartyPopper,
  RefreshCw,
  Sparkles,
  WifiOff,
  Mail,
  Phone,
  Trash2,
  FileUp,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";
import {
  getPortalData,
  clientUploadDocumentAction,
} from "@/app/actions";
import { ClientPortalData } from "@/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import {
  RequirementsPopover,
  ThemeToggle,
  useToast,
  SafeImage,
} from "@/components/ui";

export default function ClientUploadPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [replacingReqId, setReplacingReqId] = useState<string | null>(null);
  const { toast } = useToast();
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [consentHighlighted, setConsentHighlighted] = useState<boolean>(false);
  const consentRef = useRef<HTMLDivElement>(null);
  const consentCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    try {
      const saved = localStorage.getItem(`docget_consent_${token}`);
      if (saved === "true") {
        setHasConsent(true);
      }
    } catch {
      // ignore restricted localStorage errors
    }
  }, [token]);

  const handleConsentChange = (checked: boolean) => {
    setHasConsent(checked);
    try {
      localStorage.setItem(`docget_consent_${token}`, checked ? "true" : "false");
    } catch {}
    if (checked) {
      toast({
        title: "Consent Given",
        description: "You may now upload the required documents.",
        type: "success",
      });
    }
  };

  const promptConsent = () => {
    setConsentHighlighted(true);
    consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      consentCheckboxRef.current?.focus();
    }, 250);
    toast({
      title: "Consent Required",
      description: "Please check the consent box below before uploading documents.",
      type: "error",
    });
    setTimeout(() => {
      setConsentHighlighted(false);
    }, 2500);
  };

  const loadPortal = async (showLoading = false) => {
    if (!token) return;

    // Direct client offline check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setIsNetworkError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoading) setRefreshing(true);
    try {
      const res = await getPortalData(token);
      if (res) {
        setPortalData(res);
        setIsNetworkError(false);
        setIsOnline(true);
      } else {
        // If client lost connectivity during request
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setIsNetworkError(true);
          setIsOnline(false);
        } else {
          // Genuinely inactive/expired link on server
          setPortalData(null);
          setIsNetworkError(false);
        }
      }
    } catch (err: any) {
      console.warn("Portal load error:", err);
      const isNet =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err?.message?.includes("fetch") ||
        err?.message?.includes("network") ||
        err?.message?.includes("NetworkError") ||
        err?.message?.includes("Failed to fetch") ||
        err?.name === "TypeError";

      if (isNet) {
        setIsNetworkError(true);
      } else if (!portalData) {
        setIsNetworkError(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    loadPortal(false);
  }, [token]);

  // Online / Offline listeners for instant detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsNetworkError(false);
      loadPortal(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsNetworkError(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  // Window focus auto-sync: instantly refreshes when client returns to tab (only if online)
  useEffect(() => {
    const handleFocus = () => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        loadPortal(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [token]);

  // Periodic polling: auto-syncs every 25 seconds only if the tab is currently visible in foreground
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      // Avoid firing background network requests for hidden / inactive tabs
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (typeof navigator === "undefined" || navigator.onLine) {
        loadPortal(false);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1014] flex items-center justify-center p-4">
        <div className="text-center space-y-2.5">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Opening secure upload portal...</p>
        </div>
      </div>
    );
  }

  // 1. Connection / Network Error State (No Internet Connection)
  if (!portalData && (isNetworkError || !isOnline)) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1014] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/60">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">No Internet Connection</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Unable to reach the document upload portal. Please check your internet connection or mobile data and try again.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => loadPortal(true)}
              disabled={refreshing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Checking Connection..." : "Check Connection & Retry"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Verified Inactive / Expired Link State (Online, but link closed by firm)
  if (!portalData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1014] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/60">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Upload Link Inactive</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            This upload link has expired or was closed by your advisory firm. Please contact your advisor for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const { case: caseInfo, client, organization, requirements, progress } = portalData;
  const isAllApproved = progress.percentage === 100;
  const advisorPhone = (organization.contact_phone || client.phone || "").replace(/[^0-9]/g, "");
  const advisorEmail = organization.contact_email || "";
  const advisorName = organization.advisor_name || organization.name;
  const uploadedCount = progress.approved + progress.under_review;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0e1014] text-neutral-900 dark:text-neutral-100 pb-16 selection:bg-emerald-600 selection:text-white transition-colors duration-150">
      {/* Offline Alert Strip when data is already loaded */}
      {(!isOnline || isNetworkError) && (
        <div className="bg-amber-600 text-white text-xs font-medium px-4 py-2 text-center flex items-center justify-center gap-2 shadow-xs transition-colors">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>You are currently offline. Please check your internet connection to upload documents.</span>
        </div>
      )}

      {/* 1. Header: Firm Name, Security Badge, Client Ref */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30 shadow-2xs transition-colors">
        <div className="max-w-xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Organization Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {organization.logo_url ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-neutral-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-0.5 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
                <SafeImage
                  src={organization.logo_url}
                  alt={organization.name}
                  className="w-full h-full object-cover rounded-[10px]"
                  fallbackIcon={
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                {organization.name}
              </h1>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">Secure Portal</span>
              </p>
            </div>
          </div>

          {/* Right Header Toolbar: Tips, Theme, and Desktop Client Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <RequirementsPopover
              title="Tips for Clear Document Photos"
              buttonLabel="Tips"
              items={[
                "Maximum file size is 10 MB per document (PDF, JPG, PNG)",
                "Place document on a flat surface in good lighting without shadows",
                "Ensure all 4 corners and borders are inside the frame",
                "Make sure names, numbers, and dates are sharp and readable",
              ]}
            />
            <ThemeToggle />
            <div className="hidden sm:block text-right pl-2 border-l border-neutral-200 dark:border-neutral-700">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]">{client.name}</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">#{caseInfo.reference_number}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 sm:pt-5 space-y-4">
        {/* 2. Case Summary & Progress with Live Sync */}
        <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3.5 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                {caseInfo.service_type || "Document Collection"}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 font-semibold">
                  #{caseInfo.reference_number}
                </span>
                <button
                  type="button"
                  onClick={() => loadPortal(true)}
                  disabled={refreshing}
                  title="Check for live advisor updates"
                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-snug">{caseInfo.title}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Prepared for <span className="font-semibold text-neutral-700 dark:text-neutral-300">{client.name}</span>
            </p>
          </div>

          {/* Clean Progress Indicator with Live Stats Badges */}
          <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              <span>{progress.approved} of {progress.total} verified</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{progress.percentage}% Done</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            {/* Live status breakdown pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              {progress.approved > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-medium">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {progress.approved} Approved
                </span>
              )}
              {progress.under_review > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 font-medium">
                  <Clock className="w-3 h-3 text-blue-600" />
                  {progress.under_review} In Review
                </span>
              )}
              {progress.rejected > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 font-medium">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  {progress.rejected} Needs Re-upload
                </span>
              )}
              {progress.pending > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-700 font-medium">
                  {progress.pending} Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 100% Celebration Banner */}
        {isAllApproved && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100">All Documents Approved!</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">Your advisor has verified all submitted files.</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
                `Hi, all documents for case ${caseInfo.reference_number} are submitted and approved.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
            >
              WhatsApp
            </a>
          </div>
        )}

        {/* Client Consent Declaration */}
        <div
          ref={consentRef}
          id="consent-section"
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
            consentHighlighted
              ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md"
              : hasConsent
              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs"
              : "bg-white dark:bg-neutral-900 border-amber-300 dark:border-amber-700/70 shadow-2xs"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="pt-0.5 shrink-0">
              <label className="relative flex items-center justify-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="client-consent-checkbox"
                  ref={consentCheckboxRef}
                  checked={hasConsent}
                  onChange={(e) => handleConsentChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    hasConsent
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "border-neutral-400 dark:border-neutral-500 bg-white dark:bg-neutral-800 hover:border-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-500"
                  }`}
                >
                  {hasConsent && (
                    <svg
                      className="w-3.5 h-3.5 stroke-current stroke-[2.5] fill-none"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </label>
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label
                  htmlFor="client-consent-checkbox"
                  className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Client Authorization & Document Accuracy Declaration</span>
                </label>
                {hasConsent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3" />
                    Consent Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                    <AlertCircle className="w-3 h-3" />
                    Required to Upload
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                In accordance with data protection practices under the DPDP Act 2023, I confirm that all uploaded documents are genuine, accurate, and lawfully provided. I authorize{" "}
                <strong className="text-neutral-900 dark:text-neutral-200 font-semibold">{organization?.name || "the advisory firm"}</strong>{" "}
                to collect, securely store, and process these records solely for case{" "}
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-200">{caseInfo.reference_number}</span>.
              </p>

              {!hasConsent && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-0.5">
                  👉 Please tick this consent box to unlock file uploads.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Direct Document Checklist with Quick Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Document Checklist ({requirements.length})
            </h3>
            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200/80 dark:border-neutral-700">
              Max 10 MB / file
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/90 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                filter === "all"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              All ({requirements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                filter === "pending"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              Action Needed ({progress.pending + progress.rejected})
            </button>
            <button
              type="button"
              onClick={() => setFilter("approved")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                filter === "approved"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              Verified ({progress.approved})
            </button>
          </div>

          {requirements
            .filter((req) => {
              if (filter === "pending") return req.status === "not_uploaded" || req.status === "rejected";
              if (filter === "approved") return req.status === "approved";
              return true;
            })
            .map((req, idx) => {
              const isApproved = req.status === "approved";
              const isUnderReview = req.status === "under_review" || req.status === "uploaded";
              const isRejected = req.status === "rejected";
              const isPending = req.status === "not_uploaded" || !req.status;
              const latestDoc = req.latest_document;

              return (
                <div
                  key={req.id}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl border p-4 space-y-2.5 shadow-xs transition-all ${
                    isRejected
                      ? "border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-100 dark:ring-rose-950/40"
                      : isApproved
                      ? "border-emerald-200 dark:border-emerald-900/60"
                      : isUnderReview
                      ? "border-blue-200 dark:border-blue-900/60"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {/* Header Row: Status Icon, Title, Single Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Status Circle Icon */}
                      <div
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isApproved
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                            : isUnderReview
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                            : isRejected
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : isUnderReview ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : isRejected ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug break-words">
                            {req.name}
                          </h4>
                          {req.is_required && (
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200/60 dark:border-rose-900/40 shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                        {req.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed break-words">
                            {req.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Single Clean Status Pill */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isApproved
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : isUnderReview
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : isRejected
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                      }`}
                    >
                      {isApproved
                        ? "Approved"
                        : isUnderReview
                        ? "In Review"
                        : isRejected
                        ? "Needs Re-upload"
                        : "Pending"}
                    </span>
                  </div>

                  {/* Body State 1: Rejection Message from Advisor + Direct Replacement Upload */}
                  {isRejected && (
                    <div className="space-y-2 pt-1">
                      {latestDoc?.rejection_reason && (
                        <div className="p-3 bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-200 font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Advisor feedback:</span>
                          </div>
                          <p className="text-rose-800 dark:text-rose-300 font-medium pl-5 leading-relaxed">
                            {latestDoc.rejection_reason}
                          </p>
                        </div>
                      )}
                      <InteractiveFileUpload
                        token={token}
                        requirementId={req.id}
                        requirementName={req.name}
                        isReplacement={true}
                        hasConsent={hasConsent}
                        onRequireConsent={promptConsent}
                        onUploadComplete={() => loadPortal(true)}
                      />
                    </div>
                  )}

                  {/* Body State 2: Uploaded & In Review */}
                  {isUnderReview && latestDoc && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/50 flex items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-blue-950 dark:text-blue-200 truncate text-xs">
                                {latestDoc.file_name}
                              </p>
                              {latestDoc.version && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded">
                                  v{latestDoc.version}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400">
                              {formatBytes(latestDoc.file_size)} • Under advisor review
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 shrink-0">
                            Submitted
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplacingReqId(replacingReqId === req.id ? null : req.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Upload an updated replacement file"
                          >
                            <RefreshCw className={`w-3 h-3 ${replacingReqId === req.id ? "rotate-180" : ""} transition-transform`} />
                            <span>{replacingReqId === req.id ? "Cancel" : "Replace"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Replacement Upload Box */}
                      {replacingReqId === req.id && (
                        <div className="p-3 bg-neutral-50/90 dark:bg-neutral-900/90 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <FileUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Upload Replacement Document</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplacingReqId(null)}
                              className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <InteractiveFileUpload
                            token={token}
                            requirementId={req.id}
                            requirementName={req.name}
                            isReplacement={true}
                            hasConsent={hasConsent}
                            onRequireConsent={promptConsent}
                            onCancel={() => setReplacingReqId(null)}
                            onUploadComplete={() => {
                              setReplacingReqId(null);
                              loadPortal(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body State 3: Approved & Verified */}
                  {isApproved && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-emerald-950 dark:text-emerald-200 truncate text-xs">
                                {latestDoc?.file_name || "Verified Document"}
                              </p>
                              {latestDoc?.version && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded">
                                  v{latestDoc.version}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                              {latestDoc?.file_size ? `${formatBytes(latestDoc.file_size)} • ` : ""}Verified by your advisor
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                            Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplacingReqId(replacingReqId === req.id ? null : req.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Upload an updated replacement file"
                          >
                            <RefreshCw className={`w-3 h-3 ${replacingReqId === req.id ? "rotate-180" : ""} transition-transform`} />
                            <span>{replacingReqId === req.id ? "Cancel" : "Replace"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Replacement Upload Box */}
                      {replacingReqId === req.id && (
                        <div className="p-3 bg-neutral-50/90 dark:bg-neutral-900/90 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Upload Replacement Document</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplacingReqId(null)}
                              className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <InteractiveFileUpload
                            token={token}
                            requirementId={req.id}
                            requirementName={req.name}
                            isReplacement={true}
                            hasConsent={hasConsent}
                            onRequireConsent={promptConsent}
                            onCancel={() => setReplacingReqId(null)}
                            onUploadComplete={() => {
                              setReplacingReqId(null);
                              loadPortal(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body State 4: Direct Upload Trigger for pending items */}
                  {isPending && (
                    <div className="pt-0.5">
                      <InteractiveFileUpload
                        token={token}
                        requirementId={req.id}
                        requirementName={req.name}
                        isReplacement={false}
                        hasConsent={hasConsent}
                        onRequireConsent={promptConsent}
                        onUploadComplete={() => loadPortal(true)}
                      />
                    </div>
                  )}


                </div>
              );
            })}
        </div>

        {/* 4. Advisor Contact & Enquiry Support (WhatsApp & Email) */}
        <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <MessageSquareShare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Have questions or need clarification?
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                If you are unsure about which document or format to provide, contact your advisor at <strong className="text-neutral-800 dark:text-neutral-200">{organization.name}</strong> directly:
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            {advisorPhone ? (
              <a
                href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
                  `Hello ${advisorName}, I have a question regarding the required documents for case #${caseInfo.reference_number} (${caseInfo.title}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl transition shadow-xs text-xs"
              >
                <MessageSquareShare className="w-3.5 h-3.5" />
                <span>Enquire via WhatsApp</span>
              </a>
            ) : null}

            {advisorEmail ? (
              <a
                href={`mailto:${advisorEmail}?subject=${encodeURIComponent(
                  `Document Query: ${caseInfo.title} (Ref: ${caseInfo.reference_number})`
                )}&body=${encodeURIComponent(
                  `Hello ${advisorName},\n\nI have a question regarding the documents requested for case #${caseInfo.reference_number} (${caseInfo.title})...\n\nClient Name: ${client.name}\n`
                )}`}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-[0.98] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-semibold rounded-xl transition text-xs"
              >
                <Mail className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Enquire via Email</span>
              </a>
            ) : null}

            {!advisorPhone && !advisorEmail && (
              <p className="text-[11px] text-neutral-400 italic">
                Contact your advisory firm ({organization.name}) directly for any questions.
              </p>
            )}
          </div>
        </div>

        {/* 5. Minimal Footer */}
        <div className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 space-y-1.5 pt-2">
          {organization.logo_url && (
            <div className="flex items-center justify-center gap-1.5 pb-1">
              <SafeImage
                src={organization.logo_url}
                alt={organization.name}
                className="w-4 h-4 rounded-sm object-cover"
              />
              <span className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">{organization.name}</span>
            </div>
          )}
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted with TLS 1.3 • Confidential Document Collection</span>
          </p>
        </div>
      </main>
    </div>
  );
}

function InteractiveFileUpload({
  token,
  requirementId,
  requirementName,
  isReplacement = false,
  hasConsent = false,
  onRequireConsent,
  onCancel,
  onUploadComplete,
}: {
  token: string;
  requirementId: string;
  requirementName: string;
  isReplacement?: boolean;
  hasConsent?: boolean;
  onRequireConsent?: () => void;
  onCancel?: () => void;
  onUploadComplete: () => void;
}) {
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
    if (!hasConsent) {
      onRequireConsent?.();
      return;
    }
    if (!selectedFile) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("No internet connection. Please check your network and try again.");
      return;
    }

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
      const isNet =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err?.message?.includes("fetch") ||
        err?.message?.includes("network") ||
        err?.name === "TypeError";

      setError(
        isNet
          ? "No internet connection. Please check your network and try again."
          : (err.message || "Failed to upload document. Please retry.")
      );
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
          onClick={() => {
            if (!hasConsent) {
              onRequireConsent?.();
              return;
            }
            fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!hasConsent) {
              onRequireConsent?.();
              return;
            }
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          className={`w-full py-3 px-4 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            !hasConsent
              ? "border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
              : isDragging
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
              : isReplacement
              ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {!hasConsent ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Accept consent above to upload {isReplacement ? "replacement" : "file"}</span>
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
                <span>{isReplacement ? "Tap to upload corrected file or photo" : "Tap to choose file or photo"}</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
            {!hasConsent ? "Tick the consent checkbox above to unlock" : "PDF, JPG, PNG up to 10 MB"}
          </span>
        </button>
      ) : (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/90 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Upload preview of ${selectedFile.name}`}
                  className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-neutral-700 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={handleCancelSelection}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Remove selected file before submitting"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
            You can remove or change this file before submitting. Once submitted, your file is safely kept.
          </p>

          {uploading ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  Uploading...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove file</span>
              </button>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-2.5 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <span>{isReplacement ? "Submit Replacement" : "Submit Document"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
