# Technical Specification: Legal Matters MVP v1

**South African Legal Practice Management Platform (MVP v1)**  
**Compliance Scope: POPIA 2013, ECTA 2002, NCA 2005, LSSA Practice Rules, Constitution of South Africa (1996)**

---

## 1. Project Overview

### Title
Legal Matters

### Description
Legal Matters is a South African legal practice management SaaS platform built to serve solo attorneys, boutique firms, mid-market firms, legal-aid organisations, and eventually enterprise/government legal teams. The MVP v1 establishes a secure, compliant, and highly performant foundational layer to run everyday legal practice operations (matter file management, client/party registries, court deadline calculators, document management, time entries, basic billing, and trust account tracking) on a modern Next.js and Supabase architecture.

### Business Value
South African legal practitioners face severe administrative overhead due to fragmented, legacy systems that lack native local compliance. Legal Matters provides a unified workspace that embeds POPIA data protection, strict attorney-client privilege boundaries, and automated Rules of Court compliance natively. By doing so, it dramatically reduces compliance failure risks (such as a R10m POPIA fine), eliminates missed court deadlines (which lead to negligence claims and LSSA suspensions), and streamlines billing from the initial intake to final invoice.

### Compliance Scope
- **POPIA (2013)**: Mandatory consent logging, audit logs of all personal data accesses, field-level encryption for sensitive PII, automated data deletion, and data subject export/access flows.
- **ECTA (2002)**: Complete, unalterable digital audit trails for file uploads, electronic signatures, and tamper-proof electronic communications.
- **Attorneys Act 1979 / Legal Practice Act 2014 & LSSA Practice Rules**: Strict separation of corporate operating funds and client trust accounts (metadata-level), strict matter-level access controls to preserve attorney-client privilege and work-product protection.
- **Constitution of South Africa (1996)**: Section 34 (Access to Courts) facilitated through robust court timeline calculators, and right to privacy (Section 14).
- **National Credit Act (2005)**: Standardised legal billing and interest-bearing fee arrangements complying with credit check regulations for debt-collection practices.

---

## 2. User Stories & Acceptance Criteria

### Story 1: Firm Accounts and User Authentication
```
As a Legal Practitioner (Attorney or Advocate)
I want to register my firm and authenticate my user account securely
So that I can access my firm's isolated legal database and manage matters safely

Acceptance Criteria:
- Firm creation requires a unique registered name, LSSA/LPC firm number, and VAT number (if applicable).
- User authentication must run via Supabase Auth with strict password complexity (min 12 characters, uppercase, lowercase, number, special character).
- Support Multi-Factor Authentication (MFA) natively at signup/login.
- Successfully authenticated users are assigned to exactly one Firm ID, isolating all queries via Supabase RLS policies.
- System automatically logs an audit trail event for every successful and failed login attempt (including IP and User Agent).

Preconditions:
- Firm number is valid; Supabase Auth service is operational.

Postconditions:
- Firm and User records exist; JWT token containing firm_id, user_role, and user_id is issued to the client.
```

### Story 2: Role-Based Access Control (RBAC)
```
As a Firm Partner / Admin
I want to assign specific roles (Partner, Associate, Paralegal, External Counsel) to firm members
So that I can restrict access to sensitive client files and retain supervision over work-product

Acceptance Criteria:
- Supported roles: 'Partner', 'Associate', 'Paralegal', 'External Counsel', 'Client' (via Portal).
- Only 'Partner' can delete documents, delete matters, or view billing/trust-account summaries.
- 'Paralegal' can create matters and edit files but cannot finalize billing records or change RLS permissions.
- 'External Counsel' can only access specific matters they are explicitly assigned to, with zero visibility into other firm files.
- Modifying a user's role must log an audit entry containing the modifying Partner's ID and old/new roles.

Preconditions:
- Modifying user is authenticated as a 'Partner'.

Postconditions:
- Row Level Security (RLS) policies instantly enforce the updated role permissions.
```

### Story 3: Court Deadline & Case Timeline Management
```
As a Litigation Attorney
I want the system to calculate court deadlines based on jurisdiction rules
So that I prevent default judgments and comply with the Rules of Court

Acceptance Criteria:
- System calculates court deadlines using "Court Days" (excluding Saturdays, Sundays, and SA Public Holidays).
- For High Court rules, standard court vacation periods (recess) must be dynamically factored into calculation rules if applicable.
- User can input a trigger event (e.g., "Service of Summons") and select a rule (e.g., "10 Court Days to file Notice of Intention to Defend").
- The calculated deadline is saved to the Matter Timeline and triggers notifications 5, 2, and 1 day(s) before the due date.
- All deadlines must record the exact rule and formula used for transparent auditing.

Preconditions:
- South African public holiday registry for the calendar year is loaded into the system database.

Postconditions:
- Task/deadline entry is created and linked to the Matter.
```

### Story 4: Document Classification & Privilege Protection
```
As a Litigation Attorney
I want to upload case documents, classify them, and flag privileged/confidential files
So that I prevent accidental discovery disclosures and secure attorney-client communications

Acceptance Criteria:
- Uploads must be stored securely in Supabase Storage with names mapped via random UUIDs to prevent directory traversal.
- User must select a classification (Pleading, Evidence, Correspondence, Internal Memo, Precedent).
- User can flag a document as "Privileged" (Attorney-Client Privilege or Work-Product).
- Privileged files must be completely hidden from any user with the 'External Counsel' or 'Client' role unless explicitly shared by a 'Partner'.
- Generating a "Discovery Schedule" (court-compliant list) must automatically quarantine and separate privileged documents into "Part 2" of the schedule.

Preconditions:
- File metadata is validated (PDF, DOCX, PNG only; max 25MB per file).

Postconditions:
- File is uploaded to Supabase Storage; metadata and privilege flags are stored in the database.
```

---

## 3. Functional Requirements

### 3.1 Firm / Organisation Accounts
- **Account Isolation**: Multitenant database architecture where every row in the `matters`, `clients`, `documents`, and `billing` tables is linked to a `firm_id`.
- **Onboarding Flow**: Verification of South African Legal Practice Council (LPC) practice numbers during sign-up.

### 3.2 User Authentication
- Managed via Supabase Auth.
- Enforced password requirements: minimum 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.
- Multi-factor authentication (TOTP) supported and recommended for all staff.

### 3.3 Role-Based Access Control (RBAC)
- Five distinct application roles with hierarchical permissions:
  1. **Partner**: Full read/write/delete permissions across the entire firm tenant.
  2. **Associate**: Full read/write permissions. Cannot delete matters/documents or access billing records.
  3. **Paralegal**: Create/edit clients, matters, and documents. Cannot delete files or access billing.
  4. **External Counsel**: Access only to explicitly assigned matters. No global tenant visibility.
  5. **Client**: Access via the Client Portal to their specific matters and invoices only.

### 3.4 Client Management
- Maintain a registry of clients categorized as corporate entities or individual natural persons.
- Keep strict records of South African specific identifiers: ID Numbers (13-digit validated), Passport Numbers, and Company Registration Numbers (Format: YYYY/NNNNNN/NN).

### 3.5 Party Management
- Maintain a registry of third parties involved in legal matters (Defendants, Respondents, Co-litigants, Witnesses, Opposing Attorneys, and Advocates).
- Standard conflict-of-interest check: Runs a query across all client and party records to warn attorneys if a new matter matches an existing client or opposing party.

### 3.6 Matter / Case File Management
- Creation of matters with fields for Case Number, Court Jurisdiction (Constitutional Court, Supreme Court of Appeal, High Court, Magistrates Court, Labour Court), Presiding Judge/Magistrate, and status (Intake, Pleadings, Discovery, Trial, Closed).

### 3.7 Matter Timeline
- A chronological, read-only audit log and event feed for each matter, recording filing dates, hearings, client interactions, and status transitions.

### 3.8 Tasks and Deadlines
- Internal task management linked to matters. Assignees receive push/in-app notifications of pending, overdue, or completed tasks.

### 3.9 Basic Court Deadline Tracking
- Court Days Calculator: Employs a public holiday API and calendar lookup to calculate legal deadlines (e.g., 10 court days to file notice of intention to defend, 15 court days to file a plea). Excludes weekends and SA public holidays.

### 3.10 Document Upload & Metadata
- Supabase Storage integration with file verification: blocks executable files, allows PDFs, DOCX, and images up to 25MB. Files are indexed with rich metadata (Author, Date Created, Description, Version).

### 3.11 Document Classification & Privilege
- Automatically flags files containing sensitive legal advice as privileged. Prevents discovery inclusion and blocks Client/External Counsel access.

### 3.12 POPIA Consent Tracking
- Granular consent tracking linked to client records. Tracks consent for processing personal information, communication channels (Email, SMS), and automatically flags records for review upon consent expiration.

### 3.13 Matter-Level Audit Logs
- Automatically records every data access, modification, document view, and configuration change. Logs contain User ID, Timestamp (SAST), Action, Client IP, and User Agent. Immutable in the application layer.

### 3.14 Client Portal Foundation
- Secure client-facing landing page showing matter progress, pending tasks, shared documents, and outstanding invoices.

### 3.15 Time Entries
- Track billable hours and flat-fee items. Fields: Date, Duration (minutes), Billing Rate (ZAR/hour), Description, and Task Category (Drafting, Consultation, Court Appearance, Research).

### 3.16 Basic Billing Records
- Generate pro-forma and tax invoices complying with SA VAT Act requirements (VAT number of firm, VAT number of client, sequential invoice numbering, clear breakdown of disbursements and fees).

### 3.17 Trust-Account Metadata Layer
- Read-only tracking of client funds held in trust per Section 86 of the Legal Practice Act. Prevents mix-up with corporate operational funds at the application level.

### 3.18 Admin Dashboard
- Firm-level analytics: total billable hours, outstanding invoices, trust balances, matter status breakdown, and pending critical deadlines.

---

## 4. Data Model

### Entity Relationship Diagram (Text-based)
```
  ┌──────────────┐             ┌──────────────┐
  │    Firms     │ 1 ────────* │    Users     │
  └──────────────┘             └──────────────┘
         1                            1
         │                            │
         ├──────────* ┌──────────────┐│
         │            │   Clients    │*
         │            └──────────────┘
         │                   1
         │                   │
         ├──────────* ┌──────────────┐
         │            │   Matters    │
         │            └──────────────┘
         │                   1
         │         ┌─────────┼─────────┐
         │         │         │         │
         *         *         *         *
  ┌──────────────┐ │ ┌──────────────┐ │
  │  Documents   │ │ │  AuditLogs   │ │
  └──────────────┘ │ └──────────────┘ │
                   *                  *
            ┌──────────────┐   ┌──────────────┐
            │ TimeEntries  │   │   Invoices   │
            └──────────────┘   └──────────────┘
```

### SQL DDL (PostgreSQL Schema)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FIRMS TABLE
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    lpc_registration_number VARCHAR(100) UNIQUE NOT NULL,
    vat_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 2. USER ROLES ENUM
CREATE TYPE user_role AS ENUM ('Partner', 'Associate', 'Paralegal', 'External Counsel', 'Client');

-- 3. USERS TABLE (Linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID REFERENCES firms(id) ON DELETE RESTRICT,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'Associate',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 4. CLIENTS TABLE
CREATE TYPE client_type AS ENUM ('Individual', 'Corporate');

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    type client_type NOT NULL DEFAULT 'Individual',
    company_name VARCHAR(255),
    registration_number VARCHAR(100), -- YYYY/NNNNNN/NN
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    sa_id_number CHAR(13) CONSTRAINT chk_sa_id CHECK (sa_id_number ~ '^[0-9]{13}$'),
    passport_number VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 5. MATTERS TABLE
CREATE TYPE matter_status AS ENUM ('Intake', 'Pleadings', 'Discovery', 'Trial', 'Closed');

CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    case_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    court_jurisdiction VARCHAR(150),
    status matter_status NOT NULL DEFAULT 'Intake',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 6. PARTIES TABLE
CREATE TYPE party_role AS ENUM ('Plaintiff', 'Defendant', 'Respondent', 'Applicant', 'Witness', 'Opposing Counsel', 'Advocate');

CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    sa_id_number CHAR(13),
    role party_role NOT NULL,
    is_opposing BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 7. DOCUMENTS TABLE
CREATE TYPE doc_classification AS ENUM ('Pleading', 'Evidence', 'Correspondence', 'Internal Memo', 'Precedent');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Correspondence',
    is_privileged BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 9. POPIA CONSENT TABLE
CREATE TABLE popia_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    consented_to_processing BOOLEAN DEFAULT false NOT NULL,
    consented_channels VARCHAR(50)[] NOT NULL, -- {'Email', 'SMS'}
    signed_consent_document_url TEXT,
    captured_by UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 10. TIME ENTRIES
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    duration_minutes INT NOT NULL,
    hourly_rate_zar NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 11. INVOICES
CREATE TYPE invoice_status AS ENUM ('Draft', 'Issued', 'Paid', 'Overdue', 'WrittenOff');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_excluding_vat NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    total_including_vat NUMERIC(12, 2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'Draft',
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);

-- 12. TRUST ACCOUNTS
CREATE TABLE trust_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    trust_ledger_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    section_86_type VARCHAR(50) DEFAULT '86(2)' NOT NULL, -- LPA trust type
    last_reconciled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

---

## 5. API Contracts

All API requests and responses are strictly typed and wrapped in standardized JSON models. For MVP v1, we leverage Next.js API Routes combined with Supabase Auth verification.

### 5.1 POST `/api/v1/clients`
Create a new Client record (Individual or Corporate).

```typescript
import { z } from 'zod';

export const CreateClientSchema = z.object({
  type: z.enum(['Individual', 'Corporate']),
  company_name: z.string().max(255).optional(),
  registration_number: z.string().regex(/^\d{4}\/\d{6}\/\d{2}$/, 'Format must be YYYY/NNNNNN/NN').optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  sa_id_number: z.string().regex(/^\d{13}$/, 'Must be exactly 13 digits').optional(),
  passport_number: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(10).max(20)
});

export type CreateClientRequest = z.infer<typeof CreateClientSchema>;
```

#### Expected Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "8f8b8941-bf74-4b5b-b9d9-fa3e028b123d",
    "type": "Individual",
    "first_name": "Sipho",
    "last_name": "Nkosi",
    "sa_id_number": "9201015678087",
    "email": "sipho@nkosi.co.za",
    "phone_number": "+27831234567"
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-05-25T08:59:00Z"
  }
}
```

---

### 5.2 POST `/api/v1/deadlines`
Calculate a litigation deadline excluding weekends and SA public holidays.

```typescript
export const CalculateDeadlineSchema = z.object({
  trigger_date: z.string().datetime(),
  court_days_count: z.number().int().min(1),
  jurisdiction: z.string()
});
```

#### Expected Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "trigger_date": "2026-05-25T08:00:00Z",
    "court_days_count": 10,
    "calculated_deadline": "2026-06-08T17:00:00Z",
    "public_holidays_skipped": [
      { "date": "2026-06-16", "name": "Youth Day" }
    ]
  }
}
```

---

## 6. Non-Functional Requirements

### Performance
- **API Response Target**: < 250ms (p95) for all transactional endpoints inside South Africa.
- **Supabase Query Performance**: Proper index utilization ensures key lookups execute in < 50ms.
- **Low-Bandwidth Optimization**: Static layout assets cached aggressively to support remote courthouses with weak cellular connections.

### Security & Privilege Protection
- **AES-256 Encryption**: Enforced on sensitive database fields (such as ID numbers and phone numbers) at rest.
- **Supabase Storage Encryption**: Documents are encrypted at rest using envelope encryption within AWS KMS.
- **Zero Exposure of Privilege**: Documents flagged as `is_privileged` must never return metadata in queries executed by users with role `Client` or `External Counsel`.

### Compliance
- **POPIA Audit Trail**: Implements a immutable, append-only trigger system in PostgreSQL to log all reads of clients' personally identifiable information (PII).
- **LSSA Practice Rule Isolation**: RLS is strictly coded to verify `auth.jwt() -> firm_id` before serving any database row.

---

## 7. Constraints & Assumptions

### Technical Constraints
- Supabase Free Tier or Pro limits on compute (PostgreSQL DB size limits must be monitored, with alerts configured at 80% capacity).
- Real-time client syncing must gracefully fall back to polling under poor latency environments (e.g., Rural Magistrates Courts).

### Out of Scope for MVP v1
1. Direct CaseLines API submission (pleadings generated but uploaded manually).
2. Full trust-account reconciliation (only metadata-level ledger balance is tracked).
3. AI-assisted legal drafting.
4. Legal research API integrations (e.g., LexisNexis / Juta search).
5. Self-managed Elasticsearch (Supabase pg_trgm and full-text search utilized instead).
6. Self-managed Kubernetes (Vercel + Supabase Serverless deployment).
7. Native iOS/Android Mobile App (responsive Next.js mobile web view only).
8. Predictive case outcome modelling.
9. Government procurement module.
10. Enterprise SAML SSO (Supabase email/password + TOTP only).

---

## 8. Testing Strategy

### Unit Testing
- Test critical pure logic using Vitest (e.g., court day calculations, invoice VAT math).
- Enforced target: >90% code coverage.

```typescript
// tests/unit/court-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCourtDeadline } from '@/utils/court-calculator';

describe('calculateCourtDeadline', () => {
  it('correctly skips weekends and public holidays', () => {
    // 2026-05-25 is a Monday. 10 court days should fall on 2026-06-08
    const triggerDate = new Date('2026-05-25');
    const deadline = calculateCourtDeadline(triggerDate, 10);
    expect(deadline.toISOString()).toContain('2026-06-08');
  });
});
```

### End-to-End Testing (Playwright)
- Critical user paths are tested end-to-end to verify security and role restrictions.

```typescript
// tests/e2e/privilege-security.spec.ts
import { test, expect } from '@playwright/test';

test('external counsel cannot view privileged documents', async ({ page }) => {
  // Login as External Counsel
  await page.goto('/login');
  await page.fill('input[type="email"]', 'external@counsel.co.za');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');

  // Attempt to load matter documents
  await page.goto('/matters/8f8b8941-bf74-4b5b-b9d9-fa3e028b123d');
  
  // Verify that privileged files are not visible in the list
  const privilegedDoc = page.locator('text=Confidential Memo');
  await expect(privilegedDoc).not.toBeVisible();
});
```

---

## 9. Deployment & Operations

### Deployment Architecture
- **Frontend & API**: Hosted on **Vercel** with global CDN edge deployment.
- **Database & Storage**: Hosted on **Supabase** in the Cape Town AWS region (`af-south-1`) to comply with POPIA's data residency recommendations.

### Environment Variables (.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
PORT=3000
```

---

## 10. Acceptance & Validation

### Go-Live Verification Checklist
- [ ] Supabase Row Level Security (RLS) is active on every single table.
- [ ] Database backup schedule runs daily and has verified restore processes.
- [ ] Every user story's acceptance criteria are verified and green.
- [ ] POPIA privacy consent flow works on individual and corporate client creations.
- [ ] High Court holiday list is verified for the current calendar year.
- [ ] All sensitive files in Supabase Storage are verified to use isolated RLS folders.

---

### Approval and Sign-off

- **Product Owner**: _________________________ Date: _______
- **Legal Counsel / Compliance**: _________________________ Date: _______
- **Tech Lead**: _________________________ Date: _______
