import { Metadata } from "next";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Shield,
  MessageSquareShare,
  CheckCircle,
  Briefcase,
  Star,
  Users,
  FileText,
  Clock,
  Zap,
  Building2,
  Scale,
  Landmark,
  Calculator,
  ChevronRight,
  Send,
  Eye,
  Bell,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "DocuCollect — Client Document Collection Portal for CAs, Tax Consultants & Advocates",
  description:
    "Secure link-based document collection portal for Indian Chartered Accountants, Tax Consultants, and Law Firms. Features Zero-Knowledge AES-256-GCM encryption, WhatsApp upload links, structured checklists, multi-file downloads, and practice audit trails.",
  keywords: [
    "DocuCollect",
    "CA document collection software",
    "Tax consultant client portal",
    "WhatsApp document upload link",
    "Zero Knowledge encrypted storage",
    "Chartered Accountant checklist",
    "GST document collection",
    "ITR client files portal",
    "law firm client intake portal",
  ],
  alternates: {
    canonical: "https://docucollect.app",
  },
  openGraph: {
    title: "DocuCollect — Client Document Collection Portal for CAs & Advisors",
    description:
      "Stop chasing clients for documents. Send encrypted WhatsApp upload links with structured checklists, multi-file downloads, and immutable audit trails.",
    url: "https://docucollect.app",
    type: "website",
  },
};

const useCases = [
  {
    icon: Calculator,
    label: "CA & Tax Consultants",
    color: "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60",
    desc: "ITR filing, GST returns, audit documents",
  },
  {
    icon: Scale,
    label: "Law Firms",
    color: "bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-900/60",
    desc: "Client KYC, contracts, affidavits",
  },
  {
    icon: Building2,
    label: "Consultancy Agencies",
    color: "bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60",
    desc: "Onboarding docs, compliance files",
  },
  {
    icon: Landmark,
    label: "Financial Advisors",
    color: "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60",
    desc: "Investment proof, bank statements",
  },
  {
    icon: Briefcase,
    label: "HR & Recruitment",
    color: "bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60",
    desc: "Employee docs, background checks",
  },
  {
    icon: Users,
    label: "General Business",
    color: "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
    desc: "Any business that collects client docs",
  },
];

const features = [
  {
    icon: Send,
    title: "WhatsApp-Ready Secure Links",
    desc: "Generate encrypted upload links. Send via WhatsApp or email in one click. Clients upload without any login required.",
  },
  {
    icon: FileText,
    title: "Structured Document Checklists",
    desc: "Create case-specific checklists. Track exactly which documents are missing, uploaded, under review, or approved.",
  },
  {
    icon: Eye,
    title: "Instant Document Preview",
    desc: "Review PDFs and images directly in the dashboard. Approve or reject with reason templates for clear client communication.",
  },
  {
    icon: Bell,
    title: "Activity & Query Tracking",
    desc: "Get notified when clients upload files or raise questions. Full audit trail of every action on every document.",
  },
  {
    icon: Shield,
    title: "Zero-Knowledge Encryption",
    desc: "AES-256-GCM file encryption before cloud storage. Cloud providers cannot inspect files. Multi-tenant isolation.",
  },
  {
    icon: Clock,
    title: "Automated Data Purge",
    desc: "Files auto-purge permanently in 7 to 30 days to enforce data minimization and keep compliance risks zero.",
  },
];

const testimonials = [
  {
    quote: "My clients just click the WhatsApp link and upload. No confusion, no missing documents. DocuCollect saved me hours every week.",
    author: "CA Priya Mehta",
    role: "Tax Consultant, Pune",
  },
  {
    quote: "We moved from email chains to DocuCollect in a day. The checklist system means nothing slips through the cracks.",
    author: "Adv. Ravi Kumar",
    role: "Senior Partner, Kumar & Associates, Delhi",
  },
  {
    quote: "The 30-day free trial gave us enough time to test with real clients. The pricing is very fair for what you get.",
    author: "Sneha Patel",
    role: "Financial Advisor, Ahmedabad",
  },
];

const steps = [
  { num: "01", title: "Create Case Checklist", desc: "Define required documents or choose a pre-made template in under 60 seconds." },
  { num: "02", title: "Share 1-Click Link", desc: "Copy the encrypted upload link and share via WhatsApp or email." },
  { num: "03", title: "Client Uploads Freely", desc: "Clients drop files from phone or laptop with zero login or password friction." },
  { num: "04", title: "Review & Approve", desc: "Preview PDFs instantly in-browser. Approve or reject with clear guidance." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0e12] text-neutral-900 dark:text-neutral-100 selection:bg-emerald-600 selection:text-white transition-colors duration-150 relative overflow-x-clip">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/15 dark:via-teal-700/5 dark:to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ─── NAVBAR ─── */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-[#0c0e12]/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-150">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">DocuCollect</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                v2.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300 font-medium">
            <Link href="#solutions" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Solutions</Link>
            <Link href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">How it Works</Link>
            <Link href="#features" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1-Click Dark/Light Theme Switcher */}
            <ThemeToggle />

            <Link
              href="/login"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-xs hover:shadow-sm hover:shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              Start Free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-16 pb-14 text-center">
        {/* Pulsing trial badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-6 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>30-day free trial · Zero credit card required · Instant setup</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
          Stop chasing clients <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
            for documents.
          </span>
        </h1>

        <p className="text-neutral-600 dark:text-neutral-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
          DocuCollect gives CAs, consultants, law firms, and agencies a secure link-based document collection portal.
          Replace WhatsApp chaos with structured checklists, instant review, and complete audit trails.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Start 30-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <span>View Pricing Plans</span>
            <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap mb-14">
          <div className="flex -space-x-1.5">
            {["PM", "CA", "RK", "AP"].map((initials) => (
              <div key={initials} className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 dark:from-neutral-700 dark:to-neutral-800 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0c0e12]">
                {initials}
              </div>
            ))}
          </div>
          <span>Trusted by 500+ Indian practitioners across 25+ cities</span>
          <div className="flex items-center gap-0.5 ml-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>

        {/* ─── HERO LIVE MOCKUP SHOWCASE ─── */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 shadow-xl overflow-hidden text-left transition-all">
          {/* Mockup Header */}
          <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950/70 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
              </div>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                Case #DC-4091 · Sharma & Sons · GST Audit FY 2025-26
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <Check className="w-3 h-3" />
              <span>3 of 4 Uploaded (75%)</span>
            </div>
          </div>

          {/* Mockup Content Items */}
          <div className="p-4 sm:p-5 space-y-2.5">
            {[
              { title: "Bank Statements (12 Months)", ext: "PDF · 2.4 MB", status: "Approved", statusColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60" },
              { title: "GSTR-3B Signed Returns", ext: "PDF · 1.1 MB", status: "Under Review", statusColor: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60" },
              { title: "Incorporation Certificate", ext: "PDF · 850 KB", status: "Approved", statusColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60" },
              { title: "Director KYC & PAN Card", ext: "Awaiting client upload", status: "Missing", statusColor: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white leading-tight">{item.title}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{item.ext}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${item.statusColor}`}>
                  {item.status}
                </span>
              </div>
            ))}

            {/* Mockup Share Footer */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-neutral-200/80 dark:border-neutral-800 mt-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 w-full sm:w-auto">
                <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Encrypted Upload Link: <strong className="text-neutral-900 dark:text-neutral-200 font-mono">docucollect.in/upload/sharma-8491</strong></span>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-2xs">
                  <MessageSquareShare className="w-3 h-3" /> Share via WhatsApp
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── USE CASES ─── */}
      <section id="solutions" className="bg-neutral-50/80 dark:bg-neutral-900/50 border-y border-neutral-200/80 dark:border-neutral-800 py-16 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <p className="text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-8">
            Built for every professional who collects documents from clients
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {useCases.map(({ icon: Icon, label, color, desc }) => (
              <div key={label} className={`p-4 rounded-xl border ${color} flex flex-col items-center text-center gap-2 shadow-2xs hover:shadow-xs transition-all`}>
                <Icon className="w-5 h-5 shrink-0" />
                <p className="text-xs font-semibold leading-tight">{label}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed hidden sm:block">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-5 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">Get started in minutes</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-lg mx-auto">No complex setup. No client training required. Start collecting documents today.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="relative p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition-all">
              <div className="text-3xl font-black text-emerald-600/30 dark:text-emerald-500/30 mb-2">{num}</div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="bg-neutral-50/80 dark:bg-neutral-900/50 border-y border-neutral-200/80 dark:border-neutral-800 py-20 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">Everything you need</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-lg mx-auto">A complete document collection system designed for the way Indian professionals work.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 bg-white dark:bg-neutral-900/90 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition-all group">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 group-hover:bg-emerald-600 flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-4 h-4 text-emerald-700 dark:text-emerald-300 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">{title}</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING PREVIEW ─── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">Simple, transparent pricing</h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-lg mx-auto mb-8">
          Start free for 30 days. Then choose a plan that grows with your practice. No hidden fees.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
          {[
            {
              name: "Trial",
              price: "₹0",
              period: "for 30 days",
              badge: "30 Days",
              features: [
                "Up to 10 active clients",
                "500 MB encrypted cloud",
                "14-day practice audit trail",
                "Max 5 cases per client",
                "Max 5 custom templates",
              ],
              highlight: false,
            },
            {
              name: "Starter",
              price: "₹399",
              period: "/month",
              badge: "Most Popular",
              features: [
                "Up to 50 active clients",
                "2 GB encrypted cloud",
                "30-day practice audit trail",
                "Max 10 cases per client",
                "Excel export & WhatsApp links",
              ],
              highlight: true,
            },
            {
              name: "Professional",
              price: "₹799",
              period: "/month",
              badge: null,
              features: [
                "Up to 200 active clients",
                "5 GB encrypted cloud",
                "45-day practice audit trail",
                "Max 25 cases per client",
                "Multi-staff & firm branding",
              ],
              highlight: false,
            },
            {
              name: "Firm",
              price: "₹1,499",
              period: "/month",
              badge: "Upcoming Tier",
              features: [
                "500+ active clients (Upcoming)",
                "20 GB+ custom storage",
                "60-day audit trail (Max 2 Mo)",
                "Max 50 cases per client",
                "Upcoming / Not Available Right Now",
              ],
              highlight: false,
            },
          ].map(({ name, price, period, badge, features, highlight }) => (
            <div
              key={name}
              className={`p-5 rounded-2xl border text-left transition-all ${
                highlight
                  ? "bg-neutral-900 dark:bg-[#12161f] text-white border-neutral-900 dark:border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/30"
                  : "bg-white dark:bg-neutral-900/90 border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-bold uppercase tracking-wider ${highlight ? "text-emerald-400" : "text-neutral-500 dark:text-neutral-400"}`}>{name}</p>
                {badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    highlight
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                  }`}>
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black">{price}</span>
                <span className={`text-xs ${highlight ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>{period}</span>
              </div>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${highlight ? "text-emerald-400" : "text-emerald-500 dark:text-emerald-400"}`} />
                    <span className={highlight ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          <span>See full pricing details</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-neutral-50/80 dark:bg-neutral-900/50 border-y border-neutral-200/80 dark:border-neutral-800 py-16 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-white mb-10">What our users say</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map(({ quote, author, role }) => (
              <div key={author} className="p-5 bg-white dark:bg-neutral-900/90 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs transition-colors">
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">"{quote}"</p>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{author}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 dark:from-[#10171e] dark:via-[#131d27] dark:to-[#10171e] border border-neutral-800 dark:border-neutral-700/80 rounded-3xl px-8 py-14 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-4 border border-white/10 dark:border-emerald-800/40">
            <Layers className="w-6 h-6 text-white dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to simplify document collection?
          </h2>
          <p className="text-neutral-300 dark:text-neutral-400 text-sm mb-8 max-w-md mx-auto">
            Join professionals who've replaced email chaos with structured, secure document collection. 30 days free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition shadow-xs"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white border border-white/20 hover:bg-white/10 dark:border-neutral-700 dark:hover:bg-neutral-800 rounded-xl transition"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-5">No credit card required · 30-day full access trial · Bank / UPI renewals</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-8 bg-white dark:bg-[#0c0e12] transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <Link href="/refund" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refunds</Link>
            <Link href="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Sign Up</Link>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
