import Link from "next/link";
import { ArrowLeft, Shield, FileText, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Terms of Service | DocuCollect",
  description: "Terms and conditions governing the use of DocuCollect SaaS document collection portal.",
};

export default function TermsPage() {
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
              <Shield className="w-3.5 h-3.5" /> Legal Agreement
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Terms of Service
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              Last Updated: October 2026 • Effective immediately upon account registration
            </p>
          </div>

          <div className="prose prose-neutral max-w-none text-sm text-neutral-700 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">1. Acceptance of Terms</h2>
              <p>
                By creating an account or accessing <strong>DocuCollect</strong> ("the Service"), you agree to be bound by these Terms of Service. This Service is operated as an independent software platform designed for Chartered Accountants (CAs), advocates, legal consultants, tax professionals, and agencies to collect client documents securely.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">2. 30-Day Free Trial & Subscription Model</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>30-Day Free Trial:</strong> Every new verified user receives an initial 30-day Free Trial with an allowance of up to 10 active clients and 7-day document retention.
                </li>
                <li>
                  <strong>Trial Expiration & Account Lockout:</strong> Upon expiration of the 30-day trial period, access to create new cases, add clients, and generate active upload links is temporarily paused until your subscription plan is renewed.
                </li>
                <li>
                  <strong>Manual Renewal via UPI / Bank Transfer:</strong> Subscription plans (Starter or Pro) are activated manually. Subscribers transfer the subscription fee directly via UPI QR or Bank NEFT/IMPS to the platform administrator. Once payment is confirmed, the administrator immediately activates the subscription.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">3. Document Storage & Automated Deletion Policy</h2>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  <strong>Notice regarding document retention:</strong> In order to maintain lean infrastructure and protect client data privacy, uploaded client documents are subject to rolling automatic deletion (7 days on Free Trial, 30 days on Paid Plans). Professionals are expected to download verified documents to their local archives promptly.
                </p>
              </div>
              <p>
                The platform is designed as a transit and verification conduit, not a permanent cold-storage archive. We are not liable for files automatically purged in accordance with your plan's retention schedule.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">4. User Responsibilities & Acceptable Use</h2>
              <p>You agree to use DocuCollect solely for legitimate professional purposes. You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Collect or transmit unlawful, malicious, or infringing content.</li>
                <li>Share unauthorized or forged identification documents.</li>
                <li>Attempt to bypass tenant isolation or access files belonging to other organizations.</li>
                <li>Abuse upload links to transmit viruses, malware, or spam.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">5. Limitation of Liability</h2>
              <p>
                The Service is provided on an "as-is" and "as-available" basis. While we employ strict tenant isolation (Row-Level Security) and encryption protocols, we cannot guarantee uninterrupted service availability. In no event will the operator be liable for any indirect, incidental, or consequential damages resulting from lost files, business interruptions, or client non-compliance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">6. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in India.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">7. Contact & Support</h2>
              <p>
                For plan activation, billing inquiries, or technical support, please contact the administrator directly:
              </p>
              <p className="font-medium text-neutral-900">
                Email: support@docucollect.in <br />
                WhatsApp: Available in your dashboard billing tab
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
