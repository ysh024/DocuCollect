import Link from "next/link";
import { ArrowLeft, Shield, Lock, EyeOff, Server, Trash2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | DocuCollect",
  description: "Privacy policy and client data protection standards at DocuCollect.",
};

export default function PrivacyPage() {
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
              <Lock className="w-3.5 h-3.5" /> Data Protection Guarantee
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Privacy Policy & Client Data Protection
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              Last Updated: October 2026 • Built for professionals handling sensitive client records
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
              <EyeOff className="w-5 h-5 text-neutral-700" />
              <h3 className="font-bold text-xs text-neutral-900">Zero Data Selling</h3>
              <p className="text-xs text-neutral-500">We never monetize, inspect, or sell client information to third parties.</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
              <Server className="w-5 h-5 text-neutral-700" />
              <h3 className="font-bold text-xs text-neutral-900">Tenant Isolation</h3>
              <p className="text-xs text-neutral-500">Strict Row-Level Security ensures only your firm can access your files.</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1.5">
              <Trash2 className="w-5 h-5 text-neutral-700" />
              <h3 className="font-bold text-xs text-neutral-900">Auto-Purge Security</h3>
              <p className="text-xs text-neutral-500">Files automatically purge after 7-30 days to prevent data hoarding.</p>
            </div>
          </div>

          <div className="prose prose-neutral max-w-none text-sm text-neutral-700 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">1. Information We Collect</h2>
              <p>When you use DocuCollect as a professional (CA, lawyer, consultant):</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Account Information:</strong> Name, professional email address, encrypted password hash (bcrypt 10-rounds), firm name, and contact phone number.
                </li>
                <li>
                  <strong>Client Metadata:</strong> Client names, phone numbers, and case titles provided by you to organize requests.
                </li>
                <li>
                  <strong>Uploaded Files:</strong> Documents uploaded by your clients via secure one-time upload tokens (e.g., PAN cards, GST returns, financial statements, contracts).
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">2. How Uploaded Files Are Handled</h2>
              <p>
                Client documents uploaded through tokenized links are transmitted securely over TLS/HTTPS encryption. Each file is associated with a specific checklist item and isolated to your firm's organization ID.
              </p>
              <p>
                <strong>We do not read, analyze, or mine client documents.</strong> The files are stored solely so you can review, approve, or download them to your local office storage.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">3. Automatic Purge & Retention Schedule</h2>
              <p>
                To respect data minimization principles and keep infrastructure secure:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Free Trial:</strong> Files are scheduled for automated purge 7 days after upload.</li>
                <li><strong>Starter & Pro Plans:</strong> Files are scheduled for automated purge 30 days after upload.</li>
              </ul>
              <p>
                Once deleted, documents cannot be recovered from our servers. Professionals are strongly advised to download approved client files promptly.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">4. Third-Party Services</h2>
              <p>
                DocuCollect utilizes reputable cloud infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Database & Auth Infrastructure:</strong> Neon PostgreSQL with encrypted connections.</li>
                <li><strong>Storage Infrastructure:</strong> Secure cloud object storage.</li>
              </ul>
              <p>
                No third-party advertising or analytics trackers are installed on client upload pages.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">5. Your Data Rights</h2>
              <p>
                You retain complete ownership of all data and documents you upload. You may delete any client, case, or document from your dashboard at any time. When you delete a client or case, all associated document requirements, uploaded files, and access links are immediately and permanently removed from our active database.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900">6. Contact for Privacy Inquiries</h2>
              <p>
                If you have questions regarding data security, privacy practices, or wish to request an account deletion, contact:
              </p>
              <p className="font-medium text-neutral-900">
                Email: support@docucollect.in
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
