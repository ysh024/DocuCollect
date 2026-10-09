import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = readFileSync('.env.local', 'utf-8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch {}
}

if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  console.log('Creating public.checklist_templates table...');
  await sql`
    CREATE TABLE IF NOT EXISTS public.checklist_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'General',
      description TEXT,
      requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_system BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON public.checklist_templates(organization_id);
  `;
  console.log('Table and index verified!');

  const existing = await sql`SELECT count(*) FROM public.checklist_templates WHERE is_system = true;`;
  const count = parseInt(existing[0].count, 10);
  console.log('Existing system templates count:', count);

  if (count === 0) {
    console.log('Seeding initial default templates...');
    const defaultTemplates = [
      {
        name: 'ITR Filing (Individuals & Professionals)',
        service_type: 'ITR Filing',
        description: 'Standard checklist for salaried and professional income tax returns.',
        requirements: JSON.stringify([
          { name: 'PAN Card', description: 'Scanned photo or PDF of PAN card.', is_required: true },
          { name: 'Aadhaar Card', description: 'Front & back of Aadhaar card.', is_required: true },
          { name: 'Form 16 (Part A & B)', description: 'Salary TDS certificate issued by employer.', is_required: true },
          { name: 'Bank Statements (12 Months)', description: 'Bank statement for FY from 1st April to 31st March.', is_required: true },
          { name: 'Capital Gains Tax Statement', description: 'Annual stock and mutual fund trading statement (if applicable).', is_required: false },
          { name: 'Housing Loan Interest Certificate', description: 'Interest and principal repayment certificate (if applicable).', is_required: false }
        ])
      },
      {
        name: 'GST Registration Dossier',
        service_type: 'GST Registration',
        description: 'Mandatory documentation for new GSTIN registration for proprietor / partnership / company.',
        requirements: JSON.stringify([
          { name: 'PAN Card of Business / Proprietor', description: 'Clear copy of PAN card.', is_required: true },
          { name: 'Aadhaar Card of Promoters', description: 'KYC document of authorized signatory.', is_required: true },
          { name: 'Electricity Bill of Premises', description: 'Recent utility bill (under 2 months old).', is_required: true },
          { name: 'Rent Agreement / NOC', description: 'Registered rent agreement with owner NOC.', is_required: true },
          { name: 'Cancelled Cheque / Bank Statement', description: 'Bank proof containing IFSC and account number.', is_required: true }
        ])
      },
      {
        name: 'Home Loan / Mortgage Dossier',
        service_type: 'Home Loan Dossier',
        description: 'Complete borrower KYC, financial proofs, and title document set for banking appraisal.',
        requirements: JSON.stringify([
          { name: 'Applicant KYC (PAN & Aadhaar)', description: 'Self-attested identity and address proof.', is_required: true },
          { name: 'Last 3 Months Salary Slips', description: 'Computerized payslips with company seal.', is_required: true },
          { name: 'Last 6 Months Bank Statement', description: 'Salary credit bank account statement.', is_required: true },
          { name: 'Form 16 & 3 Years ITR-V', description: 'Tax acknowledgment for past 3 financial years.', is_required: true },
          { name: 'Property Title Deeds / Agreement to Sell', description: 'Complete chain of title documents.', is_required: true }
        ])
      },
      {
        name: 'Company / LLP Incorporation',
        service_type: 'Company Incorporation',
        description: 'MCA compliance pack for DIN, DSC, and SPICe+ company registration.',
        requirements: JSON.stringify([
          { name: 'Director Identity Proof (PAN / Passport)', description: 'Self-attested identity documents for all directors.', is_required: true },
          { name: 'Director Address Proof (Bank Statement / Utility)', description: 'Statement under 2 months old with current address.', is_required: true },
          { name: 'Registered Office Proof (Electricity Bill + NOC)', description: 'Latest electricity bill and owner consent NOC.', is_required: true },
          { name: 'Director Passport Size Photos', description: 'Clear studio photographs with white background.', is_required: true }
        ])
      },
      {
        name: 'Visa & Immigration Document Pack',
        service_type: 'Visa & Immigration',
        description: 'Proof of funds, employment, travel itinerary, and consular KYC.',
        requirements: JSON.stringify([
          { name: 'Valid Passport (All Pages)', description: 'Current passport with at least 6 months remaining validity.', is_required: true },
          { name: 'Last 6 Months Bank Statement with Stamp', description: 'Original bank statement with branch stamp & seal.', is_required: true },
          { name: 'Employment Letter & NOC', description: 'Letter from employer detailing role, salary, and leave approval.', is_required: true },
          { name: '3 Years ITR Acknowledgment', description: 'ITR-V acknowledgment for past three assessment years.', is_required: true },
          { name: 'Travel Itinerary & Hotel Booking', description: 'Flight reservation and lodging confirmation.', is_required: false }
        ])
      },
      {
        name: 'Statutory & Tax Audit File',
        service_type: 'Statutory Audit',
        description: 'Audit schedules, balance confirmations, fixed assets, and statutory dues.',
        requirements: JSON.stringify([
          { name: 'Trial Balance & Financial Statements', description: 'Full year trial balance with grouping schedules.', is_required: true },
          { name: 'Bank Confirmation & Year-end Statements', description: 'Bank balance confirmation letters and closing statements.', is_required: true },
          { name: 'Fixed Asset Register', description: 'Depreciation schedule and additions/deletions during the year.', is_required: true },
          { name: 'Statutory Dues Payment Proofs (PF/ESI/GST)', description: 'Challans and proof of payment before due date.', is_required: true }
        ])
      }
    ];

    for (const t of defaultTemplates) {
      try {
        await sql`
          INSERT INTO public.checklist_templates (name, service_type, description, requirements, is_system)
          VALUES (${t.name}, ${t.service_type}, ${t.description}, ${t.requirements}::jsonb, true);
        `;
        console.log(`+ Seeded: ${t.name}`);
      } catch (err: any) {
        console.warn(`! Skipped ${t.name}:`, err.message);
      }
    }
    console.log('Seeding finished!');
  }
}

main().then(() => console.log('All done!')).catch(console.error);
