"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Lock,
  EyeOff,
  Server,
  Trash2,
  Cpu,
  CheckCircle2,
  Layers,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Key,
  FileCheck,
  Database,
  Mail,
  ChevronRight,
  Fingerprint,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui";

function PrivacyContent() {

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
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">DocGet</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 transition-colors">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mb-3">
              <Lock className="w-3.5 h-3.5" /> DPDP Act 2023 & AES-256 Storage Security
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
              <h3 className="font-bold text-xs text-neutral-900 dark:text-white">Application-Layer Encryption</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Files are encrypted with AES-256-GCM before storage so cloud providers cannot view raw documents.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-1.5">
              <Trash2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs text-neutral-900 dark:text-white">Scheduled Auto-Purge</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Uploaded and rejected files auto-delete in 14 to 60 days (max 2 months) to strictly enforce data minimization.
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
                  <strong>DocGet as Data Processor:</strong> DocGet operates solely as a <em>Data Processor</em> (or Intermediary). We process uploaded client documents strictly in accordance with the documented instructions and workflow triggers executed by the Data Fiduciary.
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
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Application-Layer AES-256-GCM Storage Encryption</h2>
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
                DocGet is engineered as a secure transit, verification, and collection pipeline — not an indefinitely accumulated cold-storage repository. Holding client data perpetually introduces severe compliance exposure. Therefore:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Free Trial:</strong> Files are scheduled for automated irreversible purge 14 days after upload.</li>
                <li><strong>Starter Plan:</strong> Files are scheduled for automated irreversible purge 30 days after upload.</li>
                <li><strong>Professional Plan:</strong> Files are scheduled for automated irreversible purge 45 days after upload.</li>
                <li><strong>Firm Plan:</strong> Files are scheduled for automated irreversible purge 60 days after upload (Max 2 Months retention policy).</li>
                <li><strong>Rejected Documents:</strong> Automatically deleted along with the plan's auto-purge cycle to prevent clutter.</li>
              </ul>
              <p>
                Once purged, files are permanently shredded from disk and cloud storage and cannot be restored. Subscribers must download verified client documents to their permanent local archives.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">5. Sub-Processors & Infrastructure Partners</h2>
              <p>DocGet relies on enterprise-grade infrastructure providers that comply with strict data protection frameworks:</p>
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
                  <strong>Client Rights:</strong> If a client whose documents were uploaded requests deletion, their advisor (the Data Fiduciary) can execute instant deletion from the DocGet dashboard.
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
                <p className="text-neutral-600 dark:text-neutral-400">DocGet Data Protection Office</p>
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">privacy@docget.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docget.in</span></p>
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
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocGet</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocGet. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );

}

function TermsContent() {

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
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">DocGet</span>
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
                By registering, accessing, or utilizing <strong>DocGet</strong> ("the Platform", "we", "us", or "the Service"), you ("Subscriber", "User", "Practice", or "Advisor") agree to be bound unconditionally by these Terms of Service.
              </p>
              <p>
                DocGet is a proprietary software-as-a-service (SaaS) utility providing encrypted document intake pipelines, checklist workflows, and client upload portals for Chartered Accountants, advocates, tax consultants, financial planners, and advisory firms.
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
                  DocGet operates strictly as an <strong>"Intermediary"</strong> under Section 2(1)(w) and Section 79 of the Information Technology Act, 2000 (India). DocGet merely provides an automated technical platform to transmit, store temporarily, and receive encrypted electronic records. DocGet does not initiate transmissions, select receivers, or select or modify information contained in any uploaded file.
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
                  DocGet is NOT a Chartered Accountancy firm, legal counsel, or registered tax agent. We do not inspect document authenticity, compute taxes, or file returns with statutory bodies (including Income Tax Department, GSTN, MCA, ROC, or EPFO). DocGet disclaims all liability for any late filing fees, tax penalties, interest, audit disallowances, or damages resulting from missed government deadlines or invalid client document submissions.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. AES-256-GCM Storage Encryption & Auto-Purge Policy</h2>
              <p>
                The Subscriber expressly acknowledges and agrees to the technical boundaries of the Service:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Application-Layer AES-256-GCM Encryption:</strong> All files uploaded by clients are encrypted at the application layer with AES-256-GCM before persistent cloud storage. Cloud providers have no plaintext visibility into file contents.
                </li>
                <li>
                  <strong>Transit Conduit, Not Cold-Storage Archive:</strong> DocGet is engineered as a secure transit conduit. Uploaded documents are automatically and irreversibly purged according to your plan's retention policy (14 days on Free Trial, 30 days on Starter, 45 days on Pro, and 60 days on Firm / max 2 months). Rejected documents are also purged automatically.
                </li>
                <li>
                  <strong>Subscriber Download Obligation:</strong> The Subscriber bears the sole duty to inspect, approve, and download verified client files to their permanent local office drives. DocGet shall bear zero liability for files permanently shredded pursuant to scheduled purge cycles.
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
                  It shall not use DocGet to collect, store, or distribute malicious files, fraudulent identification documents, forged tax credentials, or illicit materials.
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
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DOCGET, ITS FOUNDERS, OFFICERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA CORRUPTION, OR BUSINESS DISRUPTION).
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE ACTUAL AMOUNT PAID BY YOU TO DOCGET DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
              </p>
              <p>
                The Subscriber agrees to indemnify, defend, and hold harmless DocGet and its operators from and against any third-party claims, client claims, regulatory inquiries, or damages arising out of the Subscriber's breach of these Terms, client privacy violations, or tax filing disputes.
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
                <p className="font-bold text-neutral-900 dark:text-white">DocGet Legal & Compliance</p>
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">legal@docget.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docget.in</span></p>
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
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocGet</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocGet. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );

}

function RefundContent() {

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
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">DocGet</span>
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
                <p className="text-neutral-600 dark:text-neutral-400">Email: <span className="font-mono text-emerald-600 dark:text-emerald-400">billing@docget.app</span> / <span className="font-mono text-emerald-600 dark:text-emerald-400">support@docget.in</span></p>
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
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocGet</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocGet. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );

}

function SecurityContent() {

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] text-neutral-900 dark:text-neutral-100 selection:bg-emerald-600 selection:text-white transition-colors duration-150">
      {/* Top Header */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0e12]/80 backdrop-blur sticky top-0 z-30 transition-colors">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
              DocGet
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Security & Trust Architecture
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Security, Privacy & Compliance Built for Confidential Records
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed">
            Chartered Accountants, advocates, and tax advisors handle India's most sensitive financial and legal records. We engineered DocGet with <strong>application-layer AES-256-GCM storage encryption</strong>, strict tenant isolation, and automated data purging so your firm and your clients stay safe from breaches and regulatory liabilities.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">AES-256-GCM Encryption</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Files are encrypted with AES-256-GCM before writing to object storage. Underlying cloud infrastructure cannot inspect or view your documents.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Row-Level Tenant Isolation</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Every query enforces strict organization tenancy. Cross-firm data leakage is architecturally prohibited at the database engine level.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Automated Data Purge</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Uploaded and rejected documents are permanently destroyed according to your plan's retention policy (14, 30, 45, or 60 days max) to prevent data hoarding.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Audit Trail Logging</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Every document upload, review, approval, rejection, and download is timestamped and recorded in an immutable practice audit trail.
            </p>
          </div>
        </div>

        {/* Deep Dive 1: AES-256-GCM Storage Architecture */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Cryptographic Storage Pipeline: AES-256-GCM Envelope Encryption
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                How DocGet shields sensitive tax and identity files from third-party inspection
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Most SaaS platforms store customer files in plaintext or rely solely on cloud provider server-side encryption (where the cloud provider holds the keys and can inspect the files). DocGet implements an independent <strong>Application-Layer Envelope Encryption</strong> standard:
          </p>

          <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <span>CIPHER ENVELOPE FORMAT (`DOCUENC1`)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">AES-256-GCM + 128-bit MAC</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-[10px] text-neutral-400">Header (8 bytes)</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">`DOCUENC1`</p>
              </div>
              <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-[10px] text-neutral-400">Initialization Vector (12B)</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Cryptographic IV</p>
              </div>
              <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-[10px] text-neutral-400">Authentication Tag (16B)</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">GCM Auth Tag</p>
              </div>
              <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-[10px] text-neutral-400">Payload</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">Encrypted Ciphertext</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-900 dark:text-white">Cloud Provider Blindness:</strong> Even if our underlying storage partner (Neon / AWS S3) is subjected to unauthorized access or subpoenas, they cannot read, scan, or decrypt the stored payload because they do not have the encryption keys.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-900 dark:text-white">Tamper Evident:</strong> The 128-bit Galois/Counter Mode authentication tag verifies data authenticity. Any bit modified or tampered with in storage causes instant decryption rejection.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-900 dark:text-white">In-Memory Decrypted Streaming:</strong> Files are decrypted only in secure transient memory when requested by an authorized authenticated advisor. No decrypted file is ever cached on disk.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-900 dark:text-white">Unique IV per File:</strong> Every document upload generates an independent, cryptographically secure 96-bit random initialization vector, preventing rainbow or pattern analysis.
              </div>
            </div>
          </div>
        </div>

        {/* Deep Dive 2: Legal & Regulatory Compliances */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Statutory & Regulatory Compliance Alignment
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Safeguarding your practice against legal liabilities under Indian and international privacy regimes
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-2">
              <h4 className="font-bold text-neutral-900 dark:text-white text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Digital Personal Data Protection Act, 2023 (DPDP Act, India)
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                DocGet functions strictly as a <strong>Data Processor</strong> on behalf of the registered professional (the <strong>Data Fiduciary</strong>). Our architecture enforces lawful purpose limitation, automated data deletion, and strict confidentiality in alignment with the DPDP Act 2023. We do not process client personal data for any unauthorized secondary purpose or marketing.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-2">
              <h4 className="font-bold text-neutral-900 dark:text-white text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Information Technology Act, 2000 & SPDI Rules, 2011
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                We implement comprehensive <em>Reasonable Security Practices and Procedures (RSPP)</em> under Section 43A of the IT Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, incorporating AES-256 encryption, access controls, and multi-tenant sandboxing.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-2">
              <h4 className="font-bold text-neutral-900 dark:text-white text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Intermediary Safe Harbor (IT Act Section 79)
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                DocGet operates as an automated transmission intermediary. We do not initiate the transmission, select the receiver, or modify the contents of client documents. Our terms ensure your advisory firm retains sole ownership and legal responsibility for client consents.
              </p>
            </div>
          </div>
        </div>

        {/* Deep Dive 3: Tenant Isolation & Token Security */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Tokenized Client Upload Portals</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Clients do not create insecure accounts or reuse passwords. Upload links are secured with cryptographically random 256-bit unique tokens scoped strictly to their case. Once the case is closed or purged, tokens become invalid immediately.
            </p>
            <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>No client registration friction or weak password reuse</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Upload scope limited exclusively to requested checklist items</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Direct advisor contact banner on upload page for client clarity</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-neutral-900 dark:text-white">Anti-Hoarding Auto-Purge Policy</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Holding client records indefinitely is a serious compliance risk. DocGet's automated lifecycle engine deletes files automatically after your plan retention threshold:
            </p>
            <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white w-24">Free Trial:</span>
                <span>14-day automated purge & audit trail</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white w-24">Starter Plan:</span>
                <span>30-day automated purge & audit trail</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white w-24">Pro Plan:</span>
                <span>45-day automated purge & audit trail</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white w-24">Firm Plan:</span>
                <span>60-day maximum retention (Max 2 Months policy)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white w-24">Rejected Files:</span>
                <span>Automated purge alongside plan schedule</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Disclosures & Contact */}
        <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Security Team & Vulnerability Disclosure
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
              If you have identified a vulnerability or need a signed Data Processing Addendum (DPA) for your firm's compliance audit, please get in touch with our security engineering team directly.
            </p>
          </div>
          <a
            href="mailto:security@docget.app"
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Contact Security Team</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-8 bg-white dark:bg-[#0c0e12] transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-xs">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocGet</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocGet. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );

}

export default function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  switch (slug) {
    case "privacy":
      return <PrivacyContent />;
    case "terms":
      return <TermsContent />;
    case "refund":
      return <RefundContent />;
    case "security":
      return <SecurityContent />;
    default:
      notFound();
  }
}
