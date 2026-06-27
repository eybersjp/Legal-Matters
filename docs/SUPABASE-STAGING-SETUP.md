# Supabase Staging Environment Setup Guide

This guide details the step-by-step instructions for establishing your secure, LPA-compliant Supabase Staging project for the **Legal Matters** platform.

---

## 🛠️ Step 1: Create the Supabase Project
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and log in.
2. Click **New Project** and select your organization.
3. Configure project details:
   - **Suggested Name**: `legal-matters-staging`
   - **Database Password**: Generate a secure, high-entropy password (store it safely).
   - **Region**: Choose `af-south-1` (Cape Town) to comply with data residency preferences.
4. Click **Create new project** and wait for provisioning to complete.

---

## 🔑 Step 2: Extract Connection Credentials
Once the project is active, navigate to **Project Settings** (gear icon) -> **API** and retrieve:
* **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
* **Anon Public API Key** (`anon` `public`): `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* **Service Role API Key** (`service_role` `secret`): `SUPABASE_SERVICE_ROLE_KEY` (Keep this strictly hidden and never share it publicly).

---

## 💾 Step 3: Run Database Migrations
Deploy the database schema, multi-tenancy configurations, and row-level security:
1. Go to the **SQL Editor** in the Supabase Dashboard.
2. Click **New Query**.
3. **Execution Order**:
   - **1st**: Copy the entire contents of [`20260525000000_init_schemas.sql`](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260525000000_init_schemas.sql) and paste it into the editor. Click **Run**.
   - **2nd**: Copy the contents of [`20260525000001_enable_rls.sql`](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260525000001_enable_rls.sql) (attaches RLS rules and active firm boundaries). Click **Run**.
   - **3rd**: Copy [`20260525000002_audit_triggers.sql`](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260525000002_audit_triggers.sql) and run it.
   - **4th**: Copy [`20260526000000_clerk_auth_migration.sql`](file:///c:/Users/SSTECH/developments/legal-matters/app/supabase/migrations/20260526000000_clerk_auth_migration.sql) and run it.

> **What the Clerk migration does:** Changes `firm_members.id` and all 12 child-table FK columns from `UUID` to `TEXT` to store Clerk user IDs (e.g. `user_2abc123`). Drops and re-creates all RLS policies with `auth.uid()::TEXT` comparisons for Clerk compatibility. Drops FK references to `auth.users` (not applicable with Clerk). This migration must be run **after** the RLS and audit trigger migrations.

---

## 🗄️ Step 4: Creating the Document Storage Bucket
1. Go to the **Storage** tab in the Supabase Dashboard.
2. Click **New Bucket**.
3. Configure the bucket:
   - **Name**: `legal-matters-docs` (Must match the name in server actions).
   - **Public Access**: Keep this strictly **Disabled** (Private bucket) to preserve legal privilege.
4. Click **Save**.

### Configure Storage RLS Policies:
To prevent unauthorized access to uploaded files, add policies under **Storage** -> **Policies**:
1. Click **New Policy** -> **For full customization**.
2. **SELECT Policy**:
   - **Name**: `Allow authenticated users to read documents`
   - **Operation**: `SELECT`
   - **Roles**: `authenticated`
   - **Policy Expression**:
     ```sql
     (bucket_id = 'legal-matters-docs'::text) AND (auth.role() = 'authenticated'::text)
     ```
3. **INSERT Policy**:
   - **Name**: `Allow authenticated users to upload documents`
   - **Operation**: `INSERT`
   - **Roles**: `authenticated`
   - **Policy Expression**:
     ```sql
     (bucket_id = 'legal-matters-docs'::text) AND (auth.role() = 'authenticated'::text)
     ```

---

## 👥 Step 5: Provision Staging Onboarding & Admin

> **Note:** User authentication is now handled by **Clerk**. The Clerk sign-up flow replaces the custom registration form. After Clerk verifies the user, the `registerFirm` server action creates the firm record, `firm_members` entry (with the Clerk user ID), `user_profiles` row, and audit logs.

To onboard your first firm account on staging:
1. Navigate to the deployed staging application route: `/register`.
2. Complete the **Clerk-hosted sign-up form** — enter your name, email, and password.
3. After Clerk creates the user, the on-screen **Firm Registration** form will appear — enter your firm's name and South African Legal Practice Council (LPC) practising number.
4. Click **Finalise Practice Registration** to trigger the `registerFirm` server action, which creates the isolated firm, partner profile, and audit logs.
5. Verify the new user appears in [Clerk Dashboard → Users](https://dashboard.clerk.com).

---

## 📊 Step 6: Database Verification Queries
To confirm that your staging project is correctly partitioned and secured, run these check queries in the SQL Editor:

### A. Verify RLS is Active on Core Tables
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('firms', 'firm_members', 'clients', 'matters', 'documents', 'audit_logs');
-- Expected: rowsecurity must be 'true' for all.
```

### B. Verify Storage Bucket is Private
```sql
SELECT id, public 
FROM storage.buckets 
WHERE id = 'legal-matters-docs';
-- Expected: public must be 'false'.
```

### C. Verify Multi-Tenant Policies Exist
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
-- Confirm that firm_id partitioning checks are defined on all SELECT/INSERT statements.
```

---

## 🛠️ Step 7: Common Staging Failure Fixes

### 1. Missing Environment Variables
* **Symptom**: Application page displays generic Supabase connection errors.
* **Fix**: Ensure that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are defined in the Vercel dashboard and match the staging API settings.

### 2. RLS Blocks Everything
* **Symptom**: Dashboard pages load successfully but tables are empty (even after inserting data).
* **Fix**: RLS relies on custom user metadata. When creating users, confirm they are mapped to a valid `firm_id` inside `auth.users.user_metadata`.

### 3. Storage Upload Denied
* **Symptom**: Uploading matter documents returns `403 Forbidden` or bucket errors.
* **Fix**: Confirm that a private bucket named `legal-matters-docs` has been created, and that the SELECT/INSERT storage RLS policies have been successfully created.

### 4. Auth Redirect Loop
* **Symptom**: Infinite redirections between `/login` and `/dashboard`.
* **Fix**: Confirm that you are not setting `E2E_TEST_MODE=true` on staging, as this will conflict with session cookies. Also verify your staging URL is registered in **Clerk Dashboard → Sites → Application URLs**.

### 5. Clerk Migration Not Applied (firm_members.id is still UUID)
* **Symptom**: After registering, the dashboard is empty or server actions return errors about mismatched ID types.
* **Fix**: Confirm that the Clerk auth migration (`20260526000000_clerk_auth_migration.sql`) has been executed. Run this verification query in the SQL Editor:
  ```sql
  SELECT data_type FROM information_schema.columns 
  WHERE table_name = 'firm_members' AND column_name = 'id';
  -- Expected: 'text' (not 'uuid')
  ```

### 6. Firm Registration Succeeds but Dashboard Shows "No Workspace"
* **Symptom**: Registration completes but the login redirects back to an error about no firm workspace.
* **Fix**: Check that the `firm_members` table has a row for the Clerk user ID. Run:
  ```sql
  SELECT * FROM firm_members WHERE id = 'user_2...';
  ```
  If no row exists, re-register or manually insert the mapping.
