export const dynamic = "force-static";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, EyeOff, Server, Trash2, Cpu, CheckCircle2, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata = {
  title: "Privacy Policy | DocuCollect",
  description:
    "Privacy Policy, DPDP Act 2023 compliance, and Zero-Knowledge client data protection standards at DocuCollect.",
};

export default function PrivacyPage() {
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mb-3">
              <Lock className="w-3.5 h-3.5" /> DPDP Act 2023 & Zero-Knowledge Architecture
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Privacy Policy & Client Data Protection
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Last Updated: October 2026 • Governing Chartered Accountants, advocates, tax advisors, and their clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-1.5">
              <EyeOff className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs text-neutral-900 dark:text-white">Zero Data Selling</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                We never monetize, inspect, parse, or sell client information to any third party or AI models.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-1.5">
              <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs text-neutral-900 dark:text-white">Zero-Knowledge Storage</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Files are encrypted with AES-256-GCM before persistent storage so underlying providers cannot view files.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-1.5">
              <Trash2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs text-neutral-900 dark:text-white">Scheduled Auto-Purge</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Uploaded and rejected files auto-delete in 7 to 30 days to strictly enforce data minimization.
              </p>
            </div>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">1. Legal Roles: Data Processor vs. Data Fiduciary</h2>
              <p>
                To ensure full compliance under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and international data privacy benchmarks:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>The Advisory Firm as Data Fiduciary:</strong> The registered subscriber (Chartered Accountant, Tax Practitioner, Lawyer, or Advisory Firm) acts as the <em>Data Fiduciary</em> (or Data Controller). The firm decides what documents to request, collects necessary client consents, and determines how client data is utilized.
                </li>
                <li>
                  <strong>DocuCollect as Data Processor:</strong> DocuCollect operates solely as a <em>Data Processor</em> (or Intermediary). We process uploaded client documents strictly in accordance with the documented instructions and workflow triggers executed by the Data Fiduciary.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">2. Information We Collect & Process</h2>
              <p>We restrict data collection to the minimum technical information required to operate our service:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Firm Account Details:</strong> Name, professional email address, encrypted authentication hashes (bcrypt with 10-rounds), firm business name, contact phone number, and plan subscription identifiers.
                </li>
                <li>
                  <strong>Client Directory Metadata:</strong> Client names, phone numbers, and case titles supplied directly by the advisory firm to categorize requests.
                </li>
                <li>
                  <strong>Uploaded Client Documents:</strong> Files (such as PAN cards, Aadhaar disclosures, ITR acknowledgments, balance sheets, bank statements, and legal agreements) uploaded by clients via tokenized upload links.
                </li>
                <li>
                  <strong>Technical Audit Telemetry:</strong> Request timestamps, IP addresses for security audit trails, browser user-agent signatures, and authentication events stored to protect the integrity of the platform.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Zero-Knowledge Cryptographic Storage Guarantee</h2>
              <p>
                Protecting confidential financial and legal files is our foundational priority. Unlike standard cloud drives that store files in readable form:
              </p>
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2 text-xs">
                <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Independent Application-Layer AES-256-GCM Envelope Encryption
                </p>
                <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                  Before any document is written to cloud object storage (Neon / AWS S3 infrastructure), it is encrypted using 256-bit Advanced Encryption Standard in Galois/Counter Mode (AES-256-GCM) with an unpredictable 12-byte initialization vector and a 16-byte cryptographic authentication tag. The underlying cloud storage provider sees only random encrypted ciphertext and has no ability to read, index, or inspect your documents.
                </p>
              </div>
              <p>
                Decryption occurs strictly in-memory when an authorized authenticated advisor downloads or previews the document. We do not maintain unencrypted cache copies on disk.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. Automated Data Purge & Data Minimization Schedule</h2>
              <p>
                DocuCollect is engineered as a secure transit, verification, and collection pipeline — not an indefinitely accumulated cold-storage repository. Holding client data perpetually introduces severe compliance exposure. Therefore:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Free Trial:</strong> Files are scheduled for automated irreversible purge 7 days after upload.</li>
                <li><strong>Starter Plan:</strong> Files are scheduled for automated irreversible purge 15 days after upload.</li>
                <li><strong>Professional Plan:</strong> Files are scheduled for automated irreversible purge 30 days after upload.</li>
                <li><strong>Rejected Documents:</strong> Automatically deleted along with the plan's auto-purge cycle to prevent clutter.</li>
              </ul>
              <p>
                Once purged, files are permanently shredded from disk and cloud storage and cannot be restored. Subscribers must download verified client documents to their permanent local archives.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">5. Sub-Processors & Infrastructure Partners</h2>
              <p>DocuCollect relies on enterprise-grade infrastructure providers that comply with strict data protection frameworks:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Database Infrastructure:</strong> Neon PostgreSQL (SOC 2 Type II compliant, TLS 1.3 transit, Row-Level Security tenant isolation).
                </li>
                <li>
                  <strong>Object Storage:</strong> AWS S3 infrastructure used exclusively to store blind AES-256-GCM encrypted byte envelopes.
                </li>
                <li>
                  <strong>Email Delivery:</strong> Resend / Google Workspace SMTP for multi-factor authentication (MFA) codes and system notifications.
                </li>
              </ul>
              <p>
                We do not integrate any third-party tracking pixels, marketing trackers, or behavior trackers on client upload pages.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">6. Data Subject Rights & Data Portability</h2>
              <p>In accordance with applicable privacy laws:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Right to Erasure:</strong> Subscribers can delete cases, documents, or clients from the dashboard. Upon deletion, files and access tokens are permanently expunged from the database.
                </li>
                <li>
                  <strong>Right to Portability:</strong> Professional plan subscribers can export client master data directly into spreadsheet format (Excel) at any time.
                </li>
                <li>
                  <strong>Client Rights:</strong> If a client whose documents were uploaded requests deletion, their advisor (the Data Fiduciary) can execute instant deletion from the DocuCollect dashboard.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">7. Grievance Redressal & Data Protection Officer</h2>
              <p>
                Pursuant to the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023, you may contact our designated Grievance & Compliance Officer:
              </p>
              <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">Grievance & Privacy Officer</p>
                <p className="text-neutral-600 dark:text-neutral-400">DocuCollect Data Protection Office</p>
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">privacy@docucollect.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docucollect.in</span></p>
                <p className="text-neutral-600 dark:text-neutral-400">Response SLA: Within 48 business hours</p>
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
            <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
