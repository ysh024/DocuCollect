import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider, ThemeProvider } from "@/components/ui";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://docget.app";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DocGet — Client Document Collection Portal for CAs & Advisors",
    template: "%s | DocGet",
  },
  description:
    "Streamline client document collection for Chartered Accountants, Tax Consultants, and Law Firms. Application-layer AES-256-GCM encryption, WhatsApp upload links, structured checklists, multi-file downloads, and practice audit trails.",
  keywords: [
    "DocGet",
    "document collection portal",
    "client document portal",
    "CA tax document collection",
    "WhatsApp document upload",
    "encrypted client portal",
    "AES-256-GCM encryption",
    "DPDP Act compliance",
    "ITR document collection",
    "KYC collection software",
    "Chartered Accountant SaaS",
    "practice audit trail",
  ],
  authors: [{ name: "DocGet Team" }],
  creator: "DocGet",
  publisher: "DocGet",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "DocGet",
    title: "DocGet — Secure Client Document Collection Portal",
    description:
      "Replace chaotic WhatsApp & email attachments with structured client document checklists, instant verification, and automatic client follow-ups.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DocGet — Client Document Collection Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocGet — Secure Client Document Collection Portal",
    description:
      "Collect client documents via WhatsApp links with structured checklists and CA review dashboard.",
    creator: "@docget",
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DocGet",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  description:
    "Secure, structured client document collection with instant review, versioning, and WhatsApp sharing for Chartered Accountants and legal advisors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('docget_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased transition-colors duration-150">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
