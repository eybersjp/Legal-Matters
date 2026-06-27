# Known Limitations — Phase 2 Release Candidate

This document outlines the known limitations, mock integrations, and boundaries of the **Legal Matters** Phase 2 Release Candidate. These limitations are intentionally documented to guide stakeholders and outline requirements for the subsequent development phases.

---

## 1. Document Hub & AI Text Extraction
- **AI Processing Status**: The document text extraction pipeline is implemented but currently uses simulated outputs. The system processes queued jobs, updates job lifecycles, and creates extraction rows.
- **Limitation**: Text extraction is simulated (labeled as draft placeholders, e.g. `Placeholder extraction for <filename>`). The system does not call a live Gemini API or OCR engine to read document binaries in real time.
- **Future Resolution**: Integrate live Gemini/Genkit extraction in subsequent tasks.

## 2. File Upload & Binary Storage
- **Storage Status**: Fully implemented. Files are uploaded securely to the private `'legal-matters-docs'` Supabase Storage bucket. Access is restricted using custom RLS path validation policies (`firm_id` segment matches the authenticated user's firm context).


## 3. South African Court Days Calculations & Public Holidays
- **Calculation Status**: The deadline calculator accurately excludes Saturdays, Sundays, and standard static public holidays.
- **Limitation**: The calendar calculations rely on a static array of South African public holidays. The engine is not connected to a live calendar API (e.g., Google Calendar public holidays feed or government gazette service), which might fail to capture dynamically declared holidays.
- **Future Resolution**: Integrate a live public holidays API client with caching.

## 4. Billing, Invoices, and EFT Reconciliations
- **Ledger Status**: Fully supports logging time entries, disbursements (expenses), issuing invoices, and recording EFT payment logs with automated status transitions (`Issued` to `Paid`).
- **Limitation**: Bank statement reconciliation is fully manual. Practitioners must type in transaction references and payment amounts. There is no automated bank feed integration (e.g., Stitch or Nedbank API) or payment gateway integration (e.g., PayFast or Yoco).
- **Future Resolution**: Set up automated webhook statement scanning or a PayFast checkout drawer for clients to settle invoices.

## 5. Automated Case Numbering
- **Numbering Status**: Practitioners must manually input the case number (e.g., `2026/45678`) when creating matters.
- **Limitation**: The system does not automatically generate internal practice file numbers (e.g. `ZUL/2026/0001` based on client prefix, year, and sequence).
- **Future Resolution**: Implement an automated file number generator schema customizable by each firm.

## 6. Email and SMS Notifications
- **Alert Status**: System notifications (such as Partner-level deadline escalations) are logged inside the database `notifications` table and rendered in the user notification panel.
- **Limitation**: No external delivery channels are configured. The system does not dispatch real emails (via Resend or SendGrid) or SMS messages (via Twilio or BulkSMS).
- **Future Resolution**: Set up Resend transactional email templates for alerts and client communication summaries.
