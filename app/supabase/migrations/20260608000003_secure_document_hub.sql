-- Secure Document Hub Migration
-- Alters documents table and creates document_ai_summaries and document_source_references.
-- Enforces row-level security with explicit USING and WITH CHECK policies.

-- 1. Extend documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'classified', 'review_pending', 'approved', 'rejected', 'archived'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality_level VARCHAR(50) DEFAULT 'standard' CHECK (confidentiality_level IN ('standard', 'confidential', 'restricted'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- 2. Create document_ai_summaries table
CREATE TABLE IF NOT EXISTS document_ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    output_title TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    sources_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    missing_information TEXT,
    suggested_next_action TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    generated_by TEXT REFERENCES firm_members(id) ON DELETE SET NULL,
    approved_by TEXT REFERENCES firm_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create document_source_references table
CREATE TABLE IF NOT EXISTS document_source_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    summary_id UUID REFERENCES document_ai_summaries(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    source_type TEXT,
    page_number INTEGER,
    field_name TEXT,
    citation_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Enable Row Level Security
ALTER TABLE document_ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_source_references ENABLE ROW LEVEL SECURITY;

-- 5. Define Explicit policies for document_ai_summaries
CREATE POLICY document_ai_summaries_select ON document_ai_summaries
    FOR SELECT USING (firm_id = get_auth_firm_id());

CREATE POLICY document_ai_summaries_insert ON document_ai_summaries
    FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY document_ai_summaries_update ON document_ai_summaries
    FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY document_ai_summaries_delete ON document_ai_summaries
    FOR DELETE USING (firm_id = get_auth_firm_id());

-- 6. Define Explicit policies for document_source_references
CREATE POLICY document_source_references_select ON document_source_references
    FOR SELECT USING (firm_id = get_auth_firm_id());

CREATE POLICY document_source_references_insert ON document_source_references
    FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY document_source_references_update ON document_source_references
    FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY document_source_references_delete ON document_source_references
    FOR DELETE USING (firm_id = get_auth_firm_id());

-- 7. Ensure private storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-matters-docs', 'legal-matters-docs', false)
ON CONFLICT (id) DO NOTHING;
