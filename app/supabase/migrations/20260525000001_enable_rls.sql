-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES DEFINITION
-- Isolates firms, matter teams, and preserves privilege quarantine
-- ==========================================

-- Extract current custom JWT claims
CREATE OR REPLACE FUNCTION get_auth_firm_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'firm_id')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN auth.jwt() -> 'user_metadata' ->> 'role';
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on core tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE popia_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_account_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. FIRMS TABLE POLICIES
CREATE POLICY select_firms ON firms FOR SELECT
USING (id = get_auth_firm_id());

-- 2. FIRM MEMBERS POLICIES
CREATE POLICY select_members ON firm_members FOR SELECT
USING (firm_id = get_auth_firm_id());

CREATE POLICY insert_members ON firm_members FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

CREATE POLICY update_members ON firm_members FOR UPDATE
USING (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

-- 3. USER PROFILES POLICIES
CREATE POLICY select_profiles ON user_profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM firm_members WHERE id = member_id AND firm_id = get_auth_firm_id()));

CREATE POLICY update_profiles ON user_profiles FOR UPDATE
USING (member_id = auth.uid());

-- 4. CLIENTS POLICIES
CREATE POLICY select_clients ON clients FOR SELECT
USING (
    firm_id = get_auth_firm_id()
    AND (
        get_auth_role() IN ('Partner', 'Associate', 'Paralegal')
        OR (
            get_auth_role() = 'Client'
            AND id = (SELECT client_id FROM client_portal_access WHERE portal_user_id = auth.uid() AND is_enabled = true)
        )
    )
);

CREATE POLICY insert_clients ON clients FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id() AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal'));

CREATE POLICY update_clients ON clients FOR UPDATE
USING (firm_id = get_auth_firm_id() AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal'));

-- 5. MATTERS POLICIES
CREATE POLICY select_matters ON matters FOR SELECT
USING (
    firm_id = get_auth_firm_id()
    AND (
        get_auth_role() IN ('Partner', 'Associate', 'Paralegal')
        OR (
            get_auth_role() = 'External Counsel'
            AND EXISTS (SELECT 1 FROM matter_team_members WHERE matter_id = id AND member_id = auth.uid())
        )
        OR (
            get_auth_role() = 'Client'
            AND client_id = (SELECT client_id FROM client_portal_access WHERE portal_user_id = auth.uid() AND is_enabled = true)
        )
    )
);

CREATE POLICY insert_matters ON matters FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id() AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal'));

CREATE POLICY update_matters ON matters FOR UPDATE
USING (firm_id = get_auth_firm_id() AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal'));

CREATE POLICY delete_matters ON matters FOR DELETE
USING (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

-- 6. DOCUMENTS POLICIES (With Privilege Isolation Quarantine)
CREATE POLICY select_documents ON documents FOR SELECT
USING (
    firm_id = get_auth_firm_id()
    AND (
        get_auth_role() IN ('Partner', 'Associate')
        OR (get_auth_role() = 'Paralegal' AND is_privileged = false)
        OR (
            get_auth_role() IN ('External Counsel', 'Client')
            AND is_privileged = false
            AND EXISTS (SELECT 1 FROM matter_team_members WHERE matter_id = documents.matter_id AND member_id = auth.uid())
        )
    )
);

CREATE POLICY insert_documents ON documents FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id() AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal'));

CREATE POLICY delete_documents ON documents FOR DELETE
USING (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

-- 7. AUDIT LOGS POLICIES (Immutable reads/writes)
CREATE POLICY select_audit ON audit_logs FOR SELECT
USING (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

CREATE POLICY insert_audit ON audit_logs FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id());

-- 8. TRUST ACCOUNT METADATA POLICIES
CREATE POLICY select_trust ON trust_account_records FOR SELECT
USING (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');

CREATE POLICY insert_trust ON trust_account_records FOR INSERT
WITH CHECK (firm_id = get_auth_firm_id() AND get_auth_role() = 'Partner');
