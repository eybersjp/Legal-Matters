-- Seed Data for Legal Matters Platform
-- Using South African Legal examples with fictional names.

-- 1. Insert Demo Firm
INSERT INTO firms (id, name, lpc_registration_number, vat_number, created_at, updated_at)
VALUES (
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Johannesburg Legal Practitioners',
    'LPC-JHB-98765',
    'VAT-4010203040',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Demo Users (Attorney and Paralegal) in firm_members
INSERT INTO firm_members (id, firm_id, role, is_active, created_at, updated_at)
VALUES 
    ('user_test_12345', 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Partner', true, now(), now()),
    ('user_test_paralegal', 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Paralegal', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert User Profiles
INSERT INTO user_profiles (id, member_id, first_name, last_name, phone_number, avatar_url, created_at, updated_at)
VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'user_test_12345', 'Sipho', 'Nkosi', '+27831234567', NULL, now(), now()),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'user_test_paralegal', 'Lerato', 'Mokoena', '+27829876543', NULL, now(), now())
ON CONFLICT (member_id) DO NOTHING;

-- 4. Insert Clients
INSERT INTO clients (id, firm_id, type, company_name, registration_number, first_name, last_name, sa_id_number, passport_number, email, phone_number, created_at, updated_at)
VALUES
    ('c1c1c1c1-2222-3333-4444-555555555555', 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Individual', NULL, NULL, 'Thabo', 'Zulu', '8506015678087', NULL, 'thabo@zulu.co.za', '+27721112222', now(), now()),
    ('c2c2c2c2-2222-3333-4444-555555555555', 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Corporate', 'Incorporate SA Ltd', '2020/123456/07', NULL, NULL, NULL, NULL, 'legal@incorporate.co.za', '+27115550199', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Matters
INSERT INTO matters (id, firm_id, client_id, case_number, title, description, court_jurisdiction, status, created_at, updated_at)
VALUES
    (
        'mock-matter-litigation-1', 
        'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
        'c1c1c1c1-2222-3333-4444-555555555555', 
        '2026/45678', 
        'Zulu v MEC for Health (Gauteng)', 
        'Medical negligence claim in the Johannesburg High Court.', 
        'Gauteng Local Division, Johannesburg', 
        'Pleadings', 
        now(), 
        now()
    ),
    (
        'mock-matter-debt-1', 
        'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
        'c2c2c2c2-2222-3333-4444-555555555555', 
        '2026/89012', 
        'Incorporate SA v Zondi Logistics ZAR', 
        'Debt recovery of outstanding commercial transport fees.', 
        'Randburg Magistrates Court', 
        'Intake', 
        now(), 
        now()
    ),
    (
        'mock-matter-labour-1', 
        'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 
        'c1c1c1c1-2222-3333-4444-555555555555', 
        'JHB-L-2345/26', 
        'Zulu v Metro Rail Corp (South Africa)', 
        'CCMA unfair dismissal referral and arbitration prep.', 
        'CCMA Johannesburg Office', 
        'Discovery', 
        now(), 
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Documents & Versions (At least 6 metadata records, 2 pending review, 1 confidential/restricted, 1 placeholder AI summary)
-- Document 1: litigation pleading (discoverable)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd1d1d1d1-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'c1c1c1c1-2222-3333-4444-555555555555',
    'Particulars of Claim',
    false,
    'approved',
    'standard',
    'Pleading',
    'application/pdf',
    false,
    'approved',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v1v1v1v1-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd1d1d1d1-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-litigation-1/poc.pdf',
    'particulars_of_claim.pdf',
    240500,
    'application/pdf',
    'Pleading',
    'user_test_12345',
    now()
) ON CONFLICT (id) DO NOTHING;

-- Document 2: litigation pleading (pending review, has AI summary placeholder)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd2d2d2d2-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'c1c1c1c1-2222-3333-4444-555555555555',
    'Notice to Produce Documents',
    false,
    'review_pending',
    'standard',
    'Pleading',
    'application/pdf',
    true,
    'pending',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v2v2v2v2-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd2d2d2d2-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-litigation-1/notice_to_produce.pdf',
    'notice_to_produce.pdf',
    115000,
    'application/pdf',
    'Pleading',
    'user_test_paralegal',
    now()
) ON CONFLICT (id) DO NOTHING;

-- Document 3: litigation internal memo (privileged, confidential)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd3d3d3d3-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'c1c1c1c1-2222-3333-4444-555555555555',
    'Internal Memo on Merits',
    true,
    'approved',
    'confidential',
    'Internal Memo',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    false,
    'approved',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v3v3v3v3-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd3d3d3d3-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-litigation-1/memo_merits.docx',
    'memo_merits.docx',
    42000,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Internal Memo',
    'user_test_12345',
    now()
) ON CONFLICT (id) DO NOTHING;

-- Document 4: litigation counsel opinion (privileged, restricted)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd4d4d4d4-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'c1c1c1c1-2222-3333-4444-555555555555',
    'Restricted Counsel Opinion',
    true,
    'approved',
    'restricted',
    'Internal Memo',
    'application/pdf',
    false,
    'approved',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v4v4v4v4-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd4d4d4d4-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-litigation-1/counsel_opinion.pdf',
    'counsel_opinion.pdf',
    820500,
    'application/pdf',
    'Internal Memo',
    'user_test_12345',
    now()
) ON CONFLICT (id) DO NOTHING;

-- Document 5: debt collection letter of demand (discoverable)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd5d5d5d5-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-debt-1',
    'c2c2c2c2-2222-3333-4444-555555555555',
    'Section 129 Notice Letter',
    false,
    'approved',
    'standard',
    'Correspondence',
    'application/pdf',
    false,
    'approved',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v5v5v5v5-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd5d5d5d5-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-debt-1/section129.pdf',
    'section129.pdf',
    95200,
    'application/pdf',
    'Correspondence',
    'user_test_paralegal',
    now()
) ON CONFLICT (id) DO NOTHING;

-- Document 6: debt collection bank statements (evidence, pending review)
INSERT INTO documents (id, firm_id, matter_id, client_id, title, is_privileged, status, confidentiality_level, category, document_type, ai_processed, approval_status, created_at, updated_at)
VALUES (
    'd6d6d6d6-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-debt-1',
    'c2c2c2c2-2222-3333-4444-555555555555',
    'Debtor Bank Statements 2025',
    false,
    'review_pending',
    'confidential',
    'Evidence',
    'image/jpeg',
    false,
    'pending',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO document_versions (id, firm_id, document_id, version_number, storage_path, file_name, file_size, mime_type, classification, uploaded_by, created_at)
VALUES (
    'v6v6v6v6-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'd6d6d6d6-1111-2222-3333-444444444444',
    1,
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/mock-matter-debt-1/statements.jpg',
    'statements.jpg',
    1550200,
    'image/jpeg',
    'Evidence',
    'user_test_paralegal',
    now()
) ON CONFLICT (id) DO NOTHING;

-- 7. Insert Placeholder AI Summary for Document 2
INSERT INTO document_ai_summaries (id, firm_id, matter_id, document_id, output_title, summary_text, sources_used, confidence_level, missing_information, suggested_next_action, approval_status, generated_by, created_at, updated_at)
VALUES (
    's2s2s2s2-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'd2d2d2d2-1111-2222-3333-444444444444',
    'Placeholder Document Summary',
    'This is a placeholder document summary generated for workflow validation. Live AI extraction is not enabled yet.',
    '[{"document_id": "d2d2d2d2-1111-2222-3333-444444444444", "title": "Notice to Produce Documents", "filename": "notice_to_produce.pdf", "category": "Pleading", "generated_at": "2026-06-08T17:00:00Z"}]'::jsonb,
    'low',
    'Live document extraction is not yet enabled. Review the document manually before relying on this summary.',
    'Review document manually and approve metadata classification.',
    'pending',
    'user_test_12345',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 8. Insert Document Source Reference for Document 2
INSERT INTO document_source_references (id, firm_id, matter_id, document_id, summary_id, source_document_id, source_type, page_number, field_name, citation_text, created_at)
VALUES (
    'r2r2r2r2-1111-2222-3333-444444444444',
    'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'mock-matter-litigation-1',
    'd2d2d2d2-1111-2222-3333-444444444444',
    's2s2s2s2-1111-2222-3333-444444444444',
    'd2d2d2d2-1111-2222-3333-444444444444',
    'PDF',
    1,
    'Summary Source',
    'Placeholder source reference for page 1.',
    now()
) ON CONFLICT (id) DO NOTHING;
