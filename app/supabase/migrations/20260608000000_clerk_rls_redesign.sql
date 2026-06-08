-- Drop old functions to ensure clean definitions
DROP FUNCTION IF EXISTS get_auth_firm_id();
DROP FUNCTION IF EXISTS get_auth_role();
DROP FUNCTION IF EXISTS get_auth_user_id();

-- 1. Create helper function get_auth_user_id() safely extracting text user ID from Clerk JWT
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), 'null')::jsonb;
  IF claims IS NULL OR jsonb_typeof(claims) != 'object' THEN
    RETURN NULL;
  END IF;
  RETURN nullif(claims ->> 'sub', '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 2. Redefine get_auth_firm_id() as SECURITY DEFINER to avoid RLS recursion and use get_auth_user_id()
CREATE OR REPLACE FUNCTION get_auth_firm_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_firm_id', true), '')::UUID,
    (SELECT firm_id FROM firm_members WHERE id = get_auth_user_id() LIMIT 1)
  );
$$;

-- 3. Redefine get_auth_role() as SECURITY DEFINER using get_auth_user_id()
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS VARCHAR
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM firm_members WHERE id = get_auth_user_id() LIMIT 1;
$$;

-- 4. Grant execution permissions on public helpers to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_auth_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auth_firm_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auth_role() TO anon, authenticated;

-- 5. Define verification function (accessible ONLY by service_role)
CREATE OR REPLACE FUNCTION verify_rls_helpers()
RETURNS TABLE(test_name TEXT, passed BOOLEAN, result_val TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm_id UUID := 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_user_id TEXT := 'user_test_12345';
BEGIN
  -- Setup clean environment for test data
  DELETE FROM firm_members WHERE id = v_user_id;
  DELETE FROM firms WHERE id = v_firm_id;
  
  -- Insert mock data
  INSERT INTO firms (id, name) VALUES (v_firm_id, 'Test Firm RLS');
  INSERT INTO firm_members (id, firm_id, role) VALUES (v_user_id, v_firm_id, 'Partner');

  -- Test 1: get_auth_user_id when claims are set
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id)::text, true);
  test_name := 'get_auth_user_id() returns sub claim';
  result_val := get_auth_user_id();
  passed := (result_val = v_user_id);
  RETURN NEXT;

  -- Test 2: get_auth_firm_id resolves from firm_members
  test_name := 'get_auth_firm_id() resolves from firm_members';
  result_val := get_auth_firm_id()::text;
  passed := (result_val = v_firm_id::text);
  RETURN NEXT;

  -- Test 3: get_auth_role resolves from firm_members
  test_name := 'get_auth_role() resolves from firm_members';
  result_val := get_auth_role();
  passed := (result_val = 'Partner');
  RETURN NEXT;

  -- Test 4: get_auth_firm_id respects current_setting('app.current_firm_id')
  PERFORM set_config('app.current_firm_id', 'eaeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee', true);
  test_name := 'get_auth_firm_id() respects app.current_firm_id override';
  result_val := get_auth_firm_id()::text;
  passed := (result_val = 'eaeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee');
  RETURN NEXT;

  -- Clean up settings
  PERFORM set_config('app.current_firm_id', '', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- Clean up test data
  DELETE FROM firm_members WHERE id = v_user_id;
  DELETE FROM firms WHERE id = v_firm_id;
END;
$$;

-- Secure verify_rls_helpers so only the service_role key can execute it
REVOKE ALL ON FUNCTION verify_rls_helpers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_helpers() TO service_role;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
