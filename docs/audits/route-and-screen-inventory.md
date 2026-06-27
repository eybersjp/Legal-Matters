# Route and Screen Inventory

| Route | Screen Name | Intended Role | Current Status | Connected Data | Missing Elements | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Landing Page | Public | **COMPLETE** | None | None | Basic responsive layout. |
| `/login` | Practitioner Sign-In | Public | **COMPLETE** | Clerk session | None | Authenticates user dynamically. |
| `/register` | Firm Registration | Public | **COMPLETE** | Creates `firms`, `firm_members`, `user_profiles` | None | Onboards a new practice. |
| `/portal` | Client Portal | Client | **COMPLETE** | General mock overview | Live invoice list and documents vault | Currently acts as a basic landing page. |
| `/dashboard` | Control Center Dashboard | Practitioner | **COMPLETE** | Stats, deadlines, audit logs | None | Bento-grid style layout. |
| `/dashboard/audit` | Security Audit Trail | Partner | **COMPLETE** | `audit_logs` | Export logs button | Strict access protection active. |
| `/dashboard/billing` | Invoicing Hub | Partner / Associate | **PARTIAL** | `invoices`, `time_entries` | Expenses tracking, record payment dialog | Tax invoices are generated but cannot be marked as Paid. |
| `/dashboard/clients` | Clients Directory | Practitioner | **COMPLETE** | `clients` | None | Table of natural/corporate clients. |
| `/dashboard/clients/[id]` | Client Profile & POPIA | Practitioner | **PARTIAL** | `clients`, `popia_consents` | FICA verification checklist | Track PII and consent channels. |
| `/dashboard/deadlines` | Litigation Deadlines | Practitioner | **COMPLETE** | `matter_deadlines` | Recess recalibration options | Calculates days excluding weekends/holidays. |
| `/dashboard/documents` | Global Documents Vault | Partner / Associate | **COMPLETE** | `documents`, `matters` | None | Global list of files across all matters. |
| `/dashboard/firm` | Practice Profile | Partner / Associate | **PARTIAL** | `firms`, `firm_members` | Invite new staff modal, edit roles dialog | Staff list table is currently read-only. |
| `/dashboard/matters` | Matters Registry | Practitioner | **COMPLETE** | `matters`, `clients` | None | Lists case files. |
| `/dashboard/matters/[id]` | Case File & Timeline | Practitioner | **PARTIAL** | `matters`, `matter_events` | Edit matter details, close matter workflow | Timeline records pleading events. |
| `/dashboard/matters/[id]/documents` | Case Document Hub | Practitioner | **COMPLETE** | `documents`, `document_versions`, `document_ai_summaries` | None | Uploads, version history, details drawer, and AI approvals. |
| `/dashboard/parties` | Parties Directory | Practitioner | **COMPLETE** | `parties` | None | Performs active conflict-of-interest checks. |
| `/dashboard/time` | Time Ledger | Practitioner | **COMPLETE** | `time_entries` | None | Records billable hours. |
| `/dashboard/trust` | Section 86 Trust Ledger | Partner / Associate | **COMPLETE** | `trust_account_records` | None | Aggregates trust liability per matter. |
