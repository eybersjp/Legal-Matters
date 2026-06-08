-- Production Cleanup Script
-- Use this script before promoting to production to drop development/staging RLS verification functions.
-- This ensures no testing or data-mutating functions remain in the production database.

DROP FUNCTION IF EXISTS verify_rls_helpers();
DROP FUNCTION IF EXISTS verify_rls_tenant_isolation();
