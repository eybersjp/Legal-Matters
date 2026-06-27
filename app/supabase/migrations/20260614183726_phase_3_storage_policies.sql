-- Phase 3 Migration: Storage Objects Policies
-- Timestamp: 20260614183726

-- Drop existing policies if they exist to allow clean re-runs
DROP POLICY IF EXISTS "Users can read own firm documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own firm documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own firm documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own firm documents" ON storage.objects;

-- 1. SELECT policy: authenticated users can download documents if their firm_id matches the path segment
CREATE POLICY "Users can read own firm documents" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'legal-matters-docs' AND split_part(name, '/', 1) = public.get_auth_firm_id()::text);

-- 2. INSERT policy: authenticated users can upload documents if their firm_id matches the path segment
CREATE POLICY "Users can insert own firm documents" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'legal-matters-docs' AND split_part(name, '/', 1) = public.get_auth_firm_id()::text);

-- 3. UPDATE policy: authenticated users can update documents if their firm_id matches the path segment
CREATE POLICY "Users can update own firm documents" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'legal-matters-docs' AND split_part(name, '/', 1) = public.get_auth_firm_id()::text)
    WITH CHECK (bucket_id = 'legal-matters-docs' AND split_part(name, '/', 1) = public.get_auth_firm_id()::text);

-- 4. DELETE policy: authenticated users can delete documents if their firm_id matches the path segment
CREATE POLICY "Users can delete own firm documents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'legal-matters-docs' AND split_part(name, '/', 1) = public.get_auth_firm_id()::text);
