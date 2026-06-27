-- Phase 3 Migration: Storage and Document Processing Schema
-- Timestamp: 20260614182558

-- Clean up any existing Phase 3 tables to prevent conflicts during repair/apply
DROP TABLE IF EXISTS public.ai_approval_events CASCADE;
DROP TABLE IF EXISTS public.matter_readiness_items CASCADE;
DROP TABLE IF EXISTS public.matter_readiness_checks CASCADE;
DROP TABLE IF EXISTS public.ai_output_sources CASCADE;
DROP TABLE IF EXISTS public.ai_outputs CASCADE;
DROP TABLE IF EXISTS public.document_extractions CASCADE;
DROP TABLE IF EXISTS public.document_processing_jobs CASCADE;

-- 1. Create document_processing_jobs table
CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('extraction', 'summary', 'readiness_source_index')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create document_extractions table
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
    processing_job_id UUID REFERENCES public.document_processing_jobs(id) ON DELETE SET NULL,
    extraction_type TEXT NOT NULL CHECK (extraction_type IN ('text', 'fields', 'dates', 'parties', 'amounts', 'obligations')),
    extracted_text TEXT,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    page_start INTEGER,
    page_end INTEGER,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected')),
    reviewed_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create ai_outputs table
CREATE TABLE IF NOT EXISTS public.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    output_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected', 'superseded')),
    generated_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    approved_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    supersedes_ai_output_id UUID REFERENCES public.ai_outputs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create ai_output_sources table
CREATE TABLE IF NOT EXISTS public.ai_output_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    ai_output_id UUID NOT NULL REFERENCES public.ai_outputs(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'extraction', 'matter_field', 'note', 'task', 'deadline', 'billing', 'timeline')),
    source_ref_id UUID,
    page_number INTEGER,
    quote TEXT,
    source_label TEXT,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create matter_readiness_checks table
CREATE TABLE IF NOT EXISTS public.matter_readiness_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    readiness_type TEXT NOT NULL,
    score NUMERIC(5, 2) NOT NULL CHECK (score >= 0.00 AND score <= 100.00),
    status TEXT NOT NULL DEFAULT 'not_ready' CHECK (status IN ('not_ready', 'needs_review', 'ready')),
    summary TEXT,
    generated_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by TEXT REFERENCES public.firm_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create matter_readiness_items table
CREATE TABLE IF NOT EXISTS public.matter_readiness_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    readiness_check_id UUID NOT NULL REFERENCES public.matter_readiness_checks(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'missing', 'warning', 'blocked')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    source_type TEXT,
    source_ref_id UUID,
    recommendation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create ai_approval_events table
CREATE TABLE IF NOT EXISTS public.ai_approval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    ai_output_id UUID NOT NULL REFERENCES public.ai_outputs(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('reviewed', 'approved', 'rejected', 'superseded')),
    actor_id TEXT NOT NULL REFERENCES public.firm_members(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Add Indexes
-- Simple and compound indexes for fast joins, status lookup, and performance.
CREATE INDEX IF NOT EXISTS idx_processing_jobs_firm ON public.document_processing_jobs(firm_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_matter ON public.document_processing_jobs(matter_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document ON public.document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.document_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created ON public.document_processing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_firm_matter ON public.document_processing_jobs(firm_id, matter_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_firm_doc ON public.document_processing_jobs(firm_id, document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_firm_status ON public.document_processing_jobs(firm_id, status);

CREATE INDEX IF NOT EXISTS idx_extractions_firm ON public.document_extractions(firm_id);
CREATE INDEX IF NOT EXISTS idx_extractions_matter ON public.document_extractions(matter_id);
CREATE INDEX IF NOT EXISTS idx_extractions_document ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_created ON public.document_extractions(created_at);
CREATE INDEX IF NOT EXISTS idx_extractions_firm_matter ON public.document_extractions(firm_id, matter_id);
CREATE INDEX IF NOT EXISTS idx_extractions_firm_doc ON public.document_extractions(firm_id, document_id);

CREATE INDEX IF NOT EXISTS idx_ai_outputs_firm ON public.ai_outputs(firm_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_matter ON public.ai_outputs(matter_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_document ON public.ai_outputs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_status ON public.ai_outputs(status);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_created ON public.ai_outputs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_firm_matter ON public.ai_outputs(firm_id, matter_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_firm_doc ON public.ai_outputs(firm_id, document_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_firm_status ON public.ai_outputs(firm_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_sources_firm ON public.ai_output_sources(firm_id);
CREATE INDEX IF NOT EXISTS idx_ai_sources_output ON public.ai_output_sources(ai_output_id);
CREATE INDEX IF NOT EXISTS idx_ai_sources_matter ON public.ai_output_sources(matter_id);
CREATE INDEX IF NOT EXISTS idx_ai_sources_document ON public.ai_output_sources(document_id);

CREATE INDEX IF NOT EXISTS idx_readiness_checks_firm ON public.matter_readiness_checks(firm_id);
CREATE INDEX IF NOT EXISTS idx_readiness_checks_matter ON public.matter_readiness_checks(matter_id);
CREATE INDEX IF NOT EXISTS idx_readiness_checks_status ON public.matter_readiness_checks(status);
CREATE INDEX IF NOT EXISTS idx_readiness_checks_created ON public.matter_readiness_checks(created_at);

CREATE INDEX IF NOT EXISTS idx_readiness_items_firm ON public.matter_readiness_items(firm_id);
CREATE INDEX IF NOT EXISTS idx_readiness_items_check ON public.matter_readiness_items(readiness_check_id);
CREATE INDEX IF NOT EXISTS idx_readiness_items_matter ON public.matter_readiness_items(matter_id);
CREATE INDEX IF NOT EXISTS idx_readiness_items_status ON public.matter_readiness_items(status);

CREATE INDEX IF NOT EXISTS idx_approval_events_firm ON public.ai_approval_events(firm_id);
CREATE INDEX IF NOT EXISTS idx_approval_events_output ON public.ai_approval_events(ai_output_id);
CREATE INDEX IF NOT EXISTS idx_approval_events_matter ON public.ai_approval_events(matter_id);

-- 9. Enable Row Level Security
ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_output_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_readiness_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_readiness_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_approval_events ENABLE ROW LEVEL SECURITY;

-- 10. Define RLS Policies Scoped by firm_id = get_auth_firm_id()
CREATE POLICY jobs_select ON public.document_processing_jobs FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY jobs_insert ON public.document_processing_jobs FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY jobs_update ON public.document_processing_jobs FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY jobs_delete ON public.document_processing_jobs FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY extractions_select ON public.document_extractions FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY extractions_insert ON public.document_extractions FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY extractions_update ON public.document_extractions FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY extractions_delete ON public.document_extractions FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY ai_outputs_select ON public.ai_outputs FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY ai_outputs_insert ON public.ai_outputs FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY ai_outputs_update ON public.ai_outputs FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY ai_outputs_delete ON public.ai_outputs FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY ai_sources_select ON public.ai_output_sources FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY ai_sources_insert ON public.ai_output_sources FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY ai_sources_update ON public.ai_output_sources FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY ai_sources_delete ON public.ai_output_sources FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY checks_select ON public.matter_readiness_checks FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY checks_insert ON public.matter_readiness_checks FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY checks_update ON public.matter_readiness_checks FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY checks_delete ON public.matter_readiness_checks FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY check_items_select ON public.matter_readiness_items FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY check_items_insert ON public.matter_readiness_items FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY check_items_update ON public.matter_readiness_items FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY check_items_delete ON public.matter_readiness_items FOR DELETE USING (firm_id = get_auth_firm_id());

CREATE POLICY approval_events_select ON public.ai_approval_events FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY approval_events_insert ON public.ai_approval_events FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY approval_events_update ON public.ai_approval_events FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY approval_events_delete ON public.ai_approval_events FOR DELETE USING (firm_id = get_auth_firm_id());

-- 11. Add Default Grants
GRANT ALL ON TABLE public.document_processing_jobs TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.document_processing_jobs TO anon;

GRANT ALL ON TABLE public.document_extractions TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.document_extractions TO anon;

GRANT ALL ON TABLE public.ai_outputs TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.ai_outputs TO anon;

GRANT ALL ON TABLE public.ai_output_sources TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.ai_output_sources TO anon;

GRANT ALL ON TABLE public.matter_readiness_checks TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.matter_readiness_checks TO anon;

GRANT ALL ON TABLE public.matter_readiness_items TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.matter_readiness_items TO anon;

GRANT ALL ON TABLE public.ai_approval_events TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.ai_approval_events TO anon;

-- 12. Redefine verify_rls_helpers() to cover the new tables
-- Redefine it with the new RLS tests
CREATE OR REPLACE FUNCTION verify_rls_helpers()
RETURNS TABLE(test_name TEXT, passed BOOLEAN, result_val TEXT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_firm_a UUID := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  v_firm_b UUID := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  v_user_a TEXT := 'user_test_a_123';
  v_user_b TEXT := 'user_test_b_456';
  v_user_c TEXT := 'user_test_c_789';
  
  v_client_a UUID := '11111111-1111-4111-1111-111111111111';
  v_client_b UUID := '22222222-2222-4222-2222-222222222222';
  
  v_matter_a UUID := 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  v_matter_b UUID := 'dddddddd-dddd-4ddd-dddd-dddddddddddd';

  v_doc_a UUID := 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
  v_doc_b UUID := 'ffffffff-ffff-4fff-ffff-ffffffffffff';

  v_job_a UUID := '55555555-5555-5555-5555-555555555555';
  v_job_b UUID := '66666666-6666-6666-6666-666666666666';

  v_output_a UUID := '77777777-7777-7777-7777-777777777777';
  v_output_b UUID := '88888888-8888-8888-8888-888888888888';

  v_check_a UUID := '99999999-9999-9999-9999-999999999999';
  v_check_b UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  v_count INT;
BEGIN
  BEGIN
    -- Setup config for setup logic
    PERFORM set_config('app.current_firm_id', '', true);

    -- Clean up prior test data
    DELETE FROM ai_approval_events WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM matter_readiness_items WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM matter_readiness_checks WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM ai_output_sources WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM ai_outputs WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM document_extractions WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM document_processing_jobs WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM documents WHERE id IN (v_doc_a, v_doc_b);
    DELETE FROM matters WHERE id IN (v_matter_a, v_matter_b);
    DELETE FROM clients WHERE id IN (v_client_a, v_client_b);
    DELETE FROM firm_members WHERE id IN (v_user_a, v_user_b, v_user_c);
    DELETE FROM firms WHERE id IN (v_firm_a, v_firm_b);

    -- 1. Setup mock data
    INSERT INTO firms (id, name, lpc_registration_number) VALUES (v_firm_a, 'Firm A', 'LPC-A-12345');
    INSERT INTO firms (id, name, lpc_registration_number) VALUES (v_firm_b, 'Firm B', 'LPC-B-67890');
    
    INSERT INTO firm_members (id, firm_id, role) VALUES (v_user_a, v_firm_a, 'Partner');
    INSERT INTO firm_members (id, firm_id, role) VALUES (v_user_b, v_firm_b, 'Associate');
    
    INSERT INTO clients (id, firm_id, type, first_name, last_name, email, phone_number) 
    VALUES (v_client_a, v_firm_a, 'Individual', 'Sipho', 'Nkosi', 'sipho@firm-a.co.za', '+27831111111');
    INSERT INTO clients (id, firm_id, type, first_name, last_name, email, phone_number) 
    VALUES (v_client_b, v_firm_b, 'Individual', 'Teboho', 'Molefe', 'teboho@firm-b.co.za', '+27832222222');
    
    INSERT INTO matters (id, firm_id, client_id, title, case_number, status) 
    VALUES (v_matter_a, v_firm_a, v_client_a, 'Matter Firm A', '100/2026', 'Intake');
    INSERT INTO matters (id, firm_id, client_id, title, case_number, status) 
    VALUES (v_matter_b, v_firm_b, v_client_b, 'Matter Firm B', '200/2026', 'Intake');

    INSERT INTO documents (id, firm_id, matter_id, title) VALUES (v_doc_a, v_firm_a, v_matter_a, 'Summons A');
    INSERT INTO documents (id, firm_id, matter_id, title) VALUES (v_doc_b, v_firm_b, v_matter_b, 'Summons B');

    -- Insert mock AI and job tables
    INSERT INTO document_processing_jobs (id, firm_id, matter_id, document_id, job_type, status)
    VALUES (v_job_a, v_firm_a, v_matter_a, v_doc_a, 'extraction', 'queued');
    INSERT INTO document_processing_jobs (id, firm_id, matter_id, document_id, job_type, status)
    VALUES (v_job_b, v_firm_b, v_matter_b, v_doc_b, 'extraction', 'queued');

    INSERT INTO document_extractions (firm_id, matter_id, document_id, processing_job_id, extraction_type, extracted_text)
    VALUES (v_firm_a, v_matter_a, v_doc_a, v_job_a, 'text', 'Summons text details');
    INSERT INTO document_extractions (firm_id, matter_id, document_id, processing_job_id, extraction_type, extracted_text)
    VALUES (v_firm_b, v_matter_b, v_doc_b, v_job_b, 'text', 'Summons text details B');

    INSERT INTO ai_outputs (id, firm_id, matter_id, document_id, output_type, title, content)
    VALUES (v_output_a, v_firm_a, v_matter_a, v_doc_a, 'document_summary', 'Summary A', '{"summary": "Test A"}'::jsonb);
    INSERT INTO ai_outputs (id, firm_id, matter_id, document_id, output_type, title, content)
    VALUES (v_output_b, v_firm_b, v_matter_b, v_doc_b, 'document_summary', 'Summary B', '{"summary": "Test B"}'::jsonb);

    INSERT INTO ai_output_sources (firm_id, ai_output_id, matter_id, document_id, source_type, quote)
    VALUES (v_firm_a, v_output_a, v_matter_a, v_doc_a, 'document', 'quote details A');
    INSERT INTO ai_output_sources (firm_id, ai_output_id, matter_id, document_id, source_type, quote)
    VALUES (v_firm_b, v_output_b, v_matter_b, v_doc_b, 'document', 'quote details B');

    INSERT INTO matter_readiness_checks (id, firm_id, matter_id, readiness_type, score, status)
    VALUES (v_check_a, v_firm_a, v_matter_a, 'litigation_stage', 75.00, 'needs_review');
    INSERT INTO matter_readiness_checks (id, firm_id, matter_id, readiness_type, score, status)
    VALUES (v_check_b, v_firm_b, v_matter_b, 'litigation_stage', 40.00, 'not_ready');

    INSERT INTO matter_readiness_items (firm_id, readiness_check_id, matter_id, category, label, status, severity)
    VALUES (v_firm_a, v_check_a, v_matter_a, 'pleadings', 'Plea served', 'passed', 'info');
    INSERT INTO matter_readiness_items (firm_id, readiness_check_id, matter_id, category, label, status, severity)
    VALUES (v_firm_b, v_check_b, v_matter_b, 'pleadings', 'Plea missing', 'missing', 'high');

    INSERT INTO ai_approval_events (firm_id, ai_output_id, matter_id, action, actor_id)
    VALUES (v_firm_a, v_output_a, v_matter_a, 'approved', v_user_a);
    INSERT INTO ai_approval_events (firm_id, ai_output_id, matter_id, action, actor_id)
    VALUES (v_firm_b, v_output_b, v_matter_b, 'rejected', v_user_b);
  EXCEPTION WHEN OTHERS THEN
    test_name := 'setup phase';
    passed := false;
    result_val := SQLERRM;
    RETURN NEXT;
    RETURN;
  END;

  -- Set JWT claims to user A for basic tests
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a)::text, true);

  -- Verify basics
  test_name := 'get_auth_user_id() returns sub claim';
  result_val := get_auth_user_id();
  passed := (result_val = v_user_a);
  RETURN NEXT;

  test_name := 'get_auth_firm_id() resolves from firm_members';
  result_val := get_auth_firm_id()::text;
  passed := (result_val = v_firm_a::text);
  RETURN NEXT;

  test_name := 'get_auth_role() resolves from firm_members';
  result_val := get_auth_role();
  passed := (result_val = 'Partner');
  RETURN NEXT;

  PERFORM set_config('app.current_firm_id', 'eaeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee', true);
  test_name := 'get_auth_firm_id() respects app.current_firm_id override';
  result_val := get_auth_firm_id()::text;
  passed := (result_val = 'eaeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee');
  RETURN NEXT;

  -- Reset app config override
  PERFORM set_config('app.current_firm_id', '', true);

  -- RLS Checks for new tables
  -- Switch role context to authenticated
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a)::text, true);

    -- Jobs RLS select Firm A
    SELECT COUNT(*) INTO v_count FROM document_processing_jobs WHERE id = v_job_a;
    test_name := 'Jobs RLS allows select own firm';
    passed := (v_count = 1);
    result_val := v_count::text;
    RETURN NEXT;

    -- Jobs RLS select Firm B
    SELECT COUNT(*) INTO v_count FROM document_processing_jobs WHERE id = v_job_b;
    test_name := 'Jobs RLS blocks select other firm';
    passed := (v_count = 0);
    result_val := v_count::text;
    RETURN NEXT;

    -- AI Outputs select Firm A
    SELECT COUNT(*) INTO v_count FROM ai_outputs WHERE id = v_output_a;
    test_name := 'AI Outputs RLS allows select own firm';
    passed := (v_count = 1);
    result_val := v_count::text;
    RETURN NEXT;

    -- AI Outputs select Firm B
    SELECT COUNT(*) INTO v_count FROM ai_outputs WHERE id = v_output_b;
    test_name := 'AI Outputs RLS blocks select other firm';
    passed := (v_count = 0);
    result_val := v_count::text;
    RETURN NEXT;

    -- Readiness Checks select Firm A
    SELECT COUNT(*) INTO v_count FROM matter_readiness_checks WHERE id = v_check_a;
    test_name := 'Readiness Checks RLS allows select own firm';
    passed := (v_count = 1);
    result_val := v_count::text;
    RETURN NEXT;

    -- Readiness Checks select Firm B
    SELECT COUNT(*) INTO v_count FROM matter_readiness_checks WHERE id = v_check_b;
    test_name := 'Readiness Checks RLS blocks select other firm';
    passed := (v_count = 0);
    result_val := v_count::text;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    SET ROLE service_role;
    test_name := 'RLS checks phase';
    passed := false;
    result_val := SQLERRM;
    RETURN NEXT;
    RETURN;
  END;

  -- Restore superuser role to perform cleanup
  RESET ROLE;
  SET ROLE service_role;

  -- Clean up settings
  PERFORM set_config('app.current_firm_id', '', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- Clean up test data
  BEGIN
    DELETE FROM ai_approval_events WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM matter_readiness_items WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM matter_readiness_checks WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM ai_output_sources WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM ai_outputs WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM document_extractions WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM document_processing_jobs WHERE firm_id IN (v_firm_a, v_firm_b);
    DELETE FROM documents WHERE id IN (v_doc_a, v_doc_b);
    DELETE FROM matters WHERE id IN (v_matter_a, v_matter_b);
    DELETE FROM clients WHERE id IN (v_client_a, v_client_b);
    DELETE FROM firm_members WHERE id IN (v_user_a, v_user_b, v_user_c);
    DELETE FROM firms WHERE id IN (v_firm_a, v_firm_b);
  EXCEPTION WHEN OTHERS THEN
    test_name := 'cleanup phase';
    passed := false;
    result_val := SQLERRM;
    RETURN NEXT;
  END;
END;
$$;

-- Secure verify_rls_helpers so only the service_role key can execute it
REVOKE ALL ON FUNCTION verify_rls_helpers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_helpers() TO service_role;

-- 13. Reload schema cache
NOTIFY pgrst, 'reload schema';
