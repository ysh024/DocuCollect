export const dynamic = "force-static";

import Link from "next/link";
import { Metadata } from "next";
import {
  Layers,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  Shield,
  Zap,
  Crown,
  MessageSquareShare,
  Info,
  Building2,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Pricing Plans — Simple, Transparent Pricing | DocuCollect",
  description:
    "Transparent subscription plans for Chartered Accountants, Tax Consultants, and Law Firms. Includes Zero-Knowledge AES-256-GCM encryption and 30-day free trial.",
};

const plans = [
  {
    name: "Trial",
    icon: Zap,
    badge: "30 Days",
    tagline: "For evaluating practice workflows",
    priceMonthly: 0,
    priceYearly: 0,
    isFree: true,
    highlight: false,
    features: [
      "Up to 10 active clients",
      "500 MB encrypted cloud storage",
      "Zero-Knowledge AES-256-GCM encryption",
      "14-day practice audit trail",
      "Max 5 cases per client",
      "Max 5 custom templates",
      "Reusable document checklists",
      "Direct client enquiry card",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
  },
  {
    name: "Starter",
    icon: Shield,
    badge: "Most Popular",
    tagline: "For solo consultants and small practices",
    priceMonthly: 399,
    priceYearly: 3999,
    isFree: false,
    highlight: true,
    features: [
      "Up to 50 active clients",
      "2 GB encrypted cloud storage",
      "Zero-Knowledge AES-256-GCM encryption",
      "30-day practice audit trail",
      "Max 10 cases per client",
      "Max 5 custom templates",
      "Client data export in Excel",
      "Delete clients & portfolio management",
      "WhatsApp & link sharing",
    ],
    cta: "Upgrade to Starter",
    ctaHref: "/signup",
  },
  {
    name: "Professional",
    icon: Crown,
    badge: null,
    tagline: "For firms with multiple staff & high volume",
    priceMonthly: 799,
    priceYearly: 7999,
    isFree: false,
    highlight: false,
    isUpcoming: false,
    features: [
      "Up to 200 active clients",
      "5 GB encrypted cloud storage",
      "Zero-Knowledge AES-256-GCM encryption",
      "45-day comprehensive audit trail",
      "Max 25 cases per client",
      "Max 10 custom templates",
      "Client data export in Excel",
      "Delete clients & case management",
      "Multi-staff accounts & firm branding",
      "Priority customer support",
    ],
    cta: "Upgrade to Professional",
    ctaHref: "/signup",
  },
  {
    name: "Firm",
    icon: Building2,
    badge: "Upcoming / Not Available",
    tagline: "Upcoming tier in development — currently not available",
    priceMonthly: 1499,
    priceYearly: 14999,
    isFree: false,
    highlight: false,
    isUpcoming: true,
    features: [
      "500+ active clients (Upcoming)",
      "20 GB+ custom storage quota",
      "Zero-Knowledge AES-256-GCM encryption",
      "60-day audit trail (Max 2 Months)",
      "Max 50 cases per client",
      "Max 25 custom templates",
      "Advanced role-based access (RBAC)",
      "Dedicated onboarding & SLA support",
    ],
    cta: "Upcoming Tier",
    ctaHref: "#",
  },
];

const faqs = [
  {
    q: "How does payment work?",
    a: "We accept payments directly via UPI QR code and Net Banking (NEFT/RTGS/IMPS). Once payment is completed, share the transaction screenshot on WhatsApp from your dashboard Billing page. You will immediately receive a single-use license voucher key to unlock your plan.",
  },
  {
    q: "What is Zero-Knowledge storage encryption?",
    a: "Every document uploaded by your clients is encrypted at the application layer with AES-256-GCM before writing to cloud storage. Even our underlying cloud database and storage providers (Neon and AWS) cannot view or inspect client files. Only authenticated advisors can stream-decrypt them.",
  },
  {
    q: "What is the automated file purge policy?",
    a: "To keep infrastructure lean, prevent data hoarding, and comply with DPDP Act 2023 principles, files are automatically shredded after the plan retention window (7 days on Free Trial, 15 days on Starter, 30 days on Professional). You should download verified client files to your local office storage promptly.",
  },
  {
    q: "Can I export client data to Excel?",
    a: "Yes. Client master data export in Excel (.xlsx) is available on all paid plans (Starter, Professional, and Firm). You can export your full client directory in one click.",
  },
  {
    q: "Can I delete clients and cases?",
    a: "Yes. Active client and case deletion permissions are unlocked on paid plans (Starter, Professional, and Firm). Deleting a client immediately and permanently removes all associated tokens and stored documents.",
  },
  {
    q: "What happens after my free trial ends?",
    a: "After 30 days, your account remains accessible but new uploads and client creations pause until you activate a paid plan. Your existing client checklist templates remain fully preserved.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-neutral-900 transition-colors duration-150">
      {/* Header */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-150">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-emerald-600 flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">DocuCollect</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/" className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors px-2 py-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to home
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
            >
              Start Free <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-5 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Zero-Knowledge AES-256-GCM · Direct UPI / Bank Transfer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3">
          Simple, honest pricing for professionals
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-lg mx-auto">
          Start with a full 30-day free trial. Choose a plan tailored to your practice size with zero auto-debits and transparent limits.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map(({ name, icon: Icon, badge, tagline, priceMonthly, priceYearly, isFree, highlight, isUpcoming, features, cta, ctaHref }) => (
            <div
              key={name}
              className={`rounded-2xl border p-5 sm:p-6 flex flex-col relative transition-all ${
                highlight
                  ? "bg-neutral-900 dark:bg-neutral-900 border-neutral-900 dark:border-emerald-500/80 text-white shadow-xl ring-1 ring-emerald-500/30"
                  : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs"
              }`}
            >
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${
                    highlight 
                      ? "bg-emerald-500 text-white" 
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700"
                  }`}>
                    {badge}
                  </span>
                </div>
              )}

              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${highlight ? "bg-white/10 dark:bg-emerald-950/60" : "bg-neutral-100 dark:bg-neutral-800"}`}>
                <Icon className={`w-4 h-4 ${highlight ? "text-emerald-300" : "text-neutral-700 dark:text-neutral-300"}`} />
              </div>

              <h2 className="text-base font-bold mb-0.5">{name}</h2>
              <p className={`text-xs mb-4 min-h-[32px] ${highlight ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>{tagline}</p>

              <div className="mb-2">
                <span className="text-3xl font-black">
                  {isFree ? "₹0" : `₹${priceMonthly}`}
                </span>
                {!isFree && <span className={`text-xs ml-1 ${highlight ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>/month</span>}
              </div>
              {!isFree && (
                <p className={`text-xs mb-5 ${highlight ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>
                  or ₹{priceYearly}/year <span className="font-semibold text-emerald-400">save ~17%</span>
                </p>
              )}
              {isFree && <p className={`text-xs mb-5 ${highlight ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>for 30 days</p>}

              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${highlight ? "text-emerald-400" : "text-emerald-500 dark:text-emerald-400"}`} />
                    <span className={highlight ? "text-neutral-300" : "text-neutral-600 dark:text-neutral-300"}>{f}</span>
                  </li>
                ))}
              </ul>

              {isUpcoming ? (
                <div className="w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed">
                  <span>Upcoming Tier (Coming Soon)</span>
                </div>
              ) : (
                <Link
                  href={ctaHref}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                    highlight
                      ? "bg-white dark:bg-emerald-600 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-emerald-500 shadow-sm"
                      : "bg-neutral-900 dark:bg-neutral-800 text-white hover:bg-neutral-800 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span>{cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Plan note */}
        <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-3 max-w-2xl mx-auto shadow-2xs">
          <MessageSquareShare className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">Direct Bank & UPI Plan Activation</p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Sign up for the 30-day Free Trial with no credit card required. To activate a paid plan, make payment via UPI QR code or Direct Bank Transfer (NEFT/RTGS/IMPS) directly in your Billing dashboard. We activate plans swiftly upon verification.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 py-16 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white text-center mb-8">What's included in each plan</h2>
          <div className="overflow-x-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4 sm:p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200/80 dark:border-neutral-800">
                  <th className="text-left py-3 pr-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-44">Feature</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Trial</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-t-lg">Starter</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Professional</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">Firm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {[
                  ["Monthly Price", "₹0", "₹399", "₹799", "₹1,499"],
                  ["Active Clients Limit", "Up to 10", "Up to 50", "Up to 200", "500+ (Upcoming)"],
                  ["Cloud Storage Quota", "500 MB", "2 GB", "5 GB", "20 GB+ (Upcoming)"],
                  ["Cases Limit Per Client", "Max 5 cases", "Max 10 cases", "Max 25 cases", "Max 50 cases (Upcoming)"],
                  ["Custom Checklist Templates", "Max 5 templates", "Max 5 templates", "Max 10 templates", "Max 25 templates (Upcoming)"],
                  ["Zero-Knowledge AES-256-GCM", "✓ Included", "✓ Included", "✓ Included", "✓ Included"],
                  ["Audit Trail History", "14 days", "30 days", "45 days", "60 days (Upcoming)"],
                  ["Export Clients to Excel", "—", "✓ Included", "✓ Included", "✓ Included"],
                  ["Delete Clients & Portfolios", "—", "✓ Included", "✓ Included", "✓ Included"],
                  ["Client Upload Portal", "✓", "✓", "✓", "✓"],
                  ["Advisor Direct Contact Card", "✓", "✓", "✓", "✓"],
                  ["Workspaces & Staff", "1 firm workspace", "Solo account", "Multiple staff + roles", "Advanced staff + RBAC"],
                  ["Firm Branding", "—", "—", "✓ Included", "✓ Included"],
                  ["Support Level", "Standard", "Standard", "Priority support", "Upcoming SLA"],
                ].map(([feature, free, starter, pro, firm]) => (
                  <tr key={feature} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 pr-4 text-xs text-neutral-700 dark:text-neutral-300 font-medium">{feature}</td>
                    <td className="py-2.5 px-3 text-xs text-neutral-500 dark:text-neutral-400 text-center">{free}</td>
                    <td className="py-2.5 px-3 text-xs text-emerald-700 dark:text-emerald-400 text-center font-bold bg-emerald-50/50 dark:bg-emerald-950/30">{starter}</td>
                    <td className="py-2.5 px-3 text-xs text-neutral-500 dark:text-neutral-400 text-center">{pro}</td>
                    <td className="py-2.5 px-3 text-xs text-neutral-700 dark:text-neutral-300 text-center font-medium">{firm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-16">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map(({ q, a }) => (
            <div key={q} className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-2xs transition-colors">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">{q}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-neutral-900 dark:bg-neutral-900 border-t border-neutral-800 py-14">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Start collecting documents today</h2>
          <p className="text-neutral-400 text-sm mb-6">30-day free trial. Zero-knowledge encrypted. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-neutral-900 dark:text-white font-semibold text-sm rounded-xl transition shadow-xs"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900 py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="font-bold text-white">DocuCollect</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/pricing" className="text-white hover:underline">Pricing</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refunds</Link>
          </div>
          <p>© 2026 DocuCollect · Built for Indian professionals · UPI / Bank Transfer</p>
        </div>
      </footer>
    </div>
  );
}
