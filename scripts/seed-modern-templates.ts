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

export interface SeedTemplate {
  name: string;
  service_type: string;
  description: string;
  requirements: { name: string; description: string; is_required: boolean }[];
}

export const MODERN_TEMPLATES: SeedTemplate[] = [
  // ==========================================
  // 1. TAXATION & RETURNS
  // ==========================================
  {
    name: 'ITR-1 (Salaried Individual Return)',
    service_type: 'Taxation & Returns',
    description: 'Standard checklist for salaried professionals with salary income, house property, and other sources.',
    requirements: [
      { name: 'Form 16 (Part A & B)', description: 'Salary TDS certificate issued by employer', is_required: true },
      { name: 'PAN Card', description: 'Self-attested identity proof', is_required: true },
      { name: 'Aadhaar Card', description: 'Linked with PAN for e-verification', is_required: true },
      { name: 'Bank Statements (Full FY - 12 Months)', description: 'All operational savings accounts', is_required: true },
      { name: 'Form 26AS & AIS / TIS Summary', description: 'Tax credit and Annual Information Statement from IT portal', is_required: true },
      { name: 'Rent Receipts / Landlord PAN', description: 'For HRA tax exemption claim', is_required: false },
      { name: 'Housing Loan Certificate (Interest & Principal)', description: 'Section 24b and 80C deductions', is_required: false },
      { name: 'Deduction Proofs (PPF, ELSS, Insurance, 80D Mediclaim)', description: 'Chapter VI-A tax-saving investment receipts', is_required: false },
    ],
  },
  {
    name: 'ITR-3 / ITR-4 (Business & Professional Returns)',
    service_type: 'Taxation & Returns',
    description: 'Checklist for consultants, freelancing professionals, proprietorships, and presumptive tax filers (44AD / 44ADA).',
    requirements: [
      { name: 'Form 26AS & AIS / TIS Summary', description: 'Annual Information Statement & Tax Credit ledger', is_required: true },
      { name: 'Bank Statements (All Current & Savings Accounts)', description: 'Full 12-month statements for all business & personal accounts', is_required: true },
      { name: 'Balance Sheet & Profit & Loss Statement', description: 'Or gross receipts summary for presumptive filing', is_required: true },
      { name: 'PAN Card & Aadhaar Card of Proprietor', description: 'Identity verification for e-filing portal', is_required: true },
      { name: 'GST Sales & Purchase Reconciliation (GSTR-1 vs 3B)', description: 'Turnover reconciliation matching income tax records', is_required: true },
      { name: 'Advance Tax & Self-Assessment Challans', description: 'Tax payment receipts before 31st March', is_required: false },
      { name: 'Depreciation Schedule & Asset Purchase Bills', description: 'Computers, office equipment, machinery additions', is_required: false },
    ],
  },
  {
    name: 'NRI Income Tax Return & Foreign Assets',
    service_type: 'Taxation & Returns',
    description: 'Documentation for Non-Resident Indians with Indian income, NRE/NRO interest, property sales, and DTAA relief.',
    requirements: [
      { name: 'Valid Passport (With Immigration & Exit/Entry Stamps)', description: 'Required to calculate physical residency days in India', is_required: true },
      { name: 'NRE & NRO Bank Statements (Full 12 Months)', description: 'Interest certificates for taxable NRO interest', is_required: true },
      { name: 'PAN Card', description: 'Indian permanent account number', is_required: true },
      { name: 'Tax Residency Certificate (TRC) from Country of Residence', description: 'Required to claim Double Taxation Avoidance Agreement (DTAA) benefits', is_required: false },
      { name: 'Form 67 (Foreign Tax Credit Statement)', description: 'Relief claimed under Section 90/91', is_required: false },
      { name: 'Property Sale Deed & TDS Challan (Form 16B)', description: 'If real estate was sold in India with 20% NRI TDS', is_required: false },
    ],
  },
  {
    name: 'Capital Gains Tax File (Property & Equities)',
    service_type: 'Taxation & Returns',
    description: 'Checklist for computing and filing short-term and long-term capital gains on shares, mutual funds, or real estate.',
    requirements: [
      { name: 'Annual Capital Gains Statement from Broker', description: 'CAMS, KFintech, Zerodha, Groww, or broker tax P&L statement', is_required: true },
      { name: 'Property Purchase Deed & Registered Sale Deed', description: 'Both original purchase deed and recent sale deed', is_required: false },
      { name: 'Cost of Improvement Bills & Construction Invoices', description: 'Eligible for indexation benefit under Section 48', is_required: false },
      { name: 'Section 54 / 54EC Exemption Receipts', description: 'Capital gains bonds (NHAI/REC) or new residential house purchase deed', is_required: false },
      { name: 'Bank Statement Showing Sale Consideration Credit', description: 'Proof of actual funds realization in bank account', is_required: true },
    ],
  },

  // ==========================================
  // 2. GST COMPLIANCE
  // ==========================================
  {
    name: 'New GST Registration Dossier',
    service_type: 'GST Compliance',
    description: 'Mandatory documentation for obtaining a new GSTIN for Proprietor, Partnership, LLP, or Private Limited Company.',
    requirements: [
      { name: 'PAN Card of Business / Proprietor / Entity', description: 'Clear color scan of company or proprietor PAN card', is_required: true },
      { name: 'Aadhaar Card of Promoters & Authorized Signatory', description: 'Required for mandatory Aadhaar authentication during registration', is_required: true },
      { name: 'Electricity Bill of Premises (< 2 Months Old)', description: 'Utility bill matching the exact registered business address', is_required: true },
      { name: 'Rent Agreement & Owner No-Objection Certificate (NOC)', description: 'Registered agreement or consent letter from property owner', is_required: true },
      { name: 'Cancelled Cheque / Bank Statement with IFSC', description: 'Bank proof showing account number, entity name, and IFSC', is_required: true },
      { name: 'Passport Size Photograph of Signatory', description: 'White background studio photo under 100 KB', is_required: true },
      { name: 'Board Resolution / Letter of Authorization', description: 'Appointing authorized signatory (for Co/LLP/Firm)', is_required: false },
    ],
  },
  {
    name: 'GST Annual Return & Reconciliation (GSTR-9 & 9C)',
    service_type: 'GST Compliance',
    description: 'Comprehensive audit schedules and reconciliation documentation for filing annual GST returns.',
    requirements: [
      { name: 'Audited Financial Statements (Balance Sheet & P&L)', description: 'Audited books matching the GST financial year', is_required: true },
      { name: 'Monthly GSTR-1 & GSTR-3B Summary Reports (12 Months)', description: 'Filed return acknowledgment copies for all tax periods', is_required: true },
      { name: 'GSTR-2B vs Books Input Tax Credit (ITC) Reconciliation', description: 'Vendor-wise credit mismatch and ineligible ITC reconciliation', is_required: true },
      { name: 'E-Way Bill & E-Invoice Register Summary', description: 'Delivery proofs matching outward supplies ledger', is_required: false },
      { name: 'Electronic Cash & Credit Ledger Extracts', description: 'Closing balance statement as of 31st March', is_required: true },
    ],
  },
  {
    name: 'GST Refund Application (Export / Inverted Duty)',
    service_type: 'GST Compliance',
    description: 'Supporting evidence required for claiming accumulated ITC or export refunds under GST without payment of tax.',
    requirements: [
      { name: 'Export Invoices & Corresponding Shipping Bills', description: 'Matching customs shipping bills / bill of export', is_required: true },
      { name: 'Bank Realization Certificate (BRC) / FIRC Proof', description: 'Foreign inward remittance certificate for service exports', is_required: true },
      { name: 'Purchase Invoices Matching GSTR-2B', description: 'Invoices for inward supplies on which refund is claimed', is_required: true },
      { name: 'Undertaking & Non-Prosecution Affidavit', description: 'Declaration under GST rules on non-debarred status', is_required: true },
      { name: 'Refund Calculation Sheet & Statement 1 / 1A', description: 'Formula-based eligible refund computation schedule', is_required: true },
    ],
  },

  // ==========================================
  // 3. BANKING & LOANS
  // ==========================================
  {
    name: 'Home Loan & Mortgage Dossier',
    service_type: 'Banking & Loans',
    description: 'Complete borrower KYC, income eligibility, and 30-year property title document set for banking appraisal.',
    requirements: [
      { name: 'Applicant & Co-Applicant KYC (PAN & Aadhaar)', description: 'Self-attested identity and current residence address proof', is_required: true },
      { name: 'Last 3 Months Computerized Salary Slips', description: 'Computerized payslips bearing company seal & HR signature', is_required: true },
      { name: 'Last 6 Months Salary Bank Statement', description: 'Statement from salary credit account in official PDF format', is_required: true },
      { name: 'Latest Form 16 (Part A & B) & 3 Years ITR-V', description: 'Income tax acknowledgments for the past three financial years', is_required: true },
      { name: 'Property Chain of Title Deeds & Agreement to Sell', description: 'Registered sale deed, allotment letter, or agreement to sell', is_required: true },
      { name: 'Approved Building Plan & Occupancy Certificate / NOC', description: 'Sanctioned layout plan and local municipal approvals', is_required: false },
      { name: 'Processing Fee Cheque & Signed Loan Application Form', description: 'Bank mandate form', is_required: true },
    ],
  },
  {
    name: 'Business Loan & Working Capital (OD / CC Limit)',
    service_type: 'Banking & Loans',
    description: 'Commercial credit appraisal dossier for Cash Credit (CC), Overdraft (OD), or Term Loan approvals.',
    requirements: [
      { name: '3 Years Audited Balance Sheet & P&L with Audit Report', description: 'Full financials with notes to accounts and tax audit report', is_required: true },
      { name: '12 Months Bank Statements (All Current & CC/OD Accounts)', description: 'Complete banking statements of all entity accounts', is_required: true },
      { name: 'Last 12 Months GSTR-3B Return Copies', description: 'Proof of business turnover matching banking inflows', is_required: true },
      { name: 'CMA Data (Credit Monitoring Arrangement) & Project Report', description: 'Past performance and 3-year projected cash flow forecast', is_required: true },
      { name: 'KYC of All Directors / Partners / Promoters', description: 'PAN Card, Aadhaar Card, and residence utility bills of promoters', is_required: true },
      { name: 'Sanction Letters of All Existing Loans', description: 'Repayment track records and loan amortization schedules', is_required: false },
      { name: 'Collateral Property Title Deeds & Valuation Report', description: 'If mortgaged security is offered to bank', is_required: false },
    ],
  },
  {
    name: 'Personal Loan & Vehicle Loan KYC',
    service_type: 'Banking & Loans',
    description: 'Fast-track underwriting document set for unsecured personal loans and auto financing.',
    requirements: [
      { name: 'Applicant PAN Card & Aadhaar Card', description: 'Primary identity and address verification', is_required: true },
      { name: 'Last 3 Months Salary Slips', description: 'Proof of current employment and monthly net pay', is_required: true },
      { name: 'Last 6 Months Bank Statement', description: 'Operating savings/salary account showing salary credits', is_required: true },
      { name: 'Current Residence Proof (Electricity Bill / Rent Agreement)', description: 'Current residence verification document under 2 months old', is_required: true },
      { name: 'Vehicle Proforma Invoice / Dealer Quotation', description: 'Applicable for car or two-wheeler auto loan applications', is_required: false },
    ],
  },

  // ==========================================
  // 4. CORPORATE & LEGAL
  // ==========================================
  {
    name: 'Private Limited / OPC Incorporation (SPICe+)',
    service_type: 'Corporate & Legal',
    description: 'MCA compliance pack for obtaining DIN, DSC, PAN, TAN, and Certificate of Incorporation via SPICe+ Part A/B.',
    requirements: [
      { name: 'PAN & Identity Proof of All Directors (Passport/Voter ID)', description: 'Self-attested identity proof for all proposed directors', is_required: true },
      { name: 'Address Proof of Directors (Bank Statement / Mobile Bill < 2 Months)', description: 'Statement bearing current address under 60 days old', is_required: true },
      { name: 'Passport Size Photograph of Directors', description: 'Recent studio photograph with plain white background', is_required: true },
      { name: 'Registered Office Electricity Bill (< 2 Months Old)', description: 'Utility bill of proposed company registered office', is_required: true },
      { name: 'Owner No-Objection Certificate (NOC) & Rent Agreement', description: 'Consent from premises owner allowing company registration', is_required: true },
      { name: 'Digital Signature Certificate (DSC) Application Form', description: 'Class 3 DSC verification form for signing director', is_required: true },
    ],
  },
  {
    name: 'LLP Registration & Agreement Filing',
    service_type: 'Corporate & Legal',
    description: 'Ministry of Corporate Affairs documentation for Limited Liability Partnership formation and Form 3 filing.',
    requirements: [
      { name: 'Designated Partners KYC (PAN Card & Aadhaar/Passport)', description: 'Self-attested partner identification and address proof', is_required: true },
      { name: 'Registered Office Electricity Bill & Owner NOC', description: 'Utility proof and consent from premises landlord', is_required: true },
      { name: 'Draft LLP Agreement (Form 3 Filing)', description: 'Draft agreement on requisite stamp paper detailing partner rights & profit share', is_required: true },
      { name: 'Contribution & Capital Ratio Proof', description: 'Bank payment receipts of capital introduction', is_required: false },
    ],
  },
  {
    name: 'MSME / Udyam Registration & Startup India',
    service_type: 'Corporate & Legal',
    description: 'Documentation for government subsidies, priority bank lending, and DPIIT tax exemptions.',
    requirements: [
      { name: 'Enterprise PAN Card', description: 'Proprietorship, Firm, or Company PAN card', is_required: true },
      { name: 'Aadhaar Card of Entrepreneur / Authorized Signatory', description: 'Linked with mobile number for OTP e-verification', is_required: true },
      { name: 'Cancelled Cheque / Bank Account Details', description: 'Official bank account linked with enterprise', is_required: true },
      { name: 'Plant & Machinery / Equipment Investment Proof', description: 'Original cost proof or depreciation schedule', is_required: true },
      { name: 'Audited Turnover Certificate / Past ITR Acknowledgments', description: 'To establish micro, small, or medium classification', is_required: false },
    ],
  },
  {
    name: 'Trademark & Brand Protection (IP India)',
    service_type: 'Corporate & Legal',
    description: 'Checklist for filing trademark applications (Form TM-A) with the Controller General of Patents, Designs & Trademarks.',
    requirements: [
      { name: 'High-Resolution Brand Logo / Wordmark Image', description: 'Clean graphic file without watermark', is_required: true },
      { name: 'Form TM-48 (Power of Attorney)', description: 'Authorizing trademark attorney/agent to file on behalf of applicant', is_required: true },
      { name: 'User Affidavit with Proof of First Use Date in India', description: 'Invoices, advertising, website showing continuous commercial use', is_required: false },
      { name: 'MSME / Udyam Certificate (For 50% Govt Fee Rebate)', description: 'To claim statutory fee concession of Rs. 4,500 vs 9,000', is_required: false },
      { name: 'Applicant Identity & Business Address Proof', description: 'Certificate of incorporation or applicant KYC', is_required: true },
    ],
  },

  // ==========================================
  // 5. VISA & IMMIGRATION
  // ==========================================
  {
    name: 'Student Visa Dossier (USA / UK / Canada / Aus / EU)',
    service_type: 'Visa & Immigration',
    description: 'Financial solvency, academic history, and sponsor documentation for embassy student visa approval.',
    requirements: [
      { name: 'Valid Passport (All Pages with Prior Stamps)', description: 'Passport with at least 12 months remaining validity', is_required: true },
      { name: 'University Offer Letter & I-20 / CAS / COE Letter', description: 'Official admission letter confirming student enrollment', is_required: true },
      { name: 'Academic Marksheets, Degrees & IELTS / GRE Scorecard', description: 'Standardized language and academic certificates', is_required: true },
      { name: 'Chartered Accountant (CA) Net Worth & Wealth Valuation Report', description: 'Certified report establishing sponsor liquid and immovable assets', is_required: true },
      { name: 'Last 6 Months Bank Statement with Branch Stamp & Seal', description: 'Original statement demonstrating required tuition & living funds', is_required: true },
      { name: 'Sponsor Affidavit of Support & 3 Years ITR-V', description: 'Affidavit with tax returns of parents/sponsor', is_required: true },
      { name: 'Loan Sanction Letter / Fixed Deposit Receipts', description: 'Education loan approval or verified liquid deposits', is_required: false },
    ],
  },
  {
    name: 'Tourist / Visitor Visa Dossier',
    service_type: 'Visa & Immigration',
    description: 'Proof of strong economic ties, funds, and travel itinerary for consular tourist visa applications.',
    requirements: [
      { name: 'Valid Passport (Minimum 6 Months Validity)', description: 'Passport with at least two blank visa pages', is_required: true },
      { name: 'Last 6 Months Bank Statement with Official Bank Stamp', description: 'Healthy balance matching length of stay', is_required: true },
      { name: 'Employment Letter & Leave Approval NOC from Employer', description: 'Confirming designation, monthly salary, and approved leave dates', is_required: true },
      { name: 'Past 3 Years Income Tax Returns (ITR-V Acknowledgments)', description: 'Proof of regular income and tax compliance in home country', is_required: true },
      { name: 'Confirmed Round-Trip Flight Itinerary & Hotel Booking', description: 'Travel dates matching requested visa duration', is_required: false },
      { name: 'Covering Letter Detailing Travel Purpose & Day-wise Plan', description: 'Personal letter addressed to the Visa Officer', is_required: true },
    ],
  },

  // ==========================================
  // 6. AUDITS & COMPLIANCE
  // ==========================================
  {
    name: 'Statutory Audit & Tax Audit (Form 3CD)',
    service_type: 'Audits & Compliance',
    description: 'Comprehensive documentation dossier for annual ICAI statutory audit and income tax compliance under Section 44AB.',
    requirements: [
      { name: 'Final Trial Balance & Grouping Schedules', description: 'Complete ledger balances as of 31st March with notes', is_required: true },
      { name: 'Bank Confirmation Letters & Year-End Bank Statements', description: 'Direct confirmation from banks and all 12-month statements', is_required: true },
      { name: 'Fixed Asset Register with Depreciation Schedule', description: 'Additions, disposals, and physical verification schedule', is_required: true },
      { name: 'Statutory Dues Payment Proofs (PF, ESIC, TDS, GST Challans)', description: 'All challans paid on or before statutory due dates', is_required: true },
      { name: 'Inventory Valuation Certificate & Physical Stock Sheets', description: 'Closing inventory valuation as per AS-2 / Ind AS-2', is_required: true },
      { name: 'Related Party Disclosures & Director Interest Disclosures', description: 'Form MBP-1 and related party ledger summaries', is_required: false },
      { name: 'Legal & Professional Expense Ledger with TDS Verification', description: 'Invoices exceeding statutory thresholds', is_required: true },
    ],
  },
  {
    name: 'HR Onboarding & Background Verification (BGV)',
    service_type: 'Audits & Compliance',
    description: 'Standard employee onboarding verification pack for employment history, education, and credential validation.',
    requirements: [
      { name: 'Government ID Proof (PAN Card & Aadhaar Card)', description: 'Identity and citizenship verification', is_required: true },
      { name: 'Relieving Letter & Experience Letters from Previous Employers', description: 'Formal service certificates confirming tenure and designation', is_required: true },
      { name: 'Last 3 Months Salary Slips & Bank Credit Proof', description: 'Payslips and corresponding salary account credit entries', is_required: true },
      { name: 'Highest Education Degree Certificate & Final Marksheet', description: 'Degree convocation or provisional passing certificate', is_required: true },
      { name: 'Permanent & Current Address Proof', description: 'Utility bill, passport, or rent agreement', is_required: true },
      { name: 'Passport Size Photograph & Signed Code of Conduct Form', description: 'Official company compliance undertaking', is_required: true },
    ],
  },
];

async function main() {
  console.log('Seeding Modern Industry-Standard Templates into Neon Database...');
  
  // Clean up old default system templates so they get refreshed with complete updated requirements
  await sql`DELETE FROM public.checklist_templates WHERE is_system = true;`;
  console.log('Cleared old system templates.');

  let inserted = 0;
  for (const t of MODERN_TEMPLATES) {
    try {
      await sql`
        INSERT INTO public.checklist_templates (
          name, service_type, description, requirements, is_system
        ) VALUES (
          ${t.name},
          ${t.service_type},
          ${t.description},
          ${JSON.stringify(t.requirements)}::jsonb,
          true
        );
      `;
      console.log(`+ Added [${t.service_type}]: ${t.name} (${t.requirements.length} docs)`);
      inserted++;
    } catch (err: any) {
      console.error(`- Failed to insert ${t.name}:`, err.message);
    }
  }

  console.log(`\nSuccessfully seeded ${inserted} modern checklist templates across 6 categories!`);
}

main().catch(console.error);
