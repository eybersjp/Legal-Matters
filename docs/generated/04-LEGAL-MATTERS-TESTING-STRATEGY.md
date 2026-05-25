# Comprehensive Testing Strategy: Legal Matters MVP v1

**South African Legal Practice Management Platform (MVP v1)**  
**Testing Frameworks: Vitest, React Testing Library, Playwright, Supabase CLI / pgTAP**

---

## 1. Testing Philosophy & Pyramid

Legal Matters implements a robust quality assurance program aligned with the **South African Legal Practice Council (LPC)** practice regulations and **POPIA 2013** compliance mandates. Our testing is divided into a three-tier testing pyramid to guarantee deterministic, isolated, and highly performant execution:

```
        ▲
       /│\
      / │ \
     /  │  \  E2E Playwright Tests (10%)
    /   │   \ - Multi-Tenant cross-boundary attacks
   /    │    \- Client Portal access validation
  /─────┼─────\
 /      │      \  Integration Database Tests (30%)
/       │       \ - Supabase Row Level Security (RLS) policies
─────────────────\ - pgTAP triggers and constraints
 \      │      / \
  \     │     /   \ Unit Vitest Tests (60%)
   \    │    /    - South African ID Luhn calculations
    \   │   /     - Court Days Deadline computations
     \  │  /      - VAT Invoice math and trust logs
      \ │ /
       \│/
        ▼
```

- **Unit Tests (60%)**: Fast, pure JavaScript/TypeScript tests targeting complex domain mathematics, date calculators, input validation routines, and pro-forma invoice calculations. Executed via **Vitest**.
- **Integration Tests (30%)**: Verifies API endpoints, database schema triggers, constraints, and **Supabase Row Level Security (RLS)** using **Supabase CLI Local Testing** and **pgTAP** test suites.
- **End-to-End Tests (10%)**: Simulates multi-tenant litigation workflows, client portal authentication, security penetration vectors, and file privilege isolations using **Playwright**.

---

## 2. Unit Testing Strategy

Unit tests isolate pure utility code and components from network and database dependencies. Target coverage is strictly locked at **>90% lines, functions, and branches**.

### 2.1 Critical Test: Court Days Deadline Calculation
Verifies that South African litigation deadlines correctly skip Saturdays, Sundays, and public holidays:

```typescript
// src/utils/court-calculator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { calculateCourtDeadline } from './court-calculator';

// Mock South African Public Holidays for 2026
const mockHolidays = [
  '2026-06-16', // Youth Day
  '2026-04-27', // Freedom Day
];

describe('calculateCourtDeadline', () => {
  it('correctly calculates 10 court days starting Monday, 15 June 2026', () => {
    // 15 June is a Monday
    // 16 June is a Public Holiday (Youth Day - skipped)
    // 20-21 June is a Weekend (skipped)
    // 27-28 June is a Weekend (skipped)
    // Target should fall on Tuesday, 30 June 2026
    const triggerDate = new Date('2026-06-15T08:00:00Z');
    const result = calculateCourtDeadline(triggerDate, 10, mockHolidays);
    
    expect(result.toISOString()).toContain('2026-06-30T17:00:00.000Z');
  });

  it('fails if trigger date is in the past', () => {
    const pastDate = new Date('2020-01-01');
    expect(() => calculateCourtDeadline(pastDate, 10, mockHolidays)).toThrow(
      'Trigger date cannot be in the past'
    );
  });
});
```

---

### 2.2 Critical Test: SA ID Luhn Validation
Verifies that client identification entries strictly conform to South African standards:

```typescript
// src/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateSaId } from './validators';

describe('validateSaId', () => {
  it('passes a mathematically correct South African ID number', () => {
    // Valid ID: 9201015678087 (Luhn compliant)
    expect(validateSaId('9201015678087')).toBe(true);
  });

  it('fails a mathematically invalid South African ID number', () => {
    // Invalid Luhn digit: 9201015678089
    expect(validateSaId('9201015678089')).toBe(false);
  });

  it('fails a string with letters or invalid lengths', () => {
    expect(validateSaId('920101567808A')).toBe(false);
    expect(validateSaId('12345')).toBe(false);
  });
});
```

---

## 3. Integration Testing Strategy

Integration tests evaluate components operating together. We run an isolated local instance of Supabase inside Docker containers to test actual database schema behavior, constraints, and audit log generation triggers.

### 3.1 Critical Test: Document Read Access Log Generation
Verifies that reading a document automatically generates a read audit entry:

```typescript
// src/services/document.service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDbClient, clearDatabase } from '@/tests/helpers/db-helper';
import { DocumentService } from './document.service';

let db: any;
let docService: DocumentService;

describe('Document Service Integration', () => {
  beforeEach(async () => {
    db = await createTestDbClient();
    docService = new DocumentService(db);
  });

  afterEach(async () => {
    await clearDatabase(db);
  });

  it('creates an access log automatically when a document is read', async () => {
    const documentId = '8f8b8941-bf74-4b5b-b9d9-fa3e028b123d';
    const memberId = 'b2c99ab1-a67b-4028-a579-37330598a44b';
    const firmId = '550e8400-e29b-41d4-a716-446655440000';

    // Execute read operation
    const doc = await docService.readDocument(documentId, memberId, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    });

    expect(doc).toBeDefined();

    // Query unalterable access log table
    const logs = await db.from('document_access_logs')
      .select('*')
      .eq('document_id', documentId);

    expect(logs.data.length).toBe(1);
    expect(logs.data[0].member_id).toBe(memberId);
    expect(logs.data[0].action).toBe('READ');
  });
});
```

---

### 3.2 Critical Test: Trust Account Metadata Ledger Protection
Verifies that client trust money metadata entries cannot be directly adjusted through general API routes in MVP v1:

```typescript
// src/services/trust.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDbClient } from '@/tests/helpers/db-helper';
import { TrustService } from './trust.service';

let db: any;
let trustService: TrustService;

describe('Trust Account Records Integration', () => {
  beforeEach(async () => {
    db = await createTestDbClient();
    trustService = new TrustService(db);
  });

  it('rejects trust record creation from non-Partner members', async () => {
    const associateMemberId = 'associate-uuid-claims';
    
    await expect(
      trustService.recordTransaction({
        firmId: 'firm-a',
        clientId: 'client-b',
        matterId: 'matter-c',
        amount: 50000.00,
        section86Type: '86(2)',
        description: 'Client deposit'
      }, associateMemberId)
    ).rejects.toThrow('Privilege Violation: Only Partners can record trust metadata transactions.');
  });
});
```

---

## 4. Supabase Row Level Security (RLS) Testing

We test Supabase RLS policies directly using **pgTAP** (PostgreSQL Unit Testing framework) to ensure firm-level isolation and access structures cannot be bypassed at the database connection layer.

### RLS pgTAP Spec File
```sql
-- tests/db/rls_security.test.sql
BEGIN;
SELECT plan(4);

-- 1. Install pgTAP if not present
CREATE EXTENSION IF NOT EXISTS pgtap;

-- 2. Mock different tenants (Firm A and Firm B)
INSERT INTO firms (id, name, lpc_registration_number) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Firm A Attorneys', 'LPC-11111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Firm B Attorneys', 'LPC-22222');

INSERT INTO matters (id, firm_id, client_id, title, status) VALUES 
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid(), 'Firm A Secret Case', 'Intake'),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', gen_random_uuid(), 'Firm B Secret Case', 'Intake');

-- 3. Test Firm A member isolation
SELECT set_config('request.jwt.claims', '{"user_metadata": {"firm_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "Associate"}}', true);

SELECT results_eq(
    $$ SELECT title FROM matters $$,
    $$ VALUES ('Firm A Secret Case') $$,
    'Associate from Firm A can only see matters belonging to Firm A'
);

-- 4. Test External Counsel Matter Team restrictions
SELECT set_config('request.jwt.claims', '{"user_metadata": {"firm_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "External Counsel"}}', true);

SELECT is_empty(
    $$ SELECT title FROM matters $$,
    'External Counsel cannot see matters they are not assigned to'
);

SELECT * FROM finish();
ROLLBACK;
```

---

## 5. End-to-End Testing (Playwright)

End-to-end tests validate browser workflows, security restrictions, and portal separations under simulated real-world conditions.

### 5.1 Critical Test: Firm-to-Firm Data Isolation
Verifies that a user authenticated under Firm A can never intercept or request details of Firm B data, returning standard HTTP 403 blocks:

```typescript
// tests/e2e/tenant-leakage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant RLS Boundaries', () => {
  test('firm A associate must be strictly blocked from viewing firm B matter details', async ({ request }) => {
    // Authenticate as Firm A Associate
    const loginResponse = await request.post('http://localhost:3000/api/v1/auth/login', {
      data: {
        email: 'associate@firm-a.co.za',
        password: 'SecurePassword123!'
      }
    });
    
    const { token } = (await loginResponse.json()).data;
    
    // Attempt to request matter details belonging to Firm B (Cross-Tenant attack vector)
    const firmBMatterId = '22222222-2222-2222-2222-222222222222';
    const attackResponse = await request.get(`http://localhost:3000/api/v1/matters/${firmBMatterId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Server must respond with a strict 403 Forbidden or 404 Not Found (no leakage of matter presence)
    expect([403, 404]).toContain(attackResponse.status());
  });
});
```

---

### 5.2 Critical Test: Client Portal Matter Restriction
Verifies that clients logging into the portal are isolated to their own matters:

```typescript
// tests/e2e/client-portal.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Client Portal Security', () => {
  test('client must only see matters linked to their client ID', async ({ page }) => {
    // Login as Client A
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'client-a@gmail.com');
    await page.fill('input[type="password"]', 'ClientSecret123!');
    await page.click('button[type="submit"]');

    // Navigates to dashboard
    await expect(page).toHaveURL('http://localhost:3000/portal');

    // Should see Client A matter titles
    await expect(page.locator('text=My Corporate Case')).toBeVisible();

    // Must NOT see Client B matter titles
    await expect(page.locator('text=Secret Divorce of Client B')).not.toBeVisible();
  });
});
```

---

## 6. POPIA & Audit Log Verification Tests

Verifies that client consent status updates and personal information accesses are permanently registered in the audit registry.

```typescript
// tests/integration/popia-audit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDbClient } from '@/tests/helpers/db-helper';
import { ClientService } from './client.service';

let db: any;
let clientService: ClientService;

describe('POPIA Consent Auditing', () => {
  beforeEach(async () => {
    db = await createTestDbClient();
    clientService = new ClientService(db);
  });

  it('writes an audit entry automatically when client consent is updated', async () => {
    const clientId = '8f8b8941-bf74-4b5b-b9d9-fa3e028b123d';
    const partnerId = 'b2c99ab1-a67b-4028-a579-37330598a44b';

    // Partner updates client marketing/PII consent
    await clientService.updateConsent(clientId, {
      consentedToProcessing: true,
      consentedChannels: ['Email', 'SMS']
    }, partnerId);

    // Verify audit logs record the change
    const auditQuery = await db.from('audit_logs')
      .select('*')
      .eq('resource_type', 'client')
      .eq('resource_id', clientId)
      .eq('action', 'UPDATE_CONSENT');

    expect(auditQuery.data.length).toBe(1);
    expect(auditQuery.data[0].user_id).toBe(partnerId);
    expect(auditQuery.data[0].changes.consented_to_processing).toBe(true);
  });
});
```

---

## 7. CI Test Execution Commands

To automate test execution inside our CI/CD pipeline (e.g., GitHub Actions), the following commands must run sequentially.

```bash
# 1. Install dependencies
npm ci

# 2. Spin up local Supabase docker instance (includes PostgreSQL)
npx supabase start

# 3. Run migrations on test database
npx supabase db reset --linked=false

# 4. Run database RLS pgTAP security tests
npx supabase db test

# 5. Run Vitest Unit and API Integration test suites
npm run test:ci

# 6. Run Playwright E2E security tests
npx playwright test
```

---

## 8. Test Fixtures Definitions

Fixture data structures map exact South African practice formats:

```typescript
// tests/fixtures/legal-entities.ts

export const mockFirm = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Schoeman & Partners Inc.',
  lpc_registration_number: 'LPC-12345/2026',
  vat_number: 'ZA4320192837'
};

export const mockIndividualClient = {
  id: '7f7b8941-bf74-4b5b-b9d9-fa3e028b122f',
  firm_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  type: 'Individual',
  first_name: 'Zola',
  last_name: 'Skweyiya',
  sa_id_number: '7505125678086', // Valid SA ID
  email: 'zola@gmail.com',
  phone_number: '+27834567890'
};

export const mockMatter = {
  id: '11111111-1111-1111-1111-111111111111',
  firm_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  client_id: '7f7b8941-bf74-4b5b-b9d9-fa3e028b122f',
  title: 'Skweyiya v Minister of Justice',
  case_number: '2026/49281',
  court_jurisdiction: 'High Court, Pretoria',
  status: 'Pleadings'
};
```
