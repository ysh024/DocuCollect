export const dynamic = "force-static";

import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowLeft,
  Shield,
  Lock,
  Key,
  Server,
  FileCheck,
  Trash2,
  EyeOff,
  Database,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ChevronRight,
  Fingerprint,
  Cpu,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Security & Compliance Center — Zero-Knowledge Architecture | DocuCollect",
  description:
    "Zero-Knowledge AES-256-GCM envelope encryption, tenant isolation, DPDP Act 2023 compliance, and practice audit trails built for Chartered Accountants and legal advisors.",
  keywords: [
    "DocuCollect security",
    "Zero-Knowledge document encryption",
    "AES-256-GCM client files",
    "DPDP Act 2023 compliance CA",
    "encrypted tax document intake",
    "data retention policy 60 days",
  ],
  alternates: {
    canonical: "https://docucollect.app/security",
  },
  openGraph: {
    title: "Security Architecture — Zero-Knowledge AES-256-GCM | DocuCollect",
    description:
      "Client files are encrypted before storage. Cloud providers cannot inspect files. Automated retention up to 60 days max.",
    url: "https://docucollect.app/security",
    type: "website",
  },
};

export default function SecurityPage() {
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
              DocuCollect
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
            Chartered Accountants, advocates, and tax advisors handle India's most sensitive financial and legal records. We engineered DocuCollect with <strong>Zero-Knowledge storage encryption</strong>, strict tenant isolation, and automated data purging so your firm and your clients stay safe from breaches and regulatory liabilities.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Zero-Knowledge Storage</h3>
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

        {/* Deep Dive 1: Zero-Knowledge Storage Architecture */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Cryptographic Storage Pipeline: AES-256-GCM Zero-Knowledge Envelope
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                How DocuCollect shields sensitive tax and identity files from third-party inspection
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Most SaaS platforms store customer files in plaintext or rely solely on cloud provider server-side encryption (where the cloud provider holds the keys and can inspect the files). DocuCollect implements an independent <strong>Application-Layer Envelope Encryption</strong> standard:
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
                DocuCollect functions strictly as a <strong>Data Processor</strong> on behalf of the registered professional (the <strong>Data Fiduciary</strong>). Our architecture enforces lawful purpose limitation, automated data deletion, and strict confidentiality in alignment with the DPDP Act 2023. We do not process client personal data for any unauthorized secondary purpose or marketing.
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
                DocuCollect operates as an automated transmission intermediary. We do not initiate the transmission, select the receiver, or modify the contents of client documents. Our terms ensure your advisory firm retains sole ownership and legal responsibility for client consents.
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
              Holding client records indefinitely is a serious compliance risk. DocuCollect's automated lifecycle engine deletes files automatically after your plan retention threshold:
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
            href="mailto:security@docucollect.app"
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
            <span className="text-sm font-bold text-neutral-900 dark:text-white">DocuCollect</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="text-emerald-600 dark:text-emerald-400 font-semibold transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
