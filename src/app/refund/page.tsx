import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Refund & Cancellation Policy | DocuCollect",
  description: "Subscription renewal, cancellation, and refund terms for DocuCollect.",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              D
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900">DocuCollect</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 sm:p-12 shadow-sm space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 mb-3">
              <RefreshCw className="w-3.5 h-3.5" /> Billing Transparency
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Refund & Cancellation Policy
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              Last Updated: October 2026 • Simple, honest billing for professionals
            </p>
          </div>

          <div className="prose prose-neutral max-w-none text-sm text-neutral-700 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">1. 30-Day Risk-Free Trial</h2>
              <p>
                Every user is entitled to a comprehensive <strong>30-day Free Trial</strong> upon account registration. During this trial period:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You have full access to create cases, onboard up to 10 clients, and receive documents.</li>
                <li>No credit card, UPI payment, or financial commitment is required to start.</li>
                <li>You can evaluate the platform thoroughly with your actual workflow before paying anything.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">2. No Auto-Debits or Hidden Recurring Fees</h2>
              <p>
                Because subscription plans are paid manually via <strong>direct UPI QR transfer or Bank NEFT/IMPS</strong>, there are no hidden auto-debit mandates, recurring card charges, or unexpected deductions. You are in 100% control of when and how you pay.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">3. Refund Terms for Manual Upgrades</h2>
              <p>
                Because all prospective customers have 30 full days of free access to verify compatibility prior to payment, subscription fees are generally non-refundable once activated by the administrator.
              </p>
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> 48-Hour Grace Period Exception
                </h4>
                <p className="text-xs text-neutral-600">
                  If you transfer a payment mistakenly or upgrade your plan and request a refund within <strong>48 hours of payment</strong> (prior to creating new cases on the upgraded tier), we will issue a 100% refund to your originating UPI account or bank account within 3 business days.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">4. Cancellation Policy</h2>
              <p>
                To cancel your subscription, simply do not submit a renewal payment at the end of your billing cycle (30 days or 365 days). Your account will automatically transition to an expired status without any penalty, termination fee, or subsequent charges.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">5. How to Request a Refund</h2>
              <p>
                To request a refund within the 48-hour grace period, please send a message with your payment screenshot and transaction ID to:
              </p>
              <p className="font-medium text-neutral-900">
                Email: support@docucollect.in <br />
                WhatsApp: Message the administrator directly from your dashboard
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
