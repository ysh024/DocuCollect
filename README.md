# DocuCollect — Client Document Collection Portal

> **The modern, secure client document collection portal for Chartered Accountants (CAs), Tax Consultants, Law Firms, and Financial Advisors.**  
> Stop chasing clients over WhatsApp and unorganized email threads. Collect, track, and verify client files with encrypted 1-click links and structured checklists.

---

## 📑 Table of Contents
1. [Overview & The Problem](#-overview--the-problem)
2. [What DocuCollect Does](#-what-docucollect-does)
3. [How DocuCollect Works (End-to-End Workflow)](#-how-docucollect-works-end-to-end-workflow)
4. [Key Features & Capabilities](#-key-features--capabilities)
5. [System Architecture](#-system-architecture)
6. [Technology Stack](#-technology-stack)
7. [Directory & File Structure](#-directory--file-structure)
8. [Database & Storage Architecture](#-database--storage-architecture)
9. [Environment Configuration](#-environment-configuration)
10. [Local Development Setup](#-local-development-setup)
11. [Deployment & Production Build](#-deployment--production-build)
12. [Security, Privacy & Retention Policies](#-security-privacy--retention-policies)

---

## 🎯 Overview & The Problem

Tax consultants, advocates, and advisory agencies in India frequently manage hundreds of client files simultaneously (e.g., ITR-V, GSTR-3B, Bank Statements, PAN, Aadhaar, Balance Sheets). Historically, these documents arrive through informal channels:

| Traditional Workflow (The Problem) | With DocuCollect (The Solution) |
| :--- | :--- |
| **WhatsApp Media Dumps:** Uncompressed or blurry photos scattered across conversations; easily lost when changing phones. | **Structured Checklists:** Pre-configured item checklists with clear mandatory/optional badges. |
| **Login & Password Friction:** Requiring clients to download an app or register an account causes high drop-off. | **Zero-Login Links:** Clients click a secure link and upload directly from their phone camera or laptop with **no account required**. |
| **Endless Email Ping-Pong:** "You missed page 3 of the bank statement" buried in long email threads. | **Instant Review & Feedback:** CA approves or rejects files with pre-built rejection reason templates in 1 click. |
| **Storage & Data Hoarding Risks:** Sensitive financial records stored indefinitely on local hard drives. | **Auto-Purge Security:** Files are automatically deleted from S3 storage after retention periods (7, 30, or 90 days). |
| **Messy File Storage:** Documents saved haphazardly across arbitrary desktop folders. | **In-Grid Client Dossier & Vault:** Every client's cases and uploaded documents organized neatly in a responsive inline grid. |

---

## ⚡ What DocuCollect Does

DocuCollect provides a unified, multi-tenant workspace where professionals can:
1. **Onboard Clients:** Create and maintain client dossiers with contact information, firm names, and notes.
2. **Launch Cases in <60 Seconds:** Select pre-built checklist templates (e.g. *Individual ITR Filing*, *GST Audit FY 2025-26*, *Company Incorporation*) or craft custom checklists.
3. **Dispatch WhatsApp-Ready Upload Links:** One click generates an encrypted, single-use upload link ready to send via WhatsApp Web Click-to-Chat or email.
4. **Delight Clients with a Zero-Friction Portal:** Clients view an intuitive 4-color status dashboard, snap photos or upload PDFs, and ask questions directly on individual items.
5. **Verify Files Rapidly:** View in-browser PDF and image previews, approve valid files, or reject invalid files with helpful guidance.
6. **Protect Client Data with Automated Retention:** Lean object storage automatically purges verified documents after the plan retention window expires.
7. **Manage Subscriptions & Billing:** Enjoy an automatic 30-day Free Trial with direct UPI payment flows and admin voucher unlocks.

---

## 🔄 How DocuCollect Works (End-to-End Workflow)

```mermaid
flowchart LR
    A["1. Create Case\n& Checklist"] --> B["2. Share WhatsApp\nUpload Link"]
    B --> C["3. Client Uploads\n(Zero Passwords)"]
    C --> D["4. Instant CA Review\n& Verification"]
    D --> E["5. In-Grid Vault\n& Dossier Storage"]
    E --> F["6. Auto-Purge\nRetention Cleanup"]
```

### Step 1: Case & Checklist Creation
The consultant logs into `/dashboard` and creates a case for a client. They choose a standard template (e.g., GST Audit) or add custom requirements (e.g., "12 Months Bank Statements", "Signed GSTR-3B").

### Step 2: Encrypted Link Sharing
DocuCollect generates a cryptographically hashed token (`nanoid(32)` / SHA-256). The consultant clicks **"Share via WhatsApp"** or **"Copy Link"** to send `https://yourdomain.com/upload/[token]` directly to the client.

### Step 3: Zero-Login Client Upload
The client taps the link on their mobile phone or PC. They do not log in. They see a clean checklist:
- **Red / Action Needed:** Items requiring immediate upload or files rejected by the CA.
- **Amber / In Review:** Files uploaded and awaiting verification.
- **Green / Approved:** Verified files.  
The client snaps photos with their smartphone camera or uploads PDFs. Files stream directly to private S3 object storage via presigned URLs.

### Step 4: CA Review & Feedback
The consultant opens the case in their dashboard. They preview documents in an in-browser viewer.
- **Approve:** One click marks the item approved. When all required files are approved, the case automatically transitions to `completed`.
- **Reject:** One click presents standard rejection reasons (e.g., *Blurry scan*, *Password-protected PDF*, *Wrong assessment year*). The client's portal immediately updates.

### Step 5: In-Grid Client Dossier & Vault
In `/dashboard/clients`, the consultant can expand any client row to view their **In-Grid Dossier**:
- View all associated cases and progress bars.
- Access the **Document Vault** with direct download links and retention expiry dates.
- Switch between side-by-side or tabbed grid views with zero disruptive popup modals.

### Step 6: Automated Purge Lifecycle
Depending on the consultant's plan (Free: 7 days, Starter: 30 days, Pro: 90 days), automated background cron jobs permanently delete old files from S3 storage, keeping databases lightweight and compliant.

---

## ✨ Key Features & Capabilities

- **📲 1-Click WhatsApp Link Sharing:** Generates custom WhatsApp Web click-to-chat links with pre-filled greeting and upload link.
- **📱 Mobile-First Client Portal:** Designed for seamless mobile scanning with camera integration, drag-and-drop, and real-time status counters.
- **📋 Checklist Template Library:** Pre-configured templates for CAs, tax consultants, and law firms (ITR, GST, Audit, KYC).
- **📂 In-Grid Client Vault:** Embedded responsive dossier that organizes cases and uploaded files directly in the client table with zero popups.
- **🔍 In-Browser Document Previewer:** Instant full-screen PDF and image inspection drawer with zoom and rotation controls.
- **💬 Document-Level Query Channel:** Clients can leave notes or questions directly on individual checklist items.
- **🔒 5-Layer Security & Multi-Tenancy:** Strict organization isolation, cryptographic upload link hashing, and edge route guards.
- **☁️ Direct S3 Presigned Uploads:** Files stream directly to Neon S3 storage without consuming server memory.
- **🧹 Automated Auto-Purge Lifecycle:** Scheduled cron task (`/api/cron/cleanup`) deletes expired files.
- **🌓 Universal Light & Dark Mode:** Interactive 1-click theme switcher with contrast-compliant color tokens across the entire application.
- **🛡️ Super Admin Control Center (`/admin`):** Manage registered consultants, track trial expirations, lock/unlock accounts, and generate single-use subscription voucher keys.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Devices"]
        MobileClient["Client (Smartphone / Tablet)\n/upload/[token]\n(Zero Login)"]
        CAPortal["CA / Advisor Dashboard\n/dashboard/*\n(Session Guarded)"]
        AdminView["Super Admin Panel\n/admin\n(Role Guarded)"]
    end

    subgraph AppRouter ["Next.js 15 App Router & Server Actions"]
        EdgeAuth["Middleware Session Guard\nsrc/middleware.ts"]
        ActionsAuth["Auth Actions\nsrc/app/actions/auth.ts"]
        ActionsPortal["Portal & Dossier Actions\nsrc/app/actions/portal.ts"]
        ActionsTemplate["Checklist Actions\nsrc/app/actions/templates.ts"]
        APICron["Retention Purge Cron\nsrc/app/api/cron/cleanup"]
        APIDownload["Presigned S3 Downloader\nsrc/app/api/download"]
    end

    subgraph DataTier ["Cloud Infrastructure"]
        PostgresDB[("Neon Serverless PostgreSQL\n- Pooled Connections\n- Row-Level Security\n- Audit Triggers")]
        S3Storage[("Neon S3 Object Storage\n- Multi-Tenant Paths\n- Presigned Streaming")]
    end

    MobileClient --> EdgeAuth
    CAPortal --> EdgeAuth
    AdminView --> EdgeAuth

    EdgeAuth --> AppRouter
    ActionsPortal --> PostgresDB
    ActionsPortal --> S3Storage
    ActionsAuth --> PostgresDB
    APICron --> S3Storage
    APICron --> PostgresDB
    APIDownload --> S3Storage
```

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | [Next.js 15.5](https://nextjs.org/) | App Router, Server Actions, Route Handlers |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/) | Responsive UI, custom Light/Dark theme system |
| **Icons & Design** | [Lucide React](https://lucide.dev/) | Clean, consistent vector icon set |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) | Connection pooling via `@neondatabase/serverless` |
| **Object Storage** | [Neon S3 Object Storage](https://neon.tech/docs/introduction/object-storage) | S3 API streaming via `@aws-sdk/client-s3` |
| **Authentication** | Hybrid Auth Engine | Neon Better Auth (Google OAuth) + Salted Bcrypt + JWT |
| **Security & Tokens** | Node.js `crypto` & `jose` | SHA-256 token hashing, stateless signed JWT cookies |
| **Validation** | [Zod 3.24](https://zod.dev/) | Strict runtime schema validation |
| **SEO & Discovery** | Next.js Metadata API | Dynamic `sitemap.ts`, `robots.ts`, Open Graph, JSON-LD |

---

## 📁 Directory & File Structure

```
DocuCollect/
├── .env.example                     # Environment template
├── .env.local                       # Active local secrets & database credentials
├── architecture_specification.md    # Exhaustive system architecture document
├── DATABASE_ARCHITECTURE.md         # Database schema, RLS & security blueprint
├── package.json                     # Node.js dependencies & scripts
├── tailwind.config.ts               # Tailwind CSS theme & typography tokens
├── tsconfig.json                    # Strict TypeScript configuration
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with theme synchronization script
│   │   ├── page.tsx                 # High-converting public Landing Page
│   │   ├── globals.css              # Universal design tokens & dark mode rules
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # Sign In page (Email OTP & Google OAuth)
│   │   │   └── signup/page.tsx      # Sign Up page (30-day Free Trial)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Dashboard layout (Sidebar, Header, TrialGuard)
│   │   │   ├── page.tsx             # Overview: metric widgets, cases queue, alerts
│   │   │   ├── clients/page.tsx     # Client management & In-Grid Dossier/Vault
│   │   │   ├── cases/page.tsx       # Case management, checklist builder & link share
│   │   │   ├── billing/page.tsx     # Plan status, UPI payment info & voucher unlock
│   │   │   ├── templates/page.tsx   # Reusable checklist templates
│   │   │   ├── audit/page.tsx       # Organization audit logs & activity history
│   │   │   └── settings/page.tsx    # Organization branding, colors & firm profile
│   │   ├── upload/[token]/page.tsx  # Zero-login Client Upload Portal
│   │   ├── admin/page.tsx           # Super Admin Console (Users & Payments/Vouchers)
│   │   ├── pricing/page.tsx         # Detailed subscription pricing & FAQ
│   │   ├── terms/page.tsx           # Terms of Service
│   │   ├── privacy/page.tsx         # Privacy Policy & Data Protection Guarantee
│   │   ├── refund/page.tsx          # Refund & Billing Transparency Policy
│   │   ├── actions/
│   │   │   ├── auth.ts              # Server actions for email OTP, login, and signup
│   │   │   ├── portal.ts            # Server actions for cases, clients, reviews, upload
│   │   │   └── templates.ts         # Server actions for checklist templates
│   │   └── api/
│   │       ├── cron/cleanup/        # Auto-purge retention cron route
│   │       ├── download/            # Authenticated S3 file streaming route
│   │       └── admin/               # Super admin management endpoints
│   │
│   ├── components/
│   │   ├── auth/                    # OtpAuthView, social buttons, forgot password
│   │   ├── client-portal/           # InteractiveFileUpload, checklist cards
│   │   ├── dashboard/               # MetricCards, CaseReviewDrawer, TrialExpiryGuard
│   │   ├── shared/                  # Header, Sidebar, ProfileMenu
│   │   └── ui/                      # ThemeToggle, InfoPopover, Badges, Modals
│   │
│   ├── contexts/
│   │   ├── ThemeContext.tsx         # Dark / Light / System theme coordinator
│   │   └── DashboardDataContext.tsx # Cached multi-tenant dashboard state
│   │
│   ├── lib/
│   │   ├── auth/index.ts            # Session verification & JWT token minting
│   │   ├── db/index.ts              # Neon Serverless PostgreSQL connection singleton
│   │   ├── storage/index.ts         # Neon S3 Object Storage commands & presigners
│   │   ├── tokens.ts                # Cryptographic token generator & SHA-256 hasher
│   │   └── utils.ts                 # Formatting utilities, cn helper, status badges
│   │
│   └── types/
│       ├── database.types.ts        # Database schema TypeScript types
│       └── index.ts                 # Core application types & constants
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory based on `.env.example`:

```bash
# -----------------------------------------------------------------------------
# Neon Serverless PostgreSQL Connection String
# -----------------------------------------------------------------------------
DATABASE_URL=postgresql://username:password@ep-wild-snow-azyh1uu4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# -----------------------------------------------------------------------------
# Neon S3 Object Storage Credentials
# -----------------------------------------------------------------------------
AWS_ENDPOINT_URL_S3=https://storage.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-neon-s3-access-key
AWS_SECRET_ACCESS_KEY=your-neon-s3-secret-key
AWS_S3_BUCKET=docucollect-documents

# -----------------------------------------------------------------------------
# Application Authentication Secret (min 32 random characters)
# -----------------------------------------------------------------------------
AUTH_SECRET=your-secure-jwt-auth-secret-min-32-characters-long

# -----------------------------------------------------------------------------
# Public Application URL
# -----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -----------------------------------------------------------------------------
# Optional: Neon Managed Better Auth URL (for Google OAuth)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_NEON_AUTH_URL=https://ep-wild-snow-azyh1uu4.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth

# -----------------------------------------------------------------------------
# Background Cron Secret (for /api/cron/cleanup)
# -----------------------------------------------------------------------------
CRON_SECRET=your-secure-cron-secret-token
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js:** v18.18+ or v20+
- **Neon Account:** [neon.tech](https://neon.tech) (for Serverless PostgreSQL & S3 Storage)

### 2. Clone & Install
```bash
git clone https://github.com/ysh024/File-Organizor.git
cd File-Organizor
npm install
```

### 3. Database Migration
Run the initial SQL schema migrations against your Neon database using your Neon SQL console (refer to [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)).

### 4. Start Local Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Type-Check & Lint
```bash
# Verify TypeScript definitions
npx tsc --noEmit

# Run Next.js linter
npm run lint
```

---

## 📦 Deployment & Production Build

### Building for Production
```bash
npm run build
npm run start
```

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables defined above in the Vercel Project Settings.
4. Deploy! Next.js 15 App Router and Server Actions will run automatically on Vercel Serverless Functions.

---

## 🔒 Security, Privacy & Retention Policies

- **Zero Client Passwords:** Clients never create passwords, eliminating phishing, credential stuffing, and forgotten password inquiries.
- **Cryptographic Token Hashing:** Public upload links use cryptographically random 32-character tokens. Only SHA-256 hashes are stored in the database.
- **Presigned Direct Uploads:** Clients upload directly to private S3 buckets via short-lived (10-minute) presigned URLs.
- **Tenant Isolation:** All queries scope strictly by `organization_id`. Consultants can never access files or records belonging to other firms.
- **Automated Document Purging:** Files are permanently purged from S3 storage after the plan retention window (7–90 days).
- **Audit Trails:** Every event (*link generated*, *file uploaded*, *file approved*, *file rejected*) is permanently recorded in `activity_logs`.

---

## 📄 License & Intellectual Property

This project is proprietary software. All rights reserved. Built with pride for Indian professionals.
