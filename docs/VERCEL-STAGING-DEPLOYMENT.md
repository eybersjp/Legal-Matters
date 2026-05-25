# Vercel Staging Deployment Guide

This guide details the step-by-step instructions for deploying the Next.js **Legal Matters** practice portal to **Vercel** staging.

---

## 🛠️ Step 1: Connect Your GitHub Repository
1. Go to the [Vercel Dashboard](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository containing the `legal-matters` project.

---

## ⚙️ Step 2: Configure Staging Environment Variables
Under the **Environment Variables** section in Vercel, add the following parameters:

| Key | Value (Staging Example) | Visibility / Placement |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-staging-id.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5...` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5...` | **Server-side only** (Uncheck "Expose to Client History") |
| `DATABASE_URL` | `postgresql://postgres:pwd@db.your-id.supabase.co:5432/postgres` | **Server-side only** |
| `NEXT_PUBLIC_APP_URL` | `https://staging.your-app-domain.vercel.app` | Public |
| `ENCRYPTION_SECRET_KEY` | `32-character-secure-hex-encryption-key` | **Server-side only** |
| `NEXT_PUBLIC_VAT_RATE_PERCENT` | `15.00` | Public |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | `Africa/Johannesburg` | Public |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en_ZA` | Public |
| `NEXT_PUBLIC_TEST_MODE` | `false` | **Set strictly to `false`** |

### ⚠️ Environment Variable Warnings:
- **Do NOT set `NEXT_PUBLIC_TEST_MODE=true`**: This will bypass authentication and compromise your security posture.
- **Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` client-side**: This key bypasses all RLS rules and must never be loaded in public browser files.
- **Do NOT rely on `.env.local` inside Vercel**: All environment variables must be configured directly via the Vercel Dashboard.

---

## 🏗️ Step 3: Project Configuration Settings

Since the `app/` folder is nested in our repository, the project includes a `vercel.json` at the repo root that **automatically** configures the build settings:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "outputDirectory": ".next",
  "rootDirectory": "app"
}
```

If configuring manually via the Vercel dashboard:
1. **Root Directory**: Set to `app` (not the repo root)
2. **Framework Preset**: Select **Next.js**
3. **Build Command**: `npm run build`
4. **Install Command**: `npm ci`

> [!CAUTION]
> **NEVER set `NODE_ENV` manually in Vercel environment variables.**
> 
> Vercel automatically sets `NODE_ENV=production` for all production and preview deployments.
> Setting it manually to any other value (e.g. `staging`, `development`) causes the build to fail with:
> - `Error: <Html> should not be imported outside of pages/_document`  
> - `TypeError: Cannot read properties of null (reading 'useContext')`
>
> If you need to differentiate staging from production, use `NEXT_PUBLIC_APP_ENV=staging` instead.
>
> **If `NODE_ENV` appears in your Vercel Environment Variables settings — remove it immediately.**

---

## 🚀 Step 4: Staging Deployment Process
1. Click **Deploy**.
2. **Inspect Build Logs**: Monitor compile traces in real-time in the Vercel terminal tab to verify zero build errors.
3. **Open Staging URL**: Click the generated Preview/Staging deployment domain once green.
4. **Run Smoke Test**: Execute the validation tests detailed in [`docs/STAGING-SMOKE-TEST.md`](file:///c:/Users/SSTECH/developments/legal-matters/docs/STAGING-SMOKE-TEST.md).

---

## 🔄 Step 5: Rollback Instructions
If a staging build completes but breaks critical operations:
1. Navigate to the **Deployments** tab in your Vercel project dashboard.
2. Locate the previous working deployment.
3. Click the vertical ellipsis button (`...`) and select **Promote to Production** (or click **Rollback**).
4. Staging will instantly redeploy that snapshot.

---

## 🛠️ Step 6: Troubleshooting Build & Run Failures

### 1. Build Fails with TypeScript Errors
* **Cause**: TypeScript type mismatches or unhandled edge cases in pages/server actions.
* **Fix**: Run `npm run typecheck` locally to confirm all files compile without warnings before pushing to Git.

### 2. Middleware Redirect Loops or 404
* **Cause**: Session verification checks failing due to cookie domain mismatches.
* **Fix**: Ensure that `NEXT_PUBLIC_APP_URL` exactly matches your Vercel deployment URL.

### 3. RLS Access Denied / empty queries
* **Cause**: The authenticated user session token is missing custom claims (`firm_id` or `role`).
* **Fix**: Verify that the user has a linked row in the database `firm_members` table and the claims are properly set in `auth.users.user_metadata`.
