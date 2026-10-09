-- =====================================================================
-- NEON SAMPLE SEED DATA
-- =====================================================================

-- 1. Sample Advisory Organization
INSERT INTO public.organizations (id, name, slug, logo_url, branding_color)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Apex Financial & Tax Advisory',
    'apex-tax',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=128&auto=format&fit=crop&q=80',
    '#171717'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Sample User (password: Password123!)
INSERT INTO public.users (id, organization_id, full_name, email, password_hash, role)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'CA Amit Deshmukh',
    'admin@apextax.in',
    '$2a$10$wO7vM4Y4k7hP5Y7kE7f6ce1qN7.tC3rK1fP3l8w2fE8k9g1.2.3.4',
    'owner'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Sample Client
INSERT INTO public.clients (id, organization_id, name, email, phone, alternate_phone, company, client_ref_id, notes)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Rahul Sharma',
    'rahul.sharma@example.com',
    '+91 98765 43210',
    '+91 98111 22334',
    'Sharma Enterprises Ltd.',
    'CLI-2026-089',
    'Prefers WhatsApp communication in the afternoon.'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Case
INSERT INTO public.cases (id, organization_id, client_id, title, service_type, reference_number, status, due_date, notes)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'ITR Filing FY 2025-26',
    'ITR Filing',
    'ITR-2026-0042',
    'waiting_for_client',
    CURRENT_DATE + INTERVAL '14 days',
    'Individual Salaried + Capital Gains return.'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Standard Document Requirements
INSERT INTO public.document_requirements (id, case_id, name, description, is_required, allowed_types, max_size_mb, status, sort_order)
VALUES
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', 'PAN Card', 'Clear front photo or scanned PDF of original PAN card.', true, ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[], 10, 'approved', 1),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', 'Aadhaar Card', 'Front and back side of Aadhaar or e-Aadhaar PDF.', true, ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[], 10, 'rejected', 2),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222', 'Form 16 (Part A & B)', 'Signed Form 16 issued by employer for FY 2025-26.', true, ARRAY['application/pdf']::TEXT[], 25, 'under_review', 3),
    ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222222', 'Bank Account Statements', 'Statements for all active savings accounts from 1st April to 31st March.', true, ARRAY['application/pdf']::TEXT[], 25, 'not_uploaded', 4),
    ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222222', 'Capital Gains Statement / Zerodha Tax P&L', 'Annual tax P&L report for stock & mutual fund trades.', false, ARRAY['application/pdf', 'application/vnd.ms-excel']::TEXT[], 20, 'not_uploaded', 5)
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Documents
INSERT INTO public.documents (id, requirement_id, case_id, client_id, version, file_name, storage_path, file_size, mime_type, status, rejection_reason, uploaded_by_type, uploaded_at)
VALUES
    ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1, 'PAN_RahulSharma_2026.pdf', 'org-1/cli-1/case-1/req-101/v1_PAN_RahulSharma_2026.pdf', 1420000, 'application/pdf', 'approved', null, 'client', now() - INTERVAL '2 days'),
    ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1, 'aadhaar_back_cam.jpg', 'org-1/cli-1/case-1/req-102/v1_aadhaar_back_cam.jpg', 890000, 'image/jpeg', 'rejected', 'The back side is missing and the photo is blurry. Please upload both front and back clearly.', 'client', now() - INTERVAL '1 day'),
    ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1, 'Form16_FY2025_26_Signed.pdf', 'org-1/cli-1/case-1/req-103/v1_Form16_FY2025_26_Signed.pdf', 3240000, 'application/pdf', 'under_review', null, 'client', now() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 7. Sample Upload Link
INSERT INTO public.upload_links (id, case_id, token_hash, token_prefix, expires_at)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'mock-token-itr-2026',
    'itr202',
    now() + INTERVAL '14 days'
)
ON CONFLICT (id) DO NOTHING;
