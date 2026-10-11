export const dynamic = "force-static";

import Link from "next/link";
import { ArrowLeft, Shield, FileText, AlertCircle, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata = {
  title: "Terms of Service | DocuCollect",
  description:
    "Terms and conditions, intermediary liability protection, and acceptable use policy for the DocuCollect platform.",
};

export default function TermsPage() {
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
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> SaaS Terms & Safe Harbor Agreement
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Terms of Service & User Agreement
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Last Updated: October 2026 • Legally binding upon account registration or portal usage
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">1. Nature of the Service & Acceptance</h2>
              <p>
                By registering, accessing, or utilizing <strong>DocuCollect</strong> ("the Platform", "we", "us", or "the Service"), you ("Subscriber", "User", "Practice", or "Advisor") agree to be bound unconditionally by these Terms of Service.
              </p>
              <p>
                DocuCollect is a proprietary software-as-a-service (SaaS) utility providing encrypted document intake pipelines, checklist workflows, and client upload portals for Chartered Accountants, advocates, tax consultants, financial planners, and advisory firms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">2. Intermediary Status & Safe Harbor (IT Act Section 79)</h2>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs space-y-2">
                <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Statutory Intermediary Safe Harbor Notice
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  DocuCollect operates strictly as an <strong>"Intermediary"</strong> under Section 2(1)(w) and Section 79 of the Information Technology Act, 2000 (India). DocuCollect merely provides an automated technical platform to transmit, store temporarily, and receive encrypted electronic records. DocuCollect does not initiate transmissions, select receivers, or select or modify information contained in any uploaded file.
                </p>
              </div>
              <p>
                The Subscriber and their clients maintain complete ownership and legal responsibility for all uploaded files, identification papers, and tax documents.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Professional Advice Disclaimer & Statutory Deadlines</h2>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs space-y-2 text-amber-900 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  No Professional Practice, Tax, or Legal Liability
                </p>
                <p className="leading-relaxed">
                  DocuCollect is NOT a Chartered Accountancy firm, legal counsel, or registered tax agent. We do not inspect document authenticity, compute taxes, or file returns with statutory bodies (including Income Tax Department, GSTN, MCA, ROC, or EPFO). DocuCollect disclaims all liability for any late filing fees, tax penalties, interest, audit disallowances, or damages resulting from missed government deadlines or invalid client document submissions.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. Zero-Knowledge Encryption & Auto-Purge Policy</h2>
              <p>
                The Subscriber expressly acknowledges and agrees to the technical boundaries of the Service:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Zero-Knowledge AES-256-GCM Storage:</strong> All files uploaded by clients are encrypted at the application layer with AES-256-GCM before persistent cloud storage. DocuCollect has no visibility into file contents.
                </li>
                <li>
                  <strong>Transit Conduit, Not Cold-Storage Archive:</strong> DocuCollect is engineered as a secure transit conduit. Uploaded documents are automatically and irreversibly purged according to your plan's retention policy (7 days on Free Trial, 15 days on Starter, 30 days on Pro). Rejected documents are also purged automatically.
                </li>
                <li>
                  <strong>Subscriber Download Obligation:</strong> The Subscriber bears the sole duty to inspect, approve, and download verified client files to their permanent local office drives. DocuCollect shall bear zero liability for files permanently shredded pursuant to scheduled purge cycles.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">5. Client Consent & Subscriber Warranties</h2>
              <p>The Subscriber represents, warrants, and covenants that:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  It has obtained valid, explicit, and legally enforceable consent from each client before generating upload links and requesting sensitive financial or personal records.
                </li>
                <li>
                  It shall comply with all relevant provisions of the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Rules, 2011.
                </li>
                <li>
                  It shall not use DocuCollect to collect, store, or distribute malicious files, fraudulent identification documents, forged tax credentials, or illicit materials.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">6. Subscription Plans, Upgrades & Manual Voucher Activation</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>30-Day Free Trial:</strong> All new users receive 30 days of free evaluation with up to 10 active clients and 500 MB encrypted storage.
                </li>
                <li>
                  <strong>Manual Renewal via UPI & Bank NEFT/IMPS:</strong> To prevent unexpected recurring debits, subscriptions are paid manually via UPI QR or direct bank NEFT/IMPS transfer. Once confirmed, administrators dispatch a single-use license key / voucher to activate the account.
                </li>
                <li>
                  <strong>Single-Use Key Enforcement:</strong> License keys are unique and permanently bind to the redeeming organization. Keys cannot be shared, transferred, or re-used across different firms.
                </li>
                <li>
                  <strong>Account Expiration:</strong> If a subscription expires without renewal, client upload links and new case creations are paused. Existing client records remain protected until renewed or deleted by the user.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">7. Limitation of Liability & Indemnification</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DOCUCOLLECT, ITS FOUNDERS, OFFICERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA CORRUPTION, OR BUSINESS DISRUPTION).
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE ACTUAL AMOUNT PAID BY YOU TO DOCUCOLLECT DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
              </p>
              <p>
                The Subscriber agrees to indemnify, defend, and hold harmless DocuCollect and its operators from and against any third-party claims, client claims, regulatory inquiries, or damages arising out of the Subscriber's breach of these Terms, client privacy violations, or tax filing disputes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">8. Governing Law & Dispute Resolution</h2>
              <p>
                These Terms shall be governed by and construed under the laws of the Republic of India. Any dispute, claim, or controversy arising under or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in India, following prior good-faith mutual conciliation for a minimum period of thirty (30) days.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">9. Legal Inquiries & Notices</h2>
              <p>For legal notices or compliance questions, please contact:</p>
              <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">DocuCollect Legal & Compliance</p>
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">legal@docucollect.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docucollect.in</span></p>
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
            <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
