export const dynamic = "force-static";

import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Transparent Billing | DocuCollect",
  description:
    "30-day risk-free trial, zero hidden auto-debits, manual UPI & Bank transfers, and 48-hour grace period refund terms for DocuCollect subscribers.",
  keywords: [
    "DocuCollect refund policy",
    "subscription cancellation terms",
    "UPI transfer refund policy",
    "CA software billing policy",
  ],
  alternates: {
    canonical: "https://docucollect.app/refund",
  },
  openGraph: {
    title: "Refund & Cancellation Policy — DocuCollect",
    description:
      "Transparent billing with no automatic card debits. Manual renewals and 48-hour grace period refunds.",
    url: "https://docucollect.app/refund",
    type: "website",
  },
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] text-neutral-900 dark:text-neutral-100 selection:bg-emerald-600 selection:text-white transition-colors duration-150">
      {/* Top Header */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0e12]/80 backdrop-blur sticky top-0 z-30 transition-colors">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              D
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">DocuCollect</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 transition-colors">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 mb-3">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Transparent Billing Policy
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Refund & Cancellation Policy
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Last Updated: October 2026 • Simple, honest billing designed for professionals
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">1. 30-Day Risk-Free Trial</h2>
              <p>
                Every new user is entitled to a full-featured <strong>30-day Free Trial</strong> upon account registration. During this evaluation:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You have complete access to create cases, onboard up to 10 clients, and receive encrypted uploads.</li>
                <li>No credit card, UPI payment, or financial advance is required to start.</li>
                <li>You can verify compatibility with your actual practice workflow before paying any subscription fee.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">2. Zero Auto-Debits or Hidden Mandates</h2>
              <p>
                Because subscription plans are renewed manually via <strong>direct UPI QR transfer or Bank NEFT/IMPS</strong>, there are no hidden recurring card debits, e-mandates, or unexpected bank deductions. You retain absolute control over your money.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Refund Terms for Manual Upgrades</h2>
              <p>
                Because all prospective customers have 30 full days of free evaluation prior to making any payment, subscription fees are generally non-refundable once an activation license key / voucher is redeemed.
              </p>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 48-Hour Grace Period for Mistaken Transfers
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  If you transfer a payment mistakenly or make a duplicate transfer and submit a refund request within <strong>48 hours of payment</strong> (prior to redeeming the license voucher or creating cases on the upgraded tier), we will issue a 100% refund to your originating UPI or bank account within 3 business days.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. Cancellation & Expiration Policy</h2>
              <p>
                To cancel or discontinue your subscription, simply do not submit a renewal payment at the end of your billing cycle. Your account will automatically transition to an expired status without any cancellation penalty, termination fee, or subsequent invoices.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">5. How to Request a Refund</h2>
              <p>
                To request a refund within the 48-hour grace period, please send a message with your transaction ID and transfer screenshot to:
              </p>
              <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">Billing & Accounts Support</p>
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">billing@docucollect.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docucollect.in</span></p>
                <p className="text-neutral-600 dark:text-neutral-400">WhatsApp: Message our administrator directly from your dashboard billing tab</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-8 bg-white dark:bg-[#0c0e12] transition-colors duration-150">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-xs">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocuCollect</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
