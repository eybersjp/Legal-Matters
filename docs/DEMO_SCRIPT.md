# Phase 2 Stakeholder Demo Script — South African Legal Practice Scenario

This demo script guides stakeholders, product reviewers, and developers through a complete, end-to-end walk-through of the **Legal Matters** platform. The scenario demonstrates everyday litigation management in a South African law practice, highlighting the security boundaries, South African court-day deadline tracking, billing ledgers, and POPIA/LPC case closure compliance gates.

---

## Scenario Setup
- **Practitioner**: Staging Practitioner (Partner at *Staging E2E Test Law Firm*)
- **Staging URL**: [https://legal-matters-two.vercel.app](https://legal-matters-two.vercel.app)
- **Database State**: Pre-seeded via `node scripts/seed-staging.js` with:
  - 5 realistic South African clients (e.g. Sipho Nkosi, Incorporate SA Ltd, Zulu Logistics)
  - 6 matters across different litigation and commercial domains
  - Corresponding tasks, deadlines, time entries, expenses, invoices, and documents.

---

## Step 1: Secure Authentication Gate
1. Navigate to the staging login URL: `https://legal-matters-two.vercel.app/login`.
2. Observe the secure **Clerk Sign-In Form** (production-grade authentication).
3. Enter the test credentials (provided securely via deployment environment variables):
   - **Email**: `E2E_CLERK_EMAIL` value
   - **Password**: `E2E_CLERK_PASSWORD` value
4. Click **Sign In**.
5. *Reviewer Note*: Authentication runs entirely on production-grade Clerk configurations. Mock login and testing overrides are strictly disabled in this staging release candidate, preventing any security bypass.

---

## Step 2: Firm Dashboard & Telemetry Insights
1. Upon logging in, you are redirected to `/dashboard`.
2. Examine the dashboard layout:
   - **Practice Telemetry Bento Cards**: Notice the summary cards showing:
     - **Unbilled WIP (Work In Progress)**: Cumulative unbilled time entries.
     - **Disbursements**: Outstanding unbilled disbursements (expenses).
     - **Outstanding Receivables**: Total amount of unpaid invoices.
     - **Active Matters**: Current count of matters.
   - **Recent Activity Feed**: Real-time audit timeline showing latest events.
   - **Critical Indicators**: Notice alerts for overdue tasks or upcoming court deadlines.
3. *Security Note*: Explain to stakeholders that the dashboard statistics are dynamically calculated on the server side using the practitioner's verified `firm_id` context. Even if database queries run via a service role, the application layer isolates and exposes only the logged-in firm's data, preventing cross-tenant parameter tampering.

---

## Step 3: Matter Inspection — Zulu v MEC for Health
1. In the sidebar or dashboard mat, click **Matters** and open the case titled **"Zulu v MEC for Health (Gauteng)"** (Case Number: `2026/45678`).
2. Observe the restructured **Tabbed Matter Control Center**.
3. **Overview Tab**:
   - Inspect the metadata card: Client (Thabo Zulu), Case Number, Court Jurisdiction (Gauteng High Court), Status (Pleadings).
   - Review the **Matter Health Indicators**: Notice the indicators alerting the practitioner to 1 unresolved task, 1 uncompleted deadline, and 1 unpaid invoice.
4. **Timeline Tab**:
   - View the reverse-chronological event log showing case intake, document additions, and billing milestones.
   - Type a note: *"Consultation scheduled with Advocate Ndlovu"* and click **Add Event**.
   - Note how the timeline updates instantly and writes an isolated event to the database.

---

## Step 4: Tasks & Court Deadlines Management
1. Click the **Tasks** tab:
   - Notice the task board. Observe the pending task *"Draft Plea and Counterclaim"* assigned to the practitioner, with its due date.
   - Observe the completed task *"Consult client Zulu"*.
   - Mark the pending task as **Completed** using the status checkbox.
2. Click the **Deadlines** tab:
   - Notice the calculated court deadlines list.
   - Review the *"Plea Due Date"* deadline. It displays as uncompleted and calculates the remaining days based on South African Court Rules.
   - Click the completion checkbox to mark the plea deadline as **Completed**.
3. *Compliance Note*: These deadlines enforce compliance with court rules. An escalation flag is automatically generated for Partner review if court pleading dates pass without completion.

---

## Step 5: Billing ledgers & Reconciliations
1. Click the **Billing** tab:
   - Review the financial registers:
     - **Unbilled Time Entries**: Renders logged time entries (e.g. drafting pleadings, client consultation).
     - **Disbursements (Expenses)**: Renders logged disbursements (e.g. sheriff service fees, court filing stamps).
     - **Invoices**: Displays issued invoices. Invoice `INV-00000001` is marked **Paid** (ZAR 1,725), while invoice `INV-00000002` is marked **Issued** (ZAR 2,300).
2. **Record EFT Payment Demo**:
   - Under the Payment Recording section, choose `INV-00000002` from the dropdown.
   - Enter `2300` in the amount field, set the payment method to `EFT`, and enter reference `EFT-ZULU-002`.
   - Click **Record Payment**.
   - Notice how `INV-00000002` dynamically updates its status from **Issued** to **Paid** as the cumulative payments match the total due.

---

## Step 6: Document Hub & AI Summaries
1. Click **Documents** in the sidebar or open the document view.
2. Examine the file listing for this matter:
   - *"Summons and Particulars of Claim"* (Status: Approved, Category: Pleading).
   - *"Client Interview Notes"* (Status: Pending, Privilege level: Confidential).
3. Open the **"Client Interview Notes"** to view details:
   - Review the **AI Processing Section**. Renders the mock AI-extracted summary detailing the core claim facts, missing documents list, and suggested next steps.
4. *Data Privacy Note*: Document storage paths are partitioned using server-side generated UUIDs under `firm_id/matter_id/`. This isolates document binaries on the storage bucket and prevents unauthorized practitioners from guessing URL patterns.

---

## Step 7: Guided Closure Checklist (LPC & POPIA compliance)
1. Go back to the **Zulu v MEC for Health** matter page and click the **Close Matter** tab.
2. Observe the checklist indicators:
   - **Incomplete Tasks**: Shows green (since we completed the pending task in Step 4).
   - **Incomplete Deadlines**: Shows green (since we checked off the plea deadline in Step 4).
   - **Unbilled Time/Expenses**: Shows **RED** with blocker: *"Cannot close matter: Unbilled time entries or expenses exist."*
   - **Unpaid Invoices**: Shows green (since we settled the outstanding invoice in Step 5).
3. Try to submit the form without resolving the billing blocks. Observe that the "Close Case" button is disabled and the server rejects any mock submissions.
4. **Demonstrate LPC & POPIA compliance gates**:
   - Show how the wizard prevents case archiving when trust accounts or client bills are unresolved (compliant with LPC guidelines).
   - Point out the POPIA data-retention consent checkbox: *"Practitioner confirms that personal client data will be handled and retained in accordance with POPIA requirements."* This checkbox must be ticked to proceed with closure.
5. Explain to stakeholders that the RLS database layer and the Server Action layers block the closure if these criteria are not met, maintaining structural code integrity.

---

## Step 8: Multi-Tenant Database Isolation Proof (For Technical Reviewers)
1. Explain the **Row Level Security (RLS)** policy model implemented:
   - The platform relies on Postgres RLS policies scoped to `get_auth_firm_id()`.
   - When a user logs in, Clerk injects their identity. Our custom database resolver extracts this and configures the connection session.
   - Any attempt by an external party to view or edit this firm's clients, matters, invoices, or tasks is blocked at the database table level.
   - Proved by **37 automated security regression tests** running against cross-firm data-leakage and parameter tampering vectors.
