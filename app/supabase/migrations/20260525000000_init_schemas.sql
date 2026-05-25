-- ==========================================
-- LEGAL MATTERS DATABASE INITIAL MIGRATION
-- South Africa Practice Rules and POPIA 2013 Hardening
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Domain Types & Enums
CREATE TYPE app_role AS ENUM ('Partner', 'Associate', 'Paralegal', 'External Counsel', 'Client');
CREATE TYPE client_type AS ENUM ('Individual', 'Corporate');
CREATE TYPE matter_status AS ENUM ('Intake', 'Pleadings', 'Discovery', 'Trial', 'Closed');
CREATE TYPE party_role AS ENUM ('Plaintiff', 'Defendant', 'Respondent', 'Applicant', 'Witness', 'Opposing Counsel', 'Advocate');
CREATE TYPE doc_classification AS ENUM ('Pleading', 'Evidence', 'Correspondence', 'Internal Memo', 'Precedent');
CREATE TYPE task_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Overdue');
CREATE TYPE invoice_status AS ENUM ('Draft', 'Issued', 'Paid', 'Overdue', 'WrittenOff');

-- 1. firms table
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    lpc_registration_number VARCHAR(100) UNIQUE NOT NULL,
    vat_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 2. firm_members table (Linked to Supabase Auth auth.users)
CREATE TABLE firm_members (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    firm_id UUID REFERENCES firms(id) ON DELETE RESTRICT NOT NULL,
    role app_role NOT NULL DEFAULT 'Associate',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 3. user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID UNIQUE REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 4. clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    type client_type NOT NULL DEFAULT 'Individual',
    company_name VARCHAR(255),
    registration_number VARCHAR(100), -- YYYY/NNNNNN/NN
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    sa_id_number CHAR(13) CONSTRAINT chk_sa_id_clients CHECK (sa_id_number IS NULL OR sa_id_number ~ '^[0-9]{13}$'),
    passport_number VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 5. parties table
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    type client_type NOT NULL DEFAULT 'Individual',
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    sa_id_number CHAR(13) CONSTRAINT chk_sa_id_parties CHECK (sa_id_number IS NULL OR sa_id_number ~ '^[0-9]{13}$'),
    email VARCHAR(255),
    phone_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 6. matters table
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    case_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    court_jurisdiction VARCHAR(150),
    status matter_status NOT NULL DEFAULT 'Intake',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 7. matter_parties table
CREATE TABLE matter_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    party_id UUID REFERENCES parties(id) ON DELETE RESTRICT NOT NULL,
    role party_role NOT NULL,
    is_opposing BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 8. matter_team_members table
CREATE TABLE matter_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    UNIQUE(matter_id, member_id)
);

-- 9. matter_events table
CREATE TABLE matter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 10. matter_tasks table
CREATE TABLE matter_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'Pending',
    assigned_to UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 11. matter_deadlines table
CREATE TABLE matter_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(255) NOT NULL,
    calculated_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    days_skipped INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 12. documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_privileged BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 13. document_versions table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Correspondence',
    uploaded_by UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 14. document_access_logs table
CREATE TABLE document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 15. popia_consents table
CREATE TABLE popia_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    consented_to_processing BOOLEAN DEFAULT false NOT NULL,
    consented_channels VARCHAR(50)[] NOT NULL,
    signed_consent_document_url TEXT,
    captured_by UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 16. audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 17. client_portal_access table
CREATE TABLE client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    portal_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 18. time_entries table
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    duration_minutes INT NOT NULL CONSTRAINT positive_duration CHECK (duration_minutes > 0),
    hourly_rate_zar NUMERIC(10, 2) NOT NULL CONSTRAINT positive_rate CHECK (hourly_rate_zar >= 0.00),
    description TEXT NOT NULL,
    is_billed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 19. invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_excluding_vat NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    total_including_vat NUMERIC(12, 2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'Draft',
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 20. invoice_line_items table
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount_excluding_vat NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    amount_including_vat NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 21. trust_account_records table (Metadata Only)
CREATE TABLE trust_account_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    trust_ledger_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    section_86_type VARCHAR(50) DEFAULT '86(2)' NOT NULL,
    description TEXT NOT NULL,
    recorded_by UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 22. notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    link_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- Indices for Multitenancy Isolation and Performance
CREATE INDEX idx_firm_members_firm ON firm_members(firm_id);
CREATE INDEX idx_clients_firm ON clients(firm_id);
CREATE INDEX idx_parties_firm ON parties(firm_id);
CREATE INDEX idx_matters_firm ON matters(firm_id);
CREATE INDEX idx_documents_firm ON documents(firm_id);
CREATE INDEX idx_invoices_firm ON invoices(firm_id);
CREATE INDEX idx_trust_records_firm ON trust_account_records(firm_id);
CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id);

-- Additional Performance and Lookup Indices
CREATE INDEX idx_matters_client ON matters(client_id);
CREATE INDEX idx_matter_parties_matter ON matter_parties(matter_id);
CREATE INDEX idx_matter_team_matter ON matter_team_members(matter_id);
CREATE INDEX idx_doc_versions_doc ON document_versions(document_id);
CREATE INDEX idx_time_entries_matter_billed ON time_entries(matter_id, is_billed);
CREATE INDEX idx_invoice_lines ON invoice_line_items(invoice_id);
