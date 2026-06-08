# Clerk-Compatible Row Level Security (RLS) Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Supabase database-side helper functions and Row Level Security (RLS) configurations to be compatible with Clerk's text-based user IDs, prevent UUID-casting crashes, and eliminate infinite recursion on the `firm_members` table.

**Architecture:** We will replace direct `auth.uid()` calls (which attempt to cast to UUID) with a new helper `get_auth_user_id()` that extracts the `sub` claim from the JWT claims JSON. We will redefine `get_auth_firm_id()` and `get_auth_role()` as `SECURITY DEFINER` functions with search paths set to `public` to query `firm_members` safely without triggering recursion.

**Tech Stack:** PostgreSQL (Supabase/PostgREST), JavaScript (Node.js script for automated RLS verification), and `@supabase/supabase-js`.

---

## Proposed Changes

### Database Schema & Migration

We will create a new database migration file containing the redefinitions of the RLS helper functions and an in-database unit test helper function.

#### [NEW] [20260608000000_clerk_rls_redesign.sql](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260608000000_clerk_rls_redesign.sql)

- Drop the old `get_auth_firm_id()` and `get_auth_role()` helper functions.
- Create `get_auth_user_id()` returning the string user ID from JWT claims.
- Create `get_auth_firm_id()` as `SECURITY DEFINER` returning `UUID`.
- Create `get_auth_role()` as `SECURITY DEFINER` returning `VARCHAR`.
- Grant execution privileges to anon and authenticated roles.
- Create `verify_rls_helpers()` to test all functions against temporary mock data.

### Verification Scripts

We will create a Node.js verification script to execute the `verify_rls_helpers` RPC function and print the test results.

#### [NEW] [run-rls-tests.js](file:///c:/Users/SSTECH/developments/legal-matters/app/scripts/run-rls-tests.js)

- Parse `.env.local` to retrieve `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Instantiate the Supabase client using the service role key.
- Execute the `verify_rls_helpers` database RPC.
- Print structural results and exit with a non-zero code if any test fails.

### Project Scripts

We will add a script to `package.json` to simplify running database verification.

#### [MODIFY] [package.json](file:///c:/Users/SSTECH/developments/legal-matters/app/package.json)

- Add `"test:db": "node scripts/run-rls-tests.js"` to the `"scripts"` block.

---

### Task 1: Create the SQL Migration for Clerk-Compatible RLS Helper Functions

**Files:**
- Create: `app/supabase/migrations/20260608000000_clerk_rls_redesign.sql`

- [ ] **Step 1: Write the SQL migration code**

Create the file `app/supabase/migrations/20260608000000_clerk_rls_redesign.sql` with the following content:

```sql
-- Drop old functions
DROP FUNCTION IF EXISTS get_auth_firm_id();
DROP FUNCTION IF EXISTS get_auth_role();

-- Create helper function to extract user ID from Clerk JWT
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '');
$$;

-- Create helper function to resolve firm ID (without UUID cast or recursion)
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

-- Create helper function to resolve user role
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS VARCHAR
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM firm_members WHERE id = get_auth_user_id() LIMIT 1;
$$;

-- Grant execution to authenticated and anon roles so the gateway can run them during RLS evaluation
GRANT EXECUTE ON FUNCTION get_auth_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auth_firm_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auth_role() TO anon, authenticated;

-- Test verification function
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

GRANT EXECUTE ON FUNCTION verify_rls_helpers() TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add app/supabase/migrations/20260608000000_clerk_rls_redesign.sql
git commit -m "db: create clerk-compatible and recursion-free rls helper functions"
```

---

### Task 2: Create the Automated Verification Test Script

**Files:**
- Create: `app/scripts/run-rls-tests.js`

- [ ] **Step 1: Write the javascript test script**

Create the file `app/scripts/run-rls-tests.js` with the following content:

```javascript
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function run() {
  console.log('Starting database RLS verification...');

  // 1. Read .env.local manually to get Supabase secrets
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env.local not found at ${envPath}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[match[1]] = val.trim();
    }
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
    process.exit(1);
  }

  // Use service role client to call the test RPC function
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  console.log(`Connecting to Supabase project at ${supabaseUrl}...`);
  
  const { data, error } = await supabase.rpc('verify_rls_helpers');

  if (error) {
    console.error('Error executing verify_rls_helpers RPC:', error);
    process.exit(1);
  }

  console.log('\n--- RLS Verification Test Results ---');
  let allPassed = true;
  data.forEach((row, index) => {
    const statusStr = row.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`[${index + 1}] ${row.test_name}: ${statusStr} (Result: "${row.result_val}")`);
    if (!row.passed) {
      allPassed = false;
    }
  });
  console.log('-------------------------------------\n');

  if (allPassed) {
    console.log('✅ All RLS helper tests passed successfully!');
    process.exit(0);
  } else {
    console.error('❌ Some RLS helper tests failed. Please review the results.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Unexpected error running tests:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add app/scripts/run-rls-tests.js
git commit -m "test: add node database RLS verification script"
```

---

### Task 3: Add test script to package.json

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Write the package.json modification**

Modify `app/package.json` around line 18 to add the `"test:db"` command:

```json
<<<<
    "supabase:stop": "supabase stop",
    "supabase:test": "supabase db test"
  },
====
    "supabase:stop": "supabase stop",
    "supabase:test": "supabase db test",
    "test:db": "node scripts/run-rls-tests.js"
  },
>>>>
```

- [ ] **Step 2: Verify the test script can be triggered**

Run:
```bash
npm run test:db
```
Expected output (after applying the migration):
```
Starting database RLS verification...
Connecting to Supabase project at https://ssjixfvdrzifohvhocgw.supabase.co...

--- RLS Verification Test Results ---
[1] get_auth_user_id() returns sub claim: ✅ PASSED (Result: "user_test_12345")
[2] get_auth_firm_id() resolves from firm_members: ✅ PASSED (Result: "daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
[3] get_auth_role() resolves from firm_members: ✅ PASSED (Result: "Partner")
[4] get_auth_firm_id() respects app.current_firm_id override: ✅ PASSED (Result: "eaeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee")
-------------------------------------

✅ All RLS helper tests passed successfully!
```

- [ ] **Step 3: Commit changes**

Run:
```bash
git add app/package.json
git commit -m "chore: add test:db npm script"
```
