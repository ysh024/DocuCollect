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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing Plans — Simple, Transparent Pricing",
  description:
    "Flexible subscription plans for Chartered Accountants, Tax Consultants, and Law Firms. Start with a full-featured 30-day free trial.",
};

const plans = [
  {
    name: "Free Trial",
    icon: Zap,
    tagline: "30 days on us. No card needed.",
    priceMonthly: 0,
    priceYearly: 0,
    isFree: true,
    highlight: false,
    features: [
      "Up to 10 clients",
      "5 document checklists per client",
      "7-day file auto-deletion",
      "Secure WhatsApp upload links",
      "Email OTP login (no password)",
      "Document review & approval",
      "Activity audit trail",
      "Mobile-friendly client portal",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
  },
  {
    name: "Starter",
    icon: Shield,
    tagline: "Best for solo practitioners and small firms.",
    priceMonthly: 499,
    priceYearly: 4999,
    isFree: false,
    highlight: true,
    features: [
      "Up to 25 clients",
      "20 cases per client",
      "30-day file retention",
      "Secure WhatsApp upload links",
      "Email OTP login",
      "Document review & approval",
      "Custom firm branding",
      "Priority email support",
      "Activity & query notifications",
    ],
    cta: "Contact to Activate",
    ctaHref: "/signup",
  },
  {
    name: "Professional",
    icon: Crown,
    tagline: "For larger firms and growing agencies.",
    priceMonthly: 999,
    priceYearly: 9999,
    isFree: false,
    highlight: false,
    features: [
      "Up to 100 clients",
      "Unlimited cases per client",
      "90-day file retention",
      "Secure WhatsApp upload links",
      "Email OTP login",
      "Document review & approval",
      "Custom branding + domain",
      "Team member accounts",
      "API access (coming soon)",
      "Dedicated support",
    ],
    cta: "Contact to Activate",
    ctaHref: "/signup",
  },
];

const faqs = [
  {
    q: "How does payment work?",
    a: "We accept payments directly via UPI, QR code, and Net Banking (NEFT/RTGS/IMPS). Once payment is completed, notify us with the transaction screenshot and your plan is activated swiftly. You will receive an official activation confirmation.",
  },
  {
    q: "What happens after my free trial ends?",
    a: "After 30 days, your account continues to work but file uploads will pause until you activate a paid plan. Your existing data and client links remain accessible. We'll notify you before the trial ends.",
  },
  {
    q: "Can I upgrade my plan later?",
    a: "Absolutely. You can start on Free Trial, and we'll upgrade you to Starter or Professional when you're ready. Your data is preserved.",
  },
  {
    q: "What is file retention?",
    a: "Uploaded documents are automatically deleted after the retention period to keep storage usage lean. Free Trial = 7 days, Starter = 30 days, Professional = 90 days. Clients can re-upload if needed.",
  },
  {
    q: "Is the client portal free for my clients?",
    a: "Yes. Your clients access the secure upload portal for free — they never need to create an account or pay anything. Only you (the professional) need a plan.",
  },
  {
    q: "How do I activate a paid plan?",
    a: "Complete your payment via UPI in your dashboard Billing page and share the screenshot via WhatsApp. You will immediately receive a single-use license voucher key to instantly unlock your plan.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900">DocuCollect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 transition">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to home
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition"
            >
              Start Free <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-5">
          <Zap className="w-3 h-3" /> Pay by UPI · Bank Transfer · QR Code
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 mb-3">
          Simple, honest pricing
        </h1>
        <p className="text-neutral-500 text-sm max-w-lg mx-auto">
          Start with a 30-day free trial. When you're ready to upgrade, pay monthly or save with an annual plan. 
          We manually activate plans — no automated billing surprises.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-3 gap-5">
          {plans.map(({ name, icon: Icon, tagline, priceMonthly, priceYearly, isFree, highlight, features, cta, ctaHref }) => (
            <div
              key={name}
              className={`rounded-2xl border p-6 flex flex-col relative ${
                highlight
                  ? "bg-neutral-900 border-neutral-800 text-white shadow-xl"
                  : "bg-white border-neutral-200 text-neutral-900"
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${highlight ? "bg-white/10" : "bg-neutral-100"}`}>
                <Icon className={`w-4 h-4 ${highlight ? "text-white" : "text-neutral-700"}`} />
              </div>

              <h2 className="text-base font-bold mb-0.5">{name}</h2>
              <p className={`text-xs mb-4 ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>{tagline}</p>

              <div className="mb-2">
                <span className="text-3xl font-black">
                  {isFree ? "Free" : `₹${priceMonthly}`}
                </span>
                {!isFree && <span className={`text-xs ml-1 ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>/month</span>}
              </div>
              {!isFree && (
                <p className={`text-xs mb-5 ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>
                  or ₹{priceYearly}/year <span className="font-semibold text-emerald-400">save ~17%</span>
                </p>
              )}
              {isFree && <p className={`text-xs mb-5 ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>for 30 days</p>}

              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${highlight ? "text-emerald-400" : "text-emerald-500"}`} />
                    <span className={highlight ? "text-neutral-300" : "text-neutral-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={ctaHref}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                  highlight
                    ? "bg-white text-neutral-900 hover:bg-neutral-100"
                    : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Plan note */}
        <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 max-w-2xl mx-auto">
          <MessageSquareShare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">Direct Bank & UPI Plan Activation</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Sign up for the 30-day Free Trial with no credit card required. To activate a paid plan, make payment via UPI QR code or Direct Bank Transfer (NEFT/RTGS/IMPS) directly in your Billing dashboard. We activate plans within a few hours of confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <h2 className="text-xl font-bold text-neutral-900 text-center mb-8">What's included in each plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 pr-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider w-48">Feature</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-700">Free Trial</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-t-lg">Starter</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-700">Professional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[
                  ["Max clients", "10", "25", "100"],
                  ["Cases per client", "5", "20", "Unlimited"],
                  ["File retention", "7 days", "30 days", "90 days"],
                  ["Max file size", "10 MB", "25 MB", "50 MB"],
                  ["WhatsApp links", "✓", "✓", "✓"],
                  ["OTP login", "✓", "✓", "✓"],
                  ["Document review", "✓", "✓", "✓"],
                  ["Custom branding", "—", "✓", "✓"],
                  ["Team members", "—", "—", "✓"],
                  ["Priority support", "—", "✓", "✓"],
                  ["Dedicated support", "—", "—", "✓"],
                ].map(([feature, free, starter, pro]) => (
                  <tr key={feature} className="group">
                    <td className="py-2.5 pr-4 text-xs text-neutral-700 font-medium">{feature}</td>
                    <td className="py-2.5 px-4 text-xs text-neutral-500 text-center">{free}</td>
                    <td className="py-2.5 px-4 text-xs text-emerald-700 text-center font-medium bg-emerald-50/60">{starter}</td>
                    <td className="py-2.5 px-4 text-xs text-neutral-500 text-center">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-16">
        <h2 className="text-xl font-bold text-neutral-900 text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map(({ q, a }) => (
            <div key={q} className="p-5 bg-white border border-neutral-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900 mb-1.5">{q}</p>
                  <p className="text-xs text-neutral-600 leading-relaxed">{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-neutral-900 py-14">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Start collecting documents today</h2>
          <p className="text-neutral-400 text-sm mb-6">30-day free trial. No credit card. No password. Just your email.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-neutral-900 font-semibold text-sm rounded-xl hover:bg-neutral-100 transition"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900 py-6">
        <div className="max-w-5xl mx-auto px-5 text-center text-xs text-neutral-500">
          © 2026 DocuCollect · Built for Indian professionals · UPI / Bank Transfer accepted
        </div>
      </footer>
    </div>
  );
}
