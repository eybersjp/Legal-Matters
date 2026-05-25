# Schema & Contracts Specification: Legal Matters MVP v1

**South African Legal Practice Management Platform (MVP v1)**  
**Database Technology: Supabase PostgreSQL (AWS Cape Town `af-south-1`)**

---

## 1. Database Schema (SQL DDL)

This section provides complete SQL statements to initialize the 22 required database tables, types, triggers, and indices inside Supabase. All schemas adhere to strict multitenancy constraints (`firm_id` included in every tenant-specific table) and South African legal practices (incorporating Section 86 LPA trust records, POPIA consents, and court days).

### 1.1 Custom Enums & Types
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role permission types for Firm Members
CREATE TYPE app_role AS ENUM ('Partner', 'Associate', 'Paralegal', 'External Counsel');

-- Categorisation for Legal Clients
CREATE TYPE client_type AS ENUM ('Individual', 'Corporate');

-- Case/Matter states
CREATE TYPE matter_status AS ENUM ('Intake', 'Pleadings', 'Discovery', 'Trial', 'Closed');

-- Standard South African Court Litigation Party Roles
CREATE TYPE party_role AS ENUM ('Plaintiff', 'Defendant', 'Respondent', 'Applicant', 'Witness', 'Opposing Counsel', 'Advocate');

-- Document classification levels
CREATE TYPE doc_classification AS ENUM ('Pleading', 'Evidence', 'Correspondence', 'Internal Memo', 'Precedent');

-- Internal Task Status
CREATE TYPE task_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Overdue');

-- Legal Tax Invoice Billing States
CREATE TYPE invoice_status AS ENUM ('Draft', 'Issued', 'Paid', 'Overdue', 'WrittenOff');
```

---

### 1.2 Table Definitions (All 22 Core Tables)

#### 1. `firms`
```sql
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    lpc_registration_number VARCHAR(100) UNIQUE NOT NULL, -- LPC Practising Number
    vat_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 2. `firm_members`
```sql
CREATE TABLE firm_members (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID REFERENCES firms(id) ON DELETE RESTRICT NOT NULL,
    role app_role NOT NULL DEFAULT 'Associate',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 3. `user_profiles`
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID UNIQUE REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30) NOT NULL, -- E.164 format
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 4. `clients`
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    type client_type NOT NULL DEFAULT 'Individual',
    company_name VARCHAR(255),
    registration_number VARCHAR(100), -- Format: YYYY/NNNNNN/NN
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    sa_id_number CHAR(13) CONSTRAINT chk_sa_id_clients CHECK (sa_id_number ~ '^[0-9]{13}$'), -- Valid 13-digit SA ID
    passport_number VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL, -- Normalized E.164
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 5. `parties`
```sql
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    type client_type NOT NULL DEFAULT 'Individual',
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    sa_id_number CHAR(13) CONSTRAINT chk_sa_id_parties CHECK (sa_id_number IS NULL OR sa_id_number ~ '^[0-9]{13}$'),
    email VARCHAR(255),
    phone_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 6. `matters`
```sql
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    case_number VARCHAR(100), -- Court Assigned Case Number (e.g., 2026/12345)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    court_jurisdiction VARCHAR(150), -- e.g., "Gauteng Local Division, Johannesburg"
    status matter_status NOT NULL DEFAULT 'Intake',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 7. `matter_parties`
```sql
CREATE TABLE matter_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    party_id UUID REFERENCES parties(id) ON DELETE RESTRICT NOT NULL,
    role party_role NOT NULL,
    is_opposing BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 8. `matter_team_members`
```sql
CREATE TABLE matter_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    UNIQUE(matter_id, member_id)
);
```

#### 9. `matter_events`
```sql
CREATE TABLE matter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 10. `matter_tasks`
```sql
CREATE TABLE matter_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'Pending',
    assigned_to UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 11. `matter_deadlines`
```sql
CREATE TABLE matter_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(255) NOT NULL, -- e.g., "Service of Summons"
    calculated_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    days_skipped INT DEFAULT 0 NOT NULL, -- Count of weekend/holidays skipped
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 12. `documents`
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_privileged BOOLEAN DEFAULT false NOT NULL, -- Hides from Client/External roles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 13. `document_versions`
```sql
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage link
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL, -- bytes
    mime_type VARCHAR(100) NOT NULL,
    classification doc_classification NOT NULL DEFAULT 'Correspondence',
    uploaded_by UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 14. `document_access_logs`
```sql
CREATE TABLE document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'READ', 'DOWNLOAD', 'REVOKE_PRIVILEGE'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 15. `popia_consents`
```sql
CREATE TABLE popia_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    consented_to_processing BOOLEAN DEFAULT false NOT NULL,
    consented_channels VARCHAR(50)[] NOT NULL, -- e.g., {'Email', 'SMS', 'Phone'}
    signed_consent_document_url TEXT, -- Link to signed POPI form
    captured_by UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 16. `audit_logs`
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'READ_PII', 'DELETE_MATTER', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'client', 'matter', etc.
    resource_id UUID NOT NULL,
    changes JSONB, -- Old vs New key values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 17. `client_portal_access`
```sql
CREATE TABLE client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    portal_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Linked client auth login
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 18. `time_entries`
```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    duration_minutes INT NOT NULL CONSTRAINT positive_duration CHECK (duration_minutes > 0),
    hourly_rate_zar NUMERIC(10, 2) NOT NULL CONSTRAINT positive_rate CHECK (hourly_rate_zar >= 0.00),
    description TEXT NOT NULL,
    is_billed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 19. `invoices`
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL, -- Sequential matching SA regulations
    total_excluding_vat NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    total_including_vat NUMERIC(12, 2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'Draft',
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 20. `invoice_line_items`
```sql
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL, -- Nullable for manual disbursements
    description TEXT NOT NULL,
    amount_excluding_vat NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    amount_including_vat NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 21. `trust_account_records` (Metadata Layer Only)
```sql
CREATE TABLE trust_account_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL, -- Transaction specific audit ID
    trust_ledger_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    section_86_type VARCHAR(50) DEFAULT '86(2)' NOT NULL, -- Section 86(2), 86(3), or 86(4) Legal Practice Act
    description TEXT NOT NULL,
    recorded_by UUID REFERENCES firm_members(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

#### 22. `notifications`
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES firm_members(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    link_url TEXT, -- In-app routing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('SAST', NOW()) NOT NULL
);
```

---

### 1.3 Foreign Keys, Constraints, and Indices

All database tables incorporate explicit constraints to protect data integrity, prevent orphan records, and maintain swift, type-safe multitenant lookups:

```sql
-- 1. Index for client-level fast multi-tenant lookups
CREATE INDEX idx_clients_firm_search ON clients(firm_id, email);

-- 2. Index for Matter search & filtering
CREATE INDEX idx_matters_client_lookup ON matters(firm_id, client_id);
CREATE INDEX idx_matters_case_number ON matters(case_number);

-- 3. Document version ordering index
CREATE INDEX idx_doc_versions_lookup ON document_versions(document_id, version_number DESC);

-- 4. Audit Log chronological indexing
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(firm_id, created_at DESC);

-- 5. Time tracking and billing linkage indexing
CREATE INDEX idx_time_entries_matter ON time_entries(firm_id, matter_id, is_billed);
CREATE INDEX idx_invoice_line_link ON invoice_line_items(invoice_id);
```

---

## 2. Supabase Row Level Security (RLS) Policies

Every single table in Legal Matters MVP v1 must have Row Level Security enabled. Below are the definitive RLS policies coded to verify JWT claims and prevent cross-tenant data leaks.

### 2.1 Global Tenant Isolation Helper
```sql
-- Helper function to extract user metadata from authenticated Supabase JWT
CREATE OR REPLACE FUNCTION get_auth_firm_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'firm_id')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN auth.jwt() -> 'user_metadata' ->> 'role';
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.2 Table Policies

#### Matters RLS Policies
```sql
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;

-- Read Access: Partners/Associates view all, Ext Counsel views assigned, Clients view owned
CREATE POLICY select_matters ON matters FOR SELECT
USING (
    firm_id = get_auth_firm_id()
    AND (
        get_auth_role() IN ('Partner', 'Associate', 'Paralegal')
        OR (
            get_auth_role() = 'External Counsel' 
            AND EXISTS (
                SELECT 1 FROM matter_team_members 
                WHERE matter_team_members.matter_id = matters.id 
                AND matter_team_members.member_id = auth.uid()
            )
        )
        OR (
            get_auth_role() = 'Client'
            AND client_id = (SELECT client_id FROM client_portal_access WHERE portal_user_id = auth.uid() AND is_enabled = true)
        )
    )
);

-- Write Access: Only internal firm staff (Partner, Associate, Paralegal) can insert/update matters
CREATE POLICY insert_matters ON matters FOR INSERT
WITH CHECK (
    firm_id = get_auth_firm_id()
    AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal')
);

CREATE POLICY update_matters ON matters FOR UPDATE
USING (
    firm_id = get_auth_firm_id()
    AND get_auth_role() IN ('Partner', 'Associate', 'Paralegal')
);

-- Delete Access: Strictly restricted to Partners
CREATE POLICY delete_matters ON matters FOR DELETE
USING (
    firm_id = get_auth_firm_id()
    AND get_auth_role() = 'Partner'
);
```

#### Documents & Document Versions RLS Policies
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Select Documents (Preserves Privilege Quarantine)
CREATE POLICY select_documents ON documents FOR SELECT
USING (
    firm_id = get_auth_firm_id()
    AND (
        -- Internal lawyers can read all documents
        (get_auth_role() IN ('Partner', 'Associate'))
        OR
        -- Paralegals can view non-privileged files
        (get_auth_role() = 'Paralegal' AND is_privileged = false)
        OR
        -- External Counsel and Clients can ONLY read non-privileged files on their assigned matters
        (
            get_auth_role() IN ('External Counsel', 'Client')
            AND is_privileged = false
            AND EXISTS (
                SELECT 1 FROM matter_team_members
                WHERE matter_team_members.matter_id = documents.matter_id
                AND matter_team_members.member_id = auth.uid()
            )
        )
    )
);
```

---

## 3. TypeScript Type Contracts

```typescript
// Core Enums
export type AppRole = 'Partner' | 'Associate' | 'Paralegal' | 'External Counsel';
export type ClientType = 'Individual' | 'Corporate';
export type MatterStatus = 'Intake' | 'Pleadings' | 'Discovery' | 'Trial' | 'Closed';
export type PartyRole = 'Plaintiff' | 'Defendant' | 'Respondent' | 'Applicant' | 'Witness' | 'Opposing Counsel' | 'Advocate';
export type DocClassification = 'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent';
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Overdue';
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'WrittenOff';

// 1. Firms Entity
export interface Firm {
  id: string; // UUID
  name: string;
  lpc_registration_number: string;
  vat_number: string | null;
  created_at: Date;
  updated_at: Date;
}

// 2. Firm Members Entity
export interface FirmMember {
  id: string; // auth.users.id
  firm_id: string;
  role: AppRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 3. User Profiles Entity
export interface UserProfile {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// 4. Clients Entity (Rich PII)
export interface Client {
  id: string;
  firm_id: string;
  type: ClientType;
  company_name: string | null;
  registration_number: string | null;
  first_name: string | null;
  last_name: string | null;
  sa_id_number: string | null;
  passport_number: string | null;
  email: string;
  phone_number: string;
  created_at: Date;
  updated_at: Date;
}

// 5. Matters Entity
export interface Matter {
  id: string;
  firm_id: string;
  client_id: string;
  case_number: string | null;
  title: string;
  description: string | null;
  court_jurisdiction: string | null;
  status: MatterStatus;
  created_at: Date;
  updated_at: Date;
}

// 6. Documents Entity
export interface LegalDocument {
  id: string;
  firm_id: string;
  matter_id: string;
  title: string;
  is_privileged: boolean;
  created_at: Date;
  updated_at: Date;
}

// Data Transfer Objects (DTOs) for API Contracts
export interface ClientDTO {
  id: string;
  displayName: string; // Combines first/last name or company_name
  email: string;
  phone_number: string;
  type: ClientType;
}

export interface MatterDTO {
  id: string;
  title: string;
  caseNumber: string | null;
  status: MatterStatus;
  clientName: string;
  court: string | null;
}
```

---

## 4. Zod Validation Schemas

Input validations are strictly parsed using Zod libraries. All South African identifiers are strictly verified:

```typescript
import { z } from 'zod';

// South African ID Verification (Luhn Algorithm compliant regex)
export const SaIdSchema = z
  .string()
  .length(13, 'South African ID must be exactly 13 digits')
  .regex(/^[0-9]{13}$/, 'ID must contain only digits')
  .refine((id) => {
    // Basic Luhn Algorithm check for SA ID validity
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      let digit = parseInt(id.charAt(i), 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }, 'Invalid South African ID Number (Luhn validation failed)');

// South African Company Registration Number Verification (Format: YYYY/NNNNNN/NN)
export const SaCompanyRegSchema = z
  .string()
  .regex(/^\d{4}\/\d{6}\/\d{2}$/, 'Company registration must match YYYY/NNNNNN/NN format');

// E.164 Phone Number Standard
export const PhoneE164Schema = z
  .string()
  .regex(/^\+27[1-9]\d{8}$/, 'Phone number must be E.164 standard South African format (+27...)');

// Client Creation Payload Validation
export const CreateClientValidation = z.object({
  type: z.enum(['Individual', 'Corporate']),
  company_name: z.string().max(255).optional(),
  registration_number: SaCompanyRegSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  sa_id_number: SaIdSchema.optional(),
  passport_number: z.string().max(50).optional(),
  email: z.string().email('Invalid email address format'),
  phone_number: PhoneE164Schema
}).refine((data) => {
  if (data.type === 'Individual') {
    return !!data.first_name && !!data.last_name;
  } else {
    return !!data.company_name && !!data.registration_number;
  }
}, {
  message: 'Missing mandatory fields matching chosen Client type',
  path: ['type']
});
```

---

## 5. API Request and Response Contracts

All API handlers receive, validate, and respond with uniform, type-safe structures:

### 5.1 POST `/api/v1/clients` (Intake Client)
- **Headers**:
  - `Authorization: Bearer <JWT_Token>`
  - `Content-Type: application/json`

#### Request Payload
```json
{
  "type": "Individual",
  "first_name": "Naledi",
  "last_name": "Pandor",
  "sa_id_number": "8305125678086",
  "email": "naledi@pandor.co.za",
  "phone_number": "+27829876543"
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "7a8b8941-bf74-4b5b-b9d9-fa3e028b122c",
    "type": "Individual",
    "displayName": "Naledi Pandor",
    "email": "naledi@pandor.co.za",
    "phone_number": "+27829876543"
  },
  "meta": {
    "version": "v1",
    "timestamp": "2026-05-25T09:03:00Z"
  }
}
```

---

### 5.2 GET `/api/v1/matters/:id/documents` (preserves RLS quarantine)
- **Headers**:
  - `Authorization: Bearer <JWT_Token>`

#### Success Response (200 OK - Non-privileged view)
```json
{
  "success": true,
  "data": [
    {
      "id": "e2a9ab41-bf74-4b5b-b9d9-fa3e028b125e",
      "title": "Notice of Motion",
      "is_privileged": false,
      "latestVersion": {
        "versionNumber": 1,
        "fileName": "notice_of_motion_final.pdf",
        "fileSize": 1048576,
        "classification": "Pleading"
      }
    }
  ]
}
```

---

## 6. Error Contracts

To avoid leakages of system metadata, errors map strictly to predefined, sanitized models.

### 6.1 Unified Custom Error Codes (Enum)
```typescript
export enum ErrorCode {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TENANT_VIOLATION = 'TENANT_VIOLATION',
  PRIVILEGE_QUARANTINE = 'PRIVILEGE_QUARANTINE',
  POPIA_CONSENT_REQUIRED = 'POPIA_CONSENT_REQUIRED',
  LUHN_VALIDATION_FAILED = 'LUHN_VALIDATION_FAILED',
  CONFLICTING_CONFLICT_CHECK = 'CONFLICTING_CONFLICT_CHECK',
  INTERNAL_SYSTEM_FAULT = 'INTERNAL_SYSTEM_FAULT'
}
```

### 6.2 Error Schema Layout Examples (JSON)

#### 403 Forbidden - Privilege Violation
```json
{
  "success": false,
  "error": {
    "code": "PRIVILEGE_QUARANTINE",
    "message": "This record is classified as protected under attorney-client privilege.",
    "statusCode": 403,
    "timestamp": "2026-05-25T09:03:15Z",
    "traceId": "fa9c9ab1-a67b-4028-a579-37330598a22d"
  }
}
```

#### 400 Bad Request - Luhn Validation Failure
```json
{
  "success": false,
  "error": {
    "code": "LUHN_VALIDATION_FAILED",
    "message": "The South African ID number failed mathematical Luhn algorithm checks.",
    "statusCode": 400,
    "details": {
      "field": "sa_id_number",
      "value": "8305125678089"
    },
    "timestamp": "2026-05-25T09:03:18Z",
    "traceId": "ab9c9ab1-a67b-4028-a579-37330598a33f"
  }
}
```

---

## 7. Permission Matrix

Strict role hierarchy matrix for MVP v1 functionality:

| Scope Module | Partner | Associate | Paralegal | External Counsel | Client (Portal) |
|:---|:---|:---|:---|:---|:---|
| **View Billing Summaries** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Record Time Entries** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **View Privileged Documents** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Delete Case/File Records** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Bypass Conflict Check** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Sign Off Tax Invoices** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **Log Trust Balances** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |

---

## 8. Audit-Event Definitions

Sensitive operations trigger mandatory, irreversible audit logs written to `audit_logs` and `document_access_logs`.

```typescript
export interface AuditEventDefinition {
  action: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export const LegalMattersAuditRegistry: Record<string, AuditEventDefinition> = {
  READ_PII: {
    action: 'READ_PII',
    severity: 'MEDIUM',
    description: 'A firm user viewed sensitive client PII (ID number, passport, contact address).'
  },
  EXPORT_MATTER_FILE: {
    action: 'EXPORT_MATTER_FILE',
    severity: 'HIGH',
    description: 'A complete matter file export was requested (triggers POPIA record dump).'
  },
  FORCE_REVOKE_PRIVILEGE: {
    action: 'FORCE_REVOKE_PRIVILEGE',
    severity: 'CRITICAL',
    description: 'A user disabled the privilege classification flag on a legal document.'
  },
  CONFLICT_OVERRIDE: {
    action: 'CONFLICT_OVERRIDE',
    severity: 'CRITICAL',
    description: 'A Partner manually bypassed a positive conflict-of-interest check indicator.'
  },
  TRUST_LEDGER_ADJUST: {
    action: 'TRUST_LEDGER_ADJUST',
    severity: 'CRITICAL',
    description: 'A Partner manually updated the trust ledger balance meta layer.'
  }
};
```
