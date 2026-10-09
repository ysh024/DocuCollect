import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Shield,
  MessageSquareShare,
  CheckCircle,
  Lock,
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
} from "lucide-react";

const useCases = [
  { icon: Calculator, label: "CA & Tax Consultants", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "ITR filing, GST returns, audit documents" },
  { icon: Scale, label: "Law Firms", color: "bg-violet-50 text-violet-700 border-violet-200", desc: "Client KYC, contracts, affidavits" },
  { icon: Building2, label: "Consultancy Agencies", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Onboarding docs, compliance files" },
  { icon: Landmark, label: "Financial Advisors", color: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "Investment proof, bank statements" },
  { icon: Briefcase, label: "HR & Recruitment", color: "bg-rose-50 text-rose-700 border-rose-200", desc: "Employee docs, background checks" },
  { icon: Users, label: "General Business", color: "bg-neutral-50 text-neutral-700 border-neutral-200", desc: "Any business that collects client docs" },
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
    title: "Secure by Design",
    desc: "OTP-only login, cryptographic upload tokens, 7-day auto-purge on free plans. No passwords means no password leaks.",
  },
  {
    icon: Clock,
    title: "Auto File Retention Policy",
    desc: "Free plan: 7-day file retention keeps storage lean. Upgrade for 30–90 day retention based on your workflow.",
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
    role: "Senior Partner, Kumar & Associates",
  },
  {
    quote: "The 30-day free trial gave us enough time to test with real clients. The pricing is very fair for what you get.",
    author: "Sneha Patel",
    role: "Financial Advisor, Ahmedabad",
  },
];

const steps = [
  { num: "01", title: "Sign up free", desc: "Create your account with email OTP. No password needed." },
  { num: "02", title: "Add a client & case", desc: "Create a case with a document checklist in under 2 minutes." },
  { num: "03", title: "Share the link", desc: "Copy the secure upload link and send via WhatsApp or email." },
  { num: "04", title: "Review & approve", desc: "Get notified when documents arrive. Review and approve from anywhere." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* ─── NAVBAR ─── */}
      <header className="border-b border-neutral-200/70 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">DocuCollect</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600">
            <Link href="#features" className="hover:text-neutral-900 transition">Features</Link>
            <Link href="#how-it-works" className="hover:text-neutral-900 transition">How it Works</Link>
            <Link href="/pricing" className="hover:text-neutral-900 transition">Pricing</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition"
            >
              Start Free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-6">
          <Zap className="w-3 h-3" />
          30-day free trial — no credit card required
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6">
          Stop chasing clients <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">for documents.</span>
        </h1>

        <p className="text-neutral-500 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
          DocuCollect gives CAs, consultants, law firms, and agencies a secure link-based document collection portal.
          Replace WhatsApp chaos with structured checklists, instant review, and complete audit trails.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Start 30-Day Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-all"
          >
            View Pricing Plans
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
          <div className="flex -space-x-1.5">
            {["SH", "CA", "RK", "AP"].map((initials) => (
              <div key={initials} className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {initials}
              </div>
            ))}
          </div>
          <span>Join professionals already using DocuCollect</span>
          <div className="flex items-center gap-0.5 ml-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
          </div>
        </div>
      </section>

      {/* ─── USE CASES ─── */}
      <section className="bg-neutral-50 border-y border-neutral-200 py-12">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <p className="text-center text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-8">
            Built for every professional who collects documents from clients
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {useCases.map(({ icon: Icon, label, color, desc }) => (
              <div key={label} className={`p-4 rounded-xl border ${color} flex flex-col items-center text-center gap-2`}>
                <Icon className="w-5 h-5" />
                <p className="text-xs font-semibold leading-tight">{label}</p>
                <p className="text-[10px] text-neutral-500 leading-relaxed hidden sm:block">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-5 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">Get started in minutes</h2>
          <p className="text-neutral-500 text-sm max-w-lg mx-auto">No complex setup. No training required. Start collecting documents from your first client today.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="relative">
              <div className="text-4xl font-black text-neutral-100 mb-2">{num}</div>
              <h3 className="text-sm font-bold text-neutral-900 mb-1">{title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="bg-neutral-50 border-y border-neutral-200 py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">Everything you need</h2>
            <p className="text-neutral-500 text-sm max-w-lg mx-auto">A complete document collection system designed for the way Indian professionals work.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all group">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 group-hover:bg-neutral-900 flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-4 h-4 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1.5">{title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING PREVIEW ─── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">Simple, transparent pricing</h2>
        <p className="text-neutral-500 text-sm max-w-lg mx-auto mb-8">
          Start free for 30 days. Then choose a plan that grows with your practice. No hidden fees.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-8">
          {[
            { name: "Free Trial", price: "₹0", period: "for 30 days", features: ["10 clients", "7-day file retention", "WhatsApp links", "OTP login"], highlight: false },
            { name: "Starter", price: "₹499", period: "/month", features: ["25 clients", "30-day retention", "Priority support", "Custom branding"], highlight: true },
            { name: "Professional", price: "₹999", period: "/month", features: ["100+ clients", "90-day retention", "API access", "Dedicated support"], highlight: false },
          ].map(({ name, price, period, features, highlight }) => (
            <div key={name} className={`p-6 rounded-xl border text-left ${highlight ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-200"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>{name}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black">{price}</span>
                <span className={`text-xs ${highlight ? "text-neutral-400" : "text-neutral-400"}`}>{period}</span>
              </div>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${highlight ? "text-emerald-400" : "text-emerald-500"}`} />
                    <span className={highlight ? "text-neutral-300" : "text-neutral-600"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition"
        >
          See full pricing details <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-neutral-50 border-y border-neutral-200 py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-neutral-900 mb-10">What our users say</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map(({ quote, author, role }) => (
              <div key={author} className="p-5 bg-white rounded-xl border border-neutral-200">
                <div className="flex mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed mb-4">"{quote}"</p>
                <div>
                  <p className="text-xs font-bold text-neutral-900">{author}</p>
                  <p className="text-[11px] text-neutral-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 py-20 text-center">
        <div className="bg-neutral-900 rounded-2xl px-8 py-14">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to simplify document collection?
          </h2>
          <p className="text-neutral-400 text-sm mb-8 max-w-md mx-auto">
            Join professionals who've replaced email chaos with structured, secure document collection. 30 days free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-neutral-900 font-semibold text-sm rounded-xl hover:bg-neutral-100 transition shadow-sm"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white border border-white/20 rounded-xl hover:bg-white/10 transition"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-neutral-500 text-xs mt-5">No credit card required · 30-day full access trial · Bank / UPI renewals</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-neutral-200 py-8">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neutral-900 flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900">DocuCollect</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500">
            <Link href="/pricing" className="hover:text-neutral-800 transition">Pricing</Link>
            <Link href="/terms" className="hover:text-neutral-800 transition">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-neutral-800 transition">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-neutral-800 transition">Refunds</Link>
            <Link href="/login" className="hover:text-neutral-800 transition">Sign In</Link>
            <Link href="/signup" className="hover:text-neutral-800 transition">Sign Up</Link>
          </div>
          <p className="text-xs text-neutral-400">© 2026 DocuCollect. Built for professionals.</p>
        </div>
      </footer>
    </div>
  );
}
