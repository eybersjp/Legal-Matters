-- ==========================================
-- CLERK AUTH INTEGRATION MIGRATION
-- Changes primary key types from UUID to TEXT
-- to accommodate Clerk user IDs (e.g. user_2abc123)
--
-- IMPORTANT: RLS policies must be dropped before
-- altering column types and re-created after.
-- Run this as a single transaction.
-- ==========================================

-- 0. Drop all RLS policies that depend on the columns being altered
DROP POLICY IF EXISTS select_profiles ON user_profiles;
DROP POLICY IF EXISTS insert_profiles ON user_profiles;
DROP POLICY IF EXISTS update_profiles ON user_profiles;
DROP POLICY IF EXISTS delete_profiles ON user_profiles;
DROP POLICY IF EXISTS select_members ON firm_members;
DROP POLICY IF EXISTS insert_members ON firm_members;
DROP POLICY IF EXISTS update_members ON firm_members;
DROP POLICY IF EXISTS delete_members ON firm_members;
DROP POLICY IF EXISTS select_clients ON clients;
DROP POLICY IF EXISTS insert_clients ON clients;
DROP POLICY IF EXISTS update_clients ON clients;
DROP POLICY IF EXISTS delete_clients ON clients;
DROP POLICY IF EXISTS select_matters ON matters;
DROP POLICY IF EXISTS insert_matters ON matters;
DROP POLICY IF EXISTS update_matters ON matters;
DROP POLICY IF EXISTS delete_matters ON matters;
DROP POLICY IF EXISTS select_documents ON documents;
DROP POLICY IF EXISTS insert_documents ON documents;
DROP POLICY IF EXISTS update_documents ON documents;
DROP POLICY IF EXISTS delete_documents ON documents;
DROP POLICY IF EXISTS select_firms ON firms;
DROP POLICY IF EXISTS insert_firms ON firms;
DROP POLICY IF EXISTS update_firms ON firms;
DROP POLICY IF EXISTS select_doc_versions ON document_versions;
DROP POLICY IF EXISTS insert_doc_versions ON document_versions;
DROP POLICY IF EXISTS update_doc_versions ON document_versions;
DROP POLICY IF EXISTS delete_doc_versions ON document_versions;
DROP POLICY IF EXISTS select_doc_access_logs ON document_access_logs;
DROP POLICY IF EXISTS insert_doc_access_logs ON document_access_logs;
DROP POLICY IF EXISTS select_parties ON parties;
DROP POLICY IF EXISTS insert_parties ON parties;
DROP POLICY IF EXISTS update_parties ON parties;
DROP POLICY IF EXISTS delete_parties ON parties;
DROP POLICY IF EXISTS select_matter_parties ON matter_parties;
DROP POLICY IF EXISTS insert_matter_parties ON matter_parties;
DROP POLICY IF EXISTS update_matter_parties ON matter_parties;
DROP POLICY IF EXISTS delete_matter_parties ON matter_parties;
DROP POLICY IF EXISTS select_deadlines ON matter_deadlines;
DROP POLICY IF EXISTS insert_deadlines ON matter_deadlines;
DROP POLICY IF EXISTS update_deadlines ON matter_deadlines;
DROP POLICY IF EXISTS delete_deadlines ON matter_deadlines;
DROP POLICY IF EXISTS select_events ON matter_events;
DROP POLICY IF EXISTS insert_events ON matter_events;
DROP POLICY IF EXISTS update_events ON matter_events;
DROP POLICY IF EXISTS delete_events ON matter_events;
DROP POLICY IF EXISTS select_tasks ON matter_tasks;
DROP POLICY IF EXISTS insert_tasks ON matter_tasks;
DROP POLICY IF EXISTS update_tasks ON matter_tasks;
DROP POLICY IF EXISTS delete_tasks ON matter_tasks;
DROP POLICY IF EXISTS select_team_members ON matter_team_members;
DROP POLICY IF EXISTS insert_team_members ON matter_team_members;
DROP POLICY IF EXISTS update_team_members ON matter_team_members;
DROP POLICY IF EXISTS delete_team_members ON matter_team_members;
DROP POLICY IF EXISTS select_time_entries ON time_entries;
DROP POLICY IF EXISTS insert_time_entries ON time_entries;
DROP POLICY IF EXISTS update_time_entries ON time_entries;
DROP POLICY IF EXISTS delete_time_entries ON time_entries;
DROP POLICY IF EXISTS select_trust_records ON trust_account_records;
DROP POLICY IF EXISTS insert_trust_records ON trust_account_records;
DROP POLICY IF EXISTS update_trust_records ON trust_account_records;
DROP POLICY IF EXISTS delete_trust_records ON trust_account_records;
DROP POLICY IF EXISTS select_invoices ON invoices;
DROP POLICY IF EXISTS insert_invoices ON invoices;
DROP POLICY IF EXISTS update_invoices ON invoices;
DROP POLICY IF EXISTS select_invoice_line_items ON invoice_line_items;
DROP POLICY IF EXISTS insert_invoice_line_items ON invoice_line_items;
DROP POLICY IF EXISTS update_invoice_line_items ON invoice_line_items;
DROP POLICY IF EXISTS delete_invoice_line_items ON invoice_line_items;
DROP POLICY IF EXISTS select_notifications ON notifications;
DROP POLICY IF EXISTS insert_notifications ON notifications;
DROP POLICY IF EXISTS update_notifications ON notifications;
DROP POLICY IF EXISTS delete_notifications ON notifications;
DROP POLICY IF EXISTS select_popia_consents ON popia_consents;
DROP POLICY IF EXISTS insert_popia_consents ON popia_consents;
DROP POLICY IF EXISTS update_popia_consents ON popia_consents;
DROP POLICY IF EXISTS delete_popia_consents ON popia_consents;
DROP POLICY IF EXISTS select_audit_logs ON audit_logs;
DROP POLICY IF EXISTS insert_audit_logs ON audit_logs;
DROP POLICY IF EXISTS select_portal_access ON client_portal_access;
DROP POLICY IF EXISTS insert_portal_access ON client_portal_access;
DROP POLICY IF EXISTS update_portal_access ON client_portal_access;
DROP POLICY IF EXISTS delete_portal_access ON client_portal_access;

-- 1. Drop FK constraints that reference firm_members.id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE client_portal_access DROP CONSTRAINT IF EXISTS client_portal_access_portal_user_id_fkey;
ALTER TABLE matter_team_members DROP CONSTRAINT IF EXISTS matter_team_members_member_id_fkey;
ALTER TABLE matter_events DROP CONSTRAINT IF EXISTS matter_events_created_by_fkey;
ALTER TABLE matter_tasks DROP CONSTRAINT IF EXISTS matter_tasks_assigned_to_fkey;
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_uploaded_by_fkey;
ALTER TABLE document_access_logs DROP CONSTRAINT IF EXISTS document_access_logs_member_id_fkey;
ALTER TABLE popia_consents DROP CONSTRAINT IF EXISTS popia_consents_captured_by_fkey;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_member_id_fkey;
ALTER TABLE trust_account_records DROP CONSTRAINT IF EXISTS trust_account_records_recorded_by_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_member_id_fkey;

-- 2. Change firm_members.id from UUID to TEXT
ALTER TABLE firm_members ALTER COLUMN id TYPE TEXT;
ALTER TABLE firm_members ALTER COLUMN id SET NOT NULL;

-- 3. Drop FK reference to auth.users and change type for audit_logs.user_id
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- 4. Drop FK reference to auth.users and change type for client_portal_access.portal_user_id
ALTER TABLE client_portal_access ALTER COLUMN portal_user_id TYPE TEXT;
ALTER TABLE client_portal_access ALTER COLUMN portal_user_id SET NOT NULL;

-- 5. Update FK reference columns on child tables
ALTER TABLE matter_team_members ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE matter_team_members ALTER COLUMN member_id SET NOT NULL;

ALTER TABLE matter_events ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE matter_tasks ALTER COLUMN assigned_to TYPE TEXT;

ALTER TABLE document_versions ALTER COLUMN uploaded_by TYPE TEXT;

ALTER TABLE document_access_logs ALTER COLUMN member_id TYPE TEXT;

ALTER TABLE popia_consents ALTER COLUMN captured_by TYPE TEXT;
ALTER TABLE popia_consents ALTER COLUMN captured_by SET NOT NULL;

ALTER TABLE time_entries ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE time_entries ALTER COLUMN member_id SET NOT NULL;

ALTER TABLE trust_account_records ALTER COLUMN recorded_by TYPE TEXT;
ALTER TABLE trust_account_records ALTER COLUMN recorded_by SET NOT NULL;

ALTER TABLE notifications ALTER COLUMN recipient_id TYPE TEXT;
ALTER TABLE notifications ALTER COLUMN recipient_id SET NOT NULL;

ALTER TABLE user_profiles ALTER COLUMN member_id TYPE TEXT;
ALTER TABLE user_profiles ALTER COLUMN member_id SET NOT NULL;

-- 6. Re-add FK constraints with TEXT-to-TEXT references
ALTER TABLE matter_team_members ADD CONSTRAINT matter_team_members_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES firm_members(id) ON DELETE CASCADE;
ALTER TABLE matter_events ADD CONSTRAINT matter_events_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES firm_members(id) ON DELETE SET NULL;
ALTER TABLE matter_tasks ADD CONSTRAINT matter_tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES firm_members(id) ON DELETE SET NULL;
ALTER TABLE document_versions ADD CONSTRAINT document_versions_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES firm_members(id) ON DELETE SET NULL;
ALTER TABLE document_access_logs ADD CONSTRAINT document_access_logs_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES firm_members(id) ON DELETE SET NULL;
ALTER TABLE popia_consents ADD CONSTRAINT popia_consents_captured_by_fkey 
    FOREIGN KEY (captured_by) REFERENCES firm_members(id) ON DELETE RESTRICT;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES firm_members(id) ON DELETE RESTRICT;
ALTER TABLE trust_account_records ADD CONSTRAINT trust_account_records_recorded_by_fkey 
    FOREIGN KEY (recorded_by) REFERENCES firm_members(id) ON DELETE RESTRICT;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES firm_members(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES firm_members(id) ON DELETE CASCADE;

-- 7. Re-create RLS policies (from 20260525000001_enable_rls.sql but updated with TEXT comparisons)
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_account_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE popia_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

-- Helper function for multi-tenant isolation (supabase.auth.uid() returns Clerk user ID as text)
CREATE OR REPLACE FUNCTION get_auth_firm_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('app.current_firm_id', true)::UUID),
    (SELECT firm_id FROM firm_members WHERE id = auth.uid()::TEXT LIMIT 1)
  );
$$;

-- Firms
CREATE POLICY select_firms ON firms FOR SELECT USING (id = get_auth_firm_id());
CREATE POLICY insert_firms ON firms FOR INSERT WITH CHECK (true);
CREATE POLICY update_firms ON firms FOR UPDATE USING (id = get_auth_firm_id());

-- Firm Members
CREATE POLICY select_members ON firm_members FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_members ON firm_members FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_members ON firm_members FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_members ON firm_members FOR DELETE USING (firm_id = get_auth_firm_id());

-- Clients
CREATE POLICY select_clients ON clients FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_clients ON clients FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_clients ON clients FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_clients ON clients FOR DELETE USING (firm_id = get_auth_firm_id());

-- Matters
CREATE POLICY select_matters ON matters FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_matters ON matters FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_matters ON matters FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_matters ON matters FOR DELETE USING (firm_id = get_auth_firm_id());

-- Documents
CREATE POLICY select_documents ON documents FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_documents ON documents FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_documents ON documents FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_documents ON documents FOR DELETE USING (firm_id = get_auth_firm_id());

-- Document Versions
CREATE POLICY select_doc_versions ON document_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));
CREATE POLICY insert_doc_versions ON document_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));
CREATE POLICY update_doc_versions ON document_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));
CREATE POLICY delete_doc_versions ON document_versions FOR DELETE USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));

-- Document Access Logs
CREATE POLICY select_doc_access_logs ON document_access_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));
CREATE POLICY insert_doc_access_logs ON document_access_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_id AND documents.firm_id = get_auth_firm_id()));

-- Parties
CREATE POLICY select_parties ON parties FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_parties ON parties FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_parties ON parties FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_parties ON parties FOR DELETE USING (firm_id = get_auth_firm_id());

-- Matter Parties
CREATE POLICY select_matter_parties ON matter_parties FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_matter_parties ON matter_parties FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_matter_parties ON matter_parties FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY delete_matter_parties ON matter_parties FOR DELETE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Matter Deadlines
CREATE POLICY select_deadlines ON matter_deadlines FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_deadlines ON matter_deadlines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_deadlines ON matter_deadlines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY delete_deadlines ON matter_deadlines FOR DELETE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Matter Events
CREATE POLICY select_events ON matter_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_events ON matter_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_events ON matter_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY delete_events ON matter_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Matter Tasks
CREATE POLICY select_tasks ON matter_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_tasks ON matter_tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_tasks ON matter_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY delete_tasks ON matter_tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Matter Team Members
CREATE POLICY select_team_members ON matter_team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_team_members ON matter_team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_team_members ON matter_team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY delete_team_members ON matter_team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Time Entries
CREATE POLICY select_time_entries ON time_entries FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_time_entries ON time_entries FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_time_entries ON time_entries FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_time_entries ON time_entries FOR DELETE USING (firm_id = get_auth_firm_id());

-- Trust Account Records
CREATE POLICY select_trust_records ON trust_account_records FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_trust_records ON trust_account_records FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());
CREATE POLICY update_trust_records ON trust_account_records FOR UPDATE USING (firm_id = get_auth_firm_id());
CREATE POLICY delete_trust_records ON trust_account_records FOR DELETE USING (firm_id = get_auth_firm_id());

-- Invoices
CREATE POLICY select_invoices ON invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY insert_invoices ON invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));
CREATE POLICY update_invoices ON invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matters WHERE matters.id = matter_id AND matters.firm_id = get_auth_firm_id()));

-- Invoice Line Items
CREATE POLICY select_invoice_line_items ON invoice_line_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND EXISTS (
    SELECT 1 FROM matters WHERE matters.id = invoices.matter_id AND matters.firm_id = get_auth_firm_id())));
CREATE POLICY insert_invoice_line_items ON invoice_line_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND EXISTS (
    SELECT 1 FROM matters WHERE matters.id = invoices.matter_id AND matters.firm_id = get_auth_firm_id())));
CREATE POLICY update_invoice_line_items ON invoice_line_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND EXISTS (
    SELECT 1 FROM matters WHERE matters.id = invoices.matter_id AND matters.firm_id = get_auth_firm_id())));
CREATE POLICY delete_invoice_line_items ON invoice_line_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND EXISTS (
    SELECT 1 FROM matters WHERE matters.id = invoices.matter_id AND matters.firm_id = get_auth_firm_id())));

-- Notifications
CREATE POLICY select_notifications ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = recipient_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY insert_notifications ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = recipient_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY update_notifications ON notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = recipient_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY delete_notifications ON notifications FOR DELETE USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = recipient_id AND firm_members.firm_id = get_auth_firm_id()));

-- User Profiles
CREATE POLICY select_profiles ON user_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = member_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY insert_profiles ON user_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = member_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY update_profiles ON user_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = member_id AND firm_members.firm_id = get_auth_firm_id()));
CREATE POLICY delete_profiles ON user_profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM firm_members WHERE firm_members.id = member_id AND firm_members.firm_id = get_auth_firm_id()));

-- POPIA Consents
CREATE POLICY select_popia_consents ON popia_consents FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY insert_popia_consents ON popia_consents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY update_popia_consents ON popia_consents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY delete_popia_consents ON popia_consents FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));

-- Audit Logs
CREATE POLICY select_audit_logs ON audit_logs FOR SELECT USING (firm_id = get_auth_firm_id());
CREATE POLICY insert_audit_logs ON audit_logs FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());

-- Client Portal Access
CREATE POLICY select_portal_access ON client_portal_access FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY insert_portal_access ON client_portal_access FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY update_portal_access ON client_portal_access FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
CREATE POLICY delete_portal_access ON client_portal_access FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.firm_id = get_auth_firm_id()));
