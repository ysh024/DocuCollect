# DocuCollect — Client Document Collection Portal

> **Secure, structured client document collection with instant review, versioning, and WhatsApp sharing for Chartered Accountants, Tax Consultants, and Legal Advisors.**

---

## 🚀 Overview

**DocuCollect** is a modern SaaS platform designed to replace chaotic email threads and unorganized WhatsApp media dumps with a streamlined, encrypted document collection workflow. 

Consultants and Chartered Accountants can create cases, define document checklists, and generate secure one-click upload links. Clients receive mobile-friendly links via WhatsApp or email, where they can take photos of documents or upload PDFs without creating an account or remembering passwords.

---

## ✨ Key Features

- **📲 WhatsApp-Ready Secure Links:** Generate cryptographic, zero-trust upload links. Send them to clients via WhatsApp or email with a single tap.
- **📋 Structured Document Checklists:** Organize required documents (e.g., PAN Card, Aadhaar, Bank Statements, Form 16) with clear mandatory and optional tags.
- **🎨 High-Clarity Client Portal:**
  - **At-a-Glance Dashboard:** Instant counters for *Action Needed*, *In Review*, and *Approved*.
  - **4-Color Status System:** Bold visual indicators (Rose for corrections, Amber for pending, Blue for review, Emerald for approved).
  - **One-Tap Interactive Filters:** Clients can tap to view only the files they still need to upload.
  - **Mobile Camera Scan:** Clients can snap photos directly from their phone camera or select files/PDFs.
- **⚡ CA Review & Verification Dashboard:**
  - Instant file preview (PDFs, images).
  - One-click document approval.
  - Rejection with pre-built correction reason templates.
  - Automatic case status calculation (*Pending*, *Under Review*, *Completed*).
- **☁️ Neon S3 Object Storage Integration:**
  - High-performance direct streaming to S3 buckets.
  - Database remains fast and lightweight (no multi-megabyte binary bloat).
  - Secure presigned URLs with 1-hour automatic expiration.
- **🔒 Privacy & 7-Day Auto-Purge:**
  - Client documents are permanently purged 7 days after consultant verification on free tiers.
  - Zero client passwords means zero password leaks.
- **💬 Direct Client-Advisor Query Channel:** Clients can send notes or clarification questions regarding specific documents directly inside the portal.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Actions) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) with pooled connections |
| **Object Storage** | [Neon S3 Object Storage](https://neon.tech/docs/introduction/object-storage) (`@aws-sdk/client-s3`) |
| **Authentication** | Passwordless Email OTP & Google OAuth with [Jose](https://github.com/panva/jose) (JWT) |
| **Validation** | [Zod](https://zod.dev/) |
| **SEO & Discovery** | Dynamic `sitemap.ts`, `robots.ts`, Open Graph, JSON-LD Schema |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory based on `.env.example`:

```env
# Neon Serverless PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@ep-project-id.region.aws.neon.tech/dbname?sslmode=require

# Application Auth Secret (min 32 characters)
AUTH_SECRET=your-secret-key-at-least-32-characters-long

# Base App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth Credentials (Optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Neon S3 Object Storage
AWS_ENDPOINT_URL_S3=https://storage.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-neon-s3-access-key
AWS_SECRET_ACCESS_KEY=your-neon-s3-secret-key
AWS_S3_BUCKET=your-bucket-name
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or Node.js 20+
- A [Neon](https://neon.tech) account (for PostgreSQL and S3 Object Storage)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ysh024/File-Organizor.git
cd File-Organizor

# Install dependencies
npm install
```

### 3. Database Setup
Execute the initial schema migration in your Neon PostgreSQL SQL editor (see [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for complete schema documentation).

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔍 SEO & Discovery

- **Robots Directives:** [`src/app/robots.ts`](./src/app/robots.ts) allows public search indexing for marketing and pricing pages while strictly blocking search indexing on private dashboard and client upload URLs (`/dashboard/*`, `/upload/*`, `/api/*`).
- **Dynamic XML Sitemap:** [`src/app/sitemap.ts`](./src/app/sitemap.ts) auto-generates sitemaps for Google and Bing.
- **Open Graph & Twitter Cards:** Full rich previews for WhatsApp and social media link sharing.
- **Web App Manifest:** [`src/app/manifest.ts`](./src/app/manifest.ts) provides progressive web app install capabilities on mobile devices.

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
