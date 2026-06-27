# Next Phase Recommendations — Phase 3 Technical Roadmap

This document outlines the recommended technical roadmap and architectural directions for **Phase 3** of the **Legal Matters** practice management platform, building directly on the stable Phase 2 Release Candidate.

---

## 1. Live AI Document Processing (Genkit & Gemini Integration)
- **Objective**: Connect the document hub to a live LLM to perform automated extraction of South African pleading details and document summarization.
- **Recommendations**:
  - Implement a secure background processing queue (e.g. Next.js Server Actions with Vercel Background Functions or a database-backed job runner).
  - Use **Google Genkit** and the **Gemini 1.5 Pro/Flash** model.
  - Implement strict schema-guided extraction using structured JSON outputs to resolve client details, case numbers, and litigation events.
  - Hardened checks: Ensure that document data passed to the LLM does not cross tenant boundaries. Ensure the prompt context contains strict firm/tenant headers.

## 2. Supabase Storage Integration
- **Objective**: Replace simulated storage uploads with actual binary storage partitioned by firm.
- **Recommendations**:
  - Configure a private Supabase Storage bucket (`legal-documents`).
  - Set up Supabase RLS policies on the storage objects schema using a custom SQL function:
    ```sql
    CREATE POLICY "Firm document access" ON storage.objects
      FOR ALL USING (bucket_id = 'legal-documents' AND (storage.foldername(name))[1] = get_auth_firm_id());
    ```
  - Enforce server-side signed URL generation for viewing files to prevent direct access to static paths.

## 3. Automated EFT & Billing Integrations (PayFast/Yoco & Stitch)
- **Objective**: Automate invoice settlement and client trust account tracking.
- **Recommendations**:
  - **Client-Facing Payments**: Embed a PayFast checkout gateway inside the client portal, allowing clients to settle invoices via credit card or Instant EFT. Upon successful payment, configure a webhook listener to automatically trigger the `recordPayment` action.
  - **Practitioner Bank Feeds**: Integrate Stitch API to scan practitioners' bank statements for matching transaction references (e.g., `INV-00000002`) and reconcile invoices automatically.

## 4. Live Public Holidays API Integration
- **Objective**: Replace the static public holidays list with an automated, live feed.
- **Recommendations**:
  - Connect the court-days calculation service to the Calendrific API or a public South African government holidays endpoint.
  - Implement a Redis or database caching layer with a 30-day TTL to avoid blocking requests on external API failures.
  - Support fallback to the static array if the external holiday API is unreachable.

## 5. Delivery Channels (Email & SMS notifications)
- **Objective**: Dispatch escalations and alerts to practitioners and clients.
- **Recommendations**:
  - Integrate **Resend** or **Amazon SES** for transactional emails (e.g., matter closure confirmation, invoice delivery).
  - Integrate **Twilio** or **BulkSMS** for South African SMS alerts (e.g., urgent court deadlines).
  - Manage user communication preferences (opt-in/opt-out) inside the `user_profiles` table to maintain POPIA compliance.

## 6. PDF Invoice Generator
- **Objective**: Generate professional, LPC-compliant tax invoices as PDFs.
- **Recommendations**:
  - Use `react-pdf` or `puppeteer-core` on the server side to compile HTML invoices into printable PDF binaries.
  - Automatically attach the PDF to email notifications and save it under the matter's document hub.
