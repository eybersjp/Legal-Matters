-- Clerk RLS Tenant Isolation Test
-- Run this script in psql or the Supabase SQL editor to verify tenant isolation.

BEGIN;

-- 1. Setup mock data using valid UUIDs
DO $$
DECLARE
  v_firm_a UUID := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  v_firm_b UUID := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  v_user_a TEXT := 'user_test_a_123';
  v_user_b TEXT := 'user_test_b_456';
  v_user_c TEXT := 'user_test_c_789'; -- has no firm_members record
  
  v_client_a UUID := '11111111-1111-4111-1111-111111111111';
  v_client_b UUID := '22222222-2222-4222-2222-222222222222';
  
  v_matter_a UUID := 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  v_matter_b UUID := 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
BEGIN
  -- Cleanup pre-existing mock records if any
  DELETE FROM matters WHERE id IN (v_matter_a, v_matter_b);
  DELETE FROM clients WHERE id IN (v_client_a, v_client_b);
  DELETE FROM firm_members WHERE id IN (v_user_a, v_user_b, v_user_c);
  DELETE FROM firms WHERE id IN (v_firm_a, v_firm_b);
  
  -- Insert mock firms
  INSERT INTO firms (id, name, lpc_registration_number) VALUES (v_firm_a, 'Firm A', 'LPC-A-12345');
  INSERT INTO firms (id, name, lpc_registration_number) VALUES (v_firm_b, 'Firm B', 'LPC-B-67890');
  
  -- Insert mock firm members
  INSERT INTO firm_members (id, firm_id, role) VALUES (v_user_a, v_firm_a, 'Partner');
  INSERT INTO firm_members (id, firm_id, role) VALUES (v_user_b, v_firm_b, 'Associate');
  
  -- Insert mock clients
  INSERT INTO clients (id, firm_id, type, first_name, last_name, email, phone_number) 
  VALUES (v_client_a, v_firm_a, 'Individual', 'Sipho', 'Nkosi', 'sipho@firm-a.co.za', '+27831111111');
  INSERT INTO clients (id, firm_id, type, first_name, last_name, email, phone_number) 
  VALUES (v_client_b, v_firm_b, 'Individual', 'Teboho', 'Molefe', 'teboho@firm-b.co.za', '+27832222222');
  
  -- Insert mock matters
  INSERT INTO matters (id, firm_id, client_id, title, case_number, status) 
  VALUES (v_matter_a, v_firm_a, v_client_a, 'Matter Firm A', '100/2026', 'Intake');
  INSERT INTO matters (id, firm_id, client_id, title, case_number, status) 
  VALUES (v_matter_b, v_firm_b, v_client_b, 'Matter Firm B', '200/2026', 'Intake');
END;
$$;

-- 2. Switch local role to authenticated
SET LOCAL ROLE authenticated;

-- Test 2a: User A can read Firm A matter
SELECT set_config('request.jwt.claims', json_build_object('sub', 'user_test_a_123')::text, true);
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM matters WHERE id = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Test Failed: User A cannot read Firm A matter (count = %)', v_count;
  END IF;
END;
$$;

-- Test 2b: User A cannot read Firm B matter
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM matters WHERE id = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Test Failed: User A can read Firm B matter (count = %)', v_count;
  END IF;
END;
$$;

-- Test 3a: User B can read Firm B matter
SELECT set_config('request.jwt.claims', json_build_object('sub', 'user_test_b_456')::text, true);
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM matters WHERE id = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Test Failed: User B cannot read Firm B matter (count = %)', v_count;
  END IF;
END;
$$;

-- Test 3b: User B cannot read Firm A matter
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM matters WHERE id = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Test Failed: User B can read Firm A matter (count = %)', v_count;
  END IF;
END;
$$;

-- Test 4: User C with no firm_members row reads zero tenant-owned records
SELECT set_config('request.jwt.claims', json_build_object('sub', 'user_test_c_789')::text, true);
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM matters WHERE id IN ('cccccccc-cccc-4ccc-cccc-cccccccccccc', 'dddddddd-dddd-4ddd-dddd-dddddddddddd');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Test Failed: User C read tenant records (count = %)', v_count;
  END IF;
END;
$$;

-- Test 5: Clerk-style text user IDs do not crash helper functions
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := get_auth_user_id();
  IF v_user_id <> 'user_test_c_789' THEN
    RAISE EXCEPTION 'Test Failed: Clerk-style ID did not resolve correctly (user_id = %)', v_user_id;
  END IF;
END;
$$;

-- Test 6: Missing JWT claims do not crash helper functions
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := get_auth_user_id();
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Test Failed: Missing claims did not return NULL';
  END IF;
END;
$$;

-- Test 7: Empty JWT claims do not crash helper functions
SELECT set_config('request.jwt.claims', '{}', true);
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := get_auth_user_id();
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Test Failed: Empty claims did not return NULL';
  END IF;
END;
$$;

ROLLBACK;
