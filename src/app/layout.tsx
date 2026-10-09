import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://docucollect.app";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DocuCollect — Client Document Collection Portal for CAs & Advisors",
    template: "%s | DocuCollect",
  },
  description:
    "Streamline client document collection for Chartered Accountants, Tax Consultants, and Law Firms. Encrypted WhatsApp links, instant checklists, review dashboard, and automatic 7-day purging.",
  keywords: [
    "DocuCollect",
    "document collection portal",
    "client document portal",
    "CA tax document collection",
    "WhatsApp document upload",
    "encrypted client portal",
    "ITR document collection",
    "KYC collection software",
    "Chartered Accountant SaaS",
  ],
  authors: [{ name: "DocuCollect Team" }],
  creator: "DocuCollect",
  publisher: "DocuCollect",
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
    siteName: "DocuCollect",
    title: "DocuCollect — Secure Client Document Collection Portal",
    description:
      "Replace chaotic WhatsApp & email attachments with structured client document checklists, instant verification, and automatic client follow-ups.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DocuCollect — Client Document Collection Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocuCollect — Secure Client Document Collection Portal",
    description:
      "Collect client documents via WhatsApp links with structured checklists and CA review dashboard.",
    creator: "@docucollect",
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
  name: "DocuCollect",
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#fafafa] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
