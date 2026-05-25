# Architecture Design Document: Legal Matters MVP v1

**South African Legal Practice Management Platform (MVP v1)**  
**Architecture Style: Modular Monolith | Stack: Next.js App Router & Supabase**

---

## 1. Architecture Overview

Legal Matters MVP v1 uses a **Modular Monolith** architecture style, built on **Next.js App Router** (React & TypeScript) and backed by **Supabase** (PostgreSQL, Auth, Storage, and Real-time engines). 

```
┌────────────────────────────────────────────────────────┐
│               Client Applications (Browsers)           │
│        (Solo Attorneys, Boutique Staff, Clients)       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS (Next.js SSR / RPC)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Next.js App Router                   │
│        (Vercel Edge Servers / Serverless Compute)      │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │   UI Components &     │   │      API Routes      │  │
│  │   Server Components   ├───►   (Route Handlers)   │  │
│  └───────────────────────┘   └──────────┬───────────┘  │
└─────────────────────────────────────────┼──────────────┘
                                          │ Supabase Client / PostgreSQL Connect
                                          ▼
┌────────────────────────────────────────────────────────┐
│                 Supabase Cloud Platform                │
│    (AWS Cape Town af-south-1 - POPIA Compliant Data)   │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │ Supabase Auth │  │  PostgreSQL   │  │  Supabase  │  │
│  │  (MFA/JWT)    │  │  Engine & RLS │  │  Storage   │  │
│  └───────────────┘  └───────────────┘  └────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Strategic Architectural Decisions & Rationales

1. **Modular Monolith over Microservices**:
   - *Decision*: Next.js App Router acts as a unified platform (UI + API routes) while database-level modularity is managed via isolated schema tables and foreign keys.
   - *Rationale*: A microservices architecture introduces excessive networking overhead, distributed transaction complexity, and massive infrastructure costs that are unjustifiable for MVP v1. A modular monolith simplifies deployment (single Vercel target), reduces latency, and speeds up iteration loops while maintaining strict code separation.

2. **Supabase Serverless vs Self-Hosted Kubernetes & DBs**:
   - *Decision*: Fully-managed Supabase on Vercel, deployed in the AWS Cape Town (`af-south-1`) region.
   - *Rationale*: Kubernetes, self-managed databases, and custom infrastructure setups require dedicated DevOps resources and increase cost. Supabase provides ACID-compliant PostgreSQL, instant Row Level Security (RLS), ready-to-use Auth, and S3-compatible storage out-of-the-box, allowing us to focus entirely on South African legal business logic.

3. **Supabase pg_trgm & Full-Text Search over Elasticsearch**:
   - *Decision*: Defer Elasticsearch. Leverage PostgreSQL's native `pg_trgm` (trigram search) and TSVector full-text indexing for matter searching.
   - *Rationale*: Managing an Elasticsearch cluster is expensive and operationally complex. For MVP v1, PostgreSQL full-text search meets all speed and scalability requirements for matter lists, contact registries, and document metadata index lookups.

4. **Document Generation over CaseLines API Submission & AI Drafting**:
   - *Decision*: Pleadings, discovery logs, and pro-forma tax invoices are compiled inside the platform and downloaded as standard PDFs. CaseLines submission and automated AI drafting are deferred to Phase 2/3.
   - *Rationale*: The CaseLines API is highly restricted and requires manual LPC approval paths. Deflecting automated CaseLines submissions and AI legal drafting prevents regulatory bottlenecks and keeps Phase 1 scope focused on immediate administrative efficiency.

---

## 2. System Context Diagram

The following diagram illustrates how users, external systems, and security layers interact with the Legal Matters MVP v1 platform:

```
                  ┌─────────────────────────────────┐
                  │      South African Courts       │
                  │ (Constitutional Court, SCA, HC) │
                  └────────────────▲────────────────┘
                                   │
                                   │ Manual Pleading Upload
                                   │ (via CaseLines Web UI)
                                   │
  ┌──────────────┐        ┌────────┴────────┐        ┌──────────────┐
  │  Attorneys / │        │  Legal Matters  │        │ Legal Clients│
  │  Paralegals  ├───────►│     MVP v1      │◄───────┤ (Portal Access)
  └──────┬───────┘ HTTPS  │(Modular Monolith)│ HTTPS └──────┬───────┘
         │                └────────▲────────┘               │
         │                         │                        │
         │                         │ Supabase Auth / JWT    │
         ▼                         ▼                        ▼
 ┌──────────────┐         ┌─────────────────┐        ┌──────────────┐
 │ LSSA Member  │         │   Supabase DB   │        │POPIA Consent │
 │ Verification │         │ (RLS Enforcement│        │Registry      │
 └──────────────┘         └─────────────────┘        └──────────────┘
```

---

## 3. Component Architecture

The codebase is logically separated into four architectural layers inside the Next.js framework:

```
┌────────────────────────────────────────────────────────┐
│                     Presentation Layer                 │
│  - Next.js Client Components (Tailwind & shadcn/ui)    │
│  - Interactive Matter Timelines, Intake Forms          │
└──────────────────────────┬─────────────────────────────┘
                           │ UI Events / API requests
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Next.js API Layer                    │
│  - Route Handlers (/api/v1/...)                        │
│  - Zod Request Validation Middleware                   │
│  - Supabase JWT Session & Role Extraction              │
└──────────────────────────┬─────────────────────────────┘
                           │ Type-Safe Client Calls
                           ▼
┌────────────────────────────────────────────────────────┐
│                      Service Layer                     │
│  - CourtDeadlineCalculator (Court days counting rules) │
│  - PrivilegeEngine (Flags sensitive legal advices)     │
│  - AuditLoggerService (Unalterable logging calls)       │
│  - VATBillingService (Tax invoice math rules)          │
└──────────────────────────┬─────────────────────────────┘
                           │ Supabase RPC / SQL Queries
                           ▼
┌────────────────────────────────────────────────────────┐
│                     Database Layer                     │
│  - Supabase PostgreSQL Database                       │
│  - Row Level Security (RLS) Policies                  │
│  - Immutable Audit Triggers                            │
└────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Architecture

### 4.1 Litigation Deadline Calculation Data Flow
Calculates a High Court pleading deadline (e.g., 10 court days to file notice of intention to defend) excluding weekends and South African public holidays:

```
Attorney           Next.js API             DeadlineService           Supabase DB
   │                    │                         │                       │
   │ POST /deadlines    │                         │                       │
   ├───────────────────►│                         │                       │
   │                    │ calculate(trigger, days)│                       │
   │                    ├────────────────────────►│                       │
   │                    │                         │ GetHolidays(year)     │
   │                    │                         ├──────────────────────►│
   │                    │                         │                       │
   │                    │                         │ Returns Holiday List  │
   │                    │                         │◄──────────────────────┤
   │                    │                         │                       │
   │                    │ Evaluates Calendar:     │                       │
   │                    │ - Skips Weekends        │                       │
   │                    │ - Skips SA Holidays     │                       │
   │                    │                         │                       │
   │                    │ Calculated Target Date  │                       │
   │                    │◄────────────────────────┤                       │
   │                    │                         │                       │
   │ Returns JSON       │                         │                       │
   │◄───────────────────┤                         │                       │
```

### 4.2 Document Upload & Privilege Quarantine Flow
Ensures that a uploaded document flagged as privileged is strictly isolated from unauthorized roles:

```
Attorney           Next.js API           Supabase Storage           Supabase DB
   │                    │                       │                        │
   │ Upload File (PDF)  │                       │                        │
   ├───────────────────►│                       │                        │
   │                    │ Validate (MIME/Size)  │                        │
   │                    ├──────────────┐        │                        │
   │                    │              │        │                        │
   │                    │◄─────────────┘        │                        │
   │                    │                       │                        │
   │                    │ Store File (UUID Path)│                        │
   │                    ├──────────────────────►│                        │
   │                    │                       │                        │
   │                    │ Storage Path Token    │                        │
   │                    │◄──────────────────────┤                        │
   │                    │                                                │
   │                    │ Insert Metadata (is_privileged = true)         │
   │                    ├───────────────────────────────────────────────►│
   │                    │                                                │
   │                    │                                                │ DB Applies RLS:
   │                    │                                                │ - Client role blocked
   │                    │                                                │ - Ext Counsel blocked
   │                    │                                                │                                                
   │ Upload Success     │                                                │
   │◄───────────────────┤                                                │
```

---

## 5. Database Architecture

### 5.1 Schema Diagram (ASCII Visualisation)
```
  ┌──────────────────┐               ┌──────────────────┐
  │      firms       │               │      users       │
  ├──────────────────┤               ├──────────────────┤
  │ PK id (UUID)     │1─────────────*│ PK id (UUID)     │
  │    name          │               │ FK firm_id       │
  │    vat_number    │               │    role (ENUM)   │
  └──────────────────┘               └──────────────────┘
            1                                  1
            │                                  │
            ├──────────────* ┌─────────────────┤
            │                │     clients     │
            │                ├─────────────────┤
            │                │ PK id (UUID)    │
            │                │ FK firm_id      │
            │                │    email        │
            │                └─────────────────┘
            │                         1
            │                         │
            ├──────────────* ┌────────┴────────┐
            │                │     matters     │
            │                ├─────────────────┤
            │                │ PK id (UUID)    │
            │                │ FK client_id    │
            │                │    status       │
            │                └─────────────────┘
            │                         1
            │       ┌─────────────────┼─────────────────┐
            │       │                 │                 │
            *       *                 *                 *
  ┌──────────────────┐      ┌──────────────────┐┌──────────────────┐
  │    documents     │      │   time_entries   ││     invoices     │
  ├──────────────────┤      ├──────────────────┤├──────────────────┤
  │ PK id (UUID)     │      │ PK id (UUID)     ││ PK id (UUID)     │
  │ FK matter_id     │      │ FK matter_id     ││ FK matter_id     │
  │    is_privileged │      │    duration_mins ││    vat_amount    │
  └──────────────────┘      └──────────────────┘└──────────────────┘
```

### 5.2 Indexing Strategy
To ensure optimal performance and complete isolation, the following indexes are constructed:
1. **Multitenant Isolation Indexes**:
   - `CREATE INDEX idx_matters_firm_id ON matters(firm_id);`
   - `CREATE INDEX idx_clients_firm_id ON clients(firm_id);`
   - `CREATE INDEX idx_documents_firm_id ON documents(firm_id);`
2. **Security & Search Lookup Indexes**:
   - `CREATE UNIQUE INDEX idx_users_email ON users(email);`
   - `CREATE INDEX idx_matters_client_id ON matters(client_id);`
   - `CREATE INDEX idx_documents_matter_id ON documents(matter_id);`
   - `CREATE INDEX idx_audit_logs_firm_resource ON audit_logs(firm_id, resource_type, resource_id);`

---

## 6. API Architecture

All routes conform to standard REST guidelines, operating under `/api/v1/`.

- **Auth Endpoints** (Handled directly by Supabase Auth Client SDK):
  - `POST /api/v1/auth/signup` - Firm registration & LPC validation.
  - `POST /api/v1/auth/login` - Generates JWT & validates MFA status.
- **Client Registry Endpoints**:
  - `GET /api/v1/clients` - List firm-specific clients.
  - `POST /api/v1/clients` - Add new individual or corporate client.
- **Matter Management Endpoints**:
  - `GET /api/v1/matters/:id` - Complete case details & timeline.
  - `POST /api/v1/matters/:id/deadlines` - Court days deadline calculation.
- **Document Endpoints**:
  - `POST /api/v1/documents/upload` - Secure upload token generation.
  - `GET /api/v1/documents/:id/download` - Resolves temporary authenticated download URL.

---

## 7. Authentication and Authorization

### 7.1 JWT Claim Payload Layout
Supabase Auth signs and issues a standard JWT upon authentication. Custom database claims map role and firm context securely:

```json
{
  "aud": "authenticated",
  "exp": 1779951600,
  "sub": "b2c99ab1-a67b-4028-a579-37330598a44b",
  "email": "partner@lawfirm.co.za",
  "app_metadata": {
    "provider": "email"
  },
  "user_metadata": {
    "firm_id": "8f8b8941-bf74-4b5b-b9d9-fa3e028b123d",
    "role": "Partner"
  },
  "role": "authenticated"
}
```

---

## 8. Row Level Security (RLS) Model

Supabase PostgreSQL Row Level Security (RLS) acts as the non-negotiable security firewall. All tables have RLS enabled by default.

### 8.1 Matter Table RLS Policy Definition
Enforces strict multi-tenant isolation and role-based permissions:

```sql
-- Enable RLS on Matters
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;

-- Policy: Select Matters
CREATE POLICY select_matters_policy ON matters
    FOR SELECT
    USING (
        -- Enforce firm-level separation
        firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::uuid
        AND (
            -- Partners and Associates can view all firm matters
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Partner', 'Associate', 'Paralegal')
            OR
            -- External Counsel must be explicitly assigned to the matter
            (
                (auth.jwt() -> 'user_metadata' ->> 'role') = 'External Counsel'
                AND EXISTS (
                    SELECT 1 FROM parties 
                    WHERE parties.matter_id = matters.id 
                    AND parties.sa_id_number = (SELECT sa_id_number FROM users WHERE id = auth.uid())
                )
            )
            OR
            -- Clients can only see their own matters
            (
                (auth.jwt() -> 'user_metadata' ->> 'role') = 'Client'
                AND client_id = (SELECT id FROM clients WHERE email = auth.email())
            )
        )
    );
```

---

## 9. Matter-Level Access-Control Model

Access limits are structured around a zero-trust model:

| Role | Firm-wide Matter Access | Read Privileged Docs | Edit Matter Status | View Financial Ledger | Delete Files |
|:---|:---|:---|:---|:---|:---|
| **Partner** | Yes | Yes | Yes | Yes | Yes |
| **Associate** | Yes | Yes | Yes | No | No |
| **Paralegal** | Yes | No | No | No | No |
| **External Counsel** | Assigned Matters Only | No | No | No | No |
| **Client** | Owned Matters Only | No | No | No | No |

---

## 10. POPIA and Audit Architecture

POPIA requires an immutable trail showing **who** accessed **whose** personal data and **when**.

```
    Database Query       PII Access Trigger       Audit Log Entry
 ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
 │ SELECT * FROM    ├───►│ Check if email/ ├───►│ INSERT INTO      │
 │ clients WHERE... │    │ ID read occurred│    │ audit_logs (...) │
 └──────────────────┘    └─────────────────┘    └──────────────────┘
```

### Immutable PostgreSQL Audit Trigger Implementation
```sql
CREATE OR REPLACE FUNCTION log_pii_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        firm_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        user_agent
    ) VALUES (
        OLD.firm_id,
        auth.uid(),
        'READ_PII',
        'client',
        OLD.id,
        jsonb_build_object('accessed_fields', ARRAY['sa_id_number', 'phone_number', 'email']),
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb ->> 'user-agent'
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_client_pii_audit
    BEFORE SELECT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION log_pii_access();
```

---

## 11. Document Storage Architecture

Documents are stored in a multi-tenant isolated bucket structure within Supabase Storage:

```
storage-bucket/
└── [firm_id]/
    └── [matter_id]/
        └── [document_uuid].pdf
```

### Storage RLS Policies
```sql
-- Read Policy for Storage Objects
CREATE POLICY storage_read_policy ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'legal-matters-docs'
        AND (
            -- Extract firm_id and matter_id from path segments
            (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'firm_id')
            AND (
                -- Partners & Associates access firm folder
                (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Partner', 'Associate')
                OR
                -- Clients only access files in their specific matter folder
                (
                    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Client'
                    AND EXISTS (
                        SELECT 1 FROM matters
                        WHERE id = ((storage.foldername(name))[2])::uuid
                        AND client_id = (SELECT id FROM clients WHERE email = auth.email())
                    )
                )
            )
        )
    );
```

---

## 12. Error Handling

Errors are mapped through a centralized gateway to prevent internal database leakages while providing actionable developer context.

```
                  ┌─────────────────────────────────┐
                  │          AppError Base          │
                  └────────────────┬────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐       ┌────────▼────────┐       ┌────────▼────────┐
│ ValidationError │       │   AuthError     │       │ DatabaseError   │
│   (HTTP 400)    │       │   (HTTP 401)    │       │   (HTTP 500)    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Standardized Error Payload Structure (JSON)
```json
{
  "success": false,
  "error": {
    "code": "PRIVILEGE_VIOLATION",
    "message": "You do not have access to view this privileged legal document",
    "statusCode": 403,
    "timestamp": "2026-05-25T08:59:30Z",
    "traceId": "91a8e2cb-cf9e-4f1a-b61f-9a1389c9220a"
  }
}
```

---

## 13. Scalability and Performance

- **Stateless Next.js Architecture**: Next.js API Routes run serverless on Vercel, allowing concurrent request spikes to auto-scale instantly without maintaining server memory states.
- **Connection Pooling**: Uses Supabase's built-in **Supavisor** connection pooler (port `6543`) to support high volumes of serverless concurrent database connections.
- **Database Caching**: Implements a Redis read-through cache layer for static datasets (e.g., South African Court holiday structures).

---

## 14. Security Architecture

1. **Defense in Transit**: enforced TLS 1.3 encryption across all communication vectors.
2. **Defense at Rest**: PostgreSQL tables encrypted via transparent database encryption, storage bucket objects secured under AES-256 keys, and client credentials hashed via bcrypt (cost factor 12+).
3. **Cross-Site Scripting (XSS) Prevention**: Strict Next.js Content Security Policy (CSP) headers blocking inline scripts, combined with automatic React string escaping.
4. **SQL Injection Prevention**: Supabase client queries and internal service layers exclusively use parameterized statements.

---

## 15. Deployment Architecture

MVP v1 uses a secure, serverless cloud deployment topology optimized for South Africa:

```
                    ┌─────────────────────────┐
                    │      Cloudflare DNS     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Vercel Edge Platform   │ (UI + API Hosting)
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ HTTPS (Database Transactions) │
                 ▼                               ▼
       ┌──────────────────┐             ┌──────────────────┐
       │  Supabase Cloud  │             │ Supabase Storage │
       │  PostgreSQL DB   │             │   (S3 Bucket)    │
       │ (AWS Cape Town)  │             │ (AWS Cape Town)  │
       └──────────────────┘             └──────────────────┘
```

---

## 16. Monitoring and Observability

- **Sentry Integration**: Captured uncaught exceptions in Next.js Server Components and route handlers.
- **Supabase Logs**: Live database query metrics logged and monitored.
- **POPIA Breach Alerting**: CloudWatch alarm triggers instantly if any single IP requests `READ_PII` actions > 100 times within 1 minute, isolating and blocking the associated tenant session automatically.

---

## 17. Future Extension Points

1. **Court E-Filing Integration**: Prepared hooks exist in the database level (`matters.case_number` & `documents.storage_path`) allowing Phase 2 webhooks to push pleadings directly into the CaseLines API.
2. **AI Legal Drafting Gateway**: A dedicated routing interface is established in `services/ai-drafting` to integrate LLMs securely in Phase 2, passing only sanitized data.
3. **Legal Research API Integration**: Abstracted interfaces in `services/legal-research` allow future hookups to Juta/LexisNexis databases without modifying core matter components.
4. **Enterprise SAML SSO**: Isolated Supabase Auth configurations allow easy upgrading to single sign-on (SSO) systems in corporate/government rollouts.

---

### Approval and Sign-off

- **Lead Enterprise Architect**: _________________________ Date: _______
- **Chief Security Officer**: _________________________ Date: _______
