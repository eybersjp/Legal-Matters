# Project Structure Specification: Legal Matters MVP v1

**South African Legal Practice Management Platform (MVP v1)**  
**Tech Stack: Next.js App Router, Supabase, Tailwind CSS, shadcn/ui, Zod, Vitest, Playwright**

---

## 1. Full Directory Tree

Below is the complete, un-omitted project directory tree for the **Legal Matters MVP v1** application. Every file and folder is specified to ensure clean multitenancy isolation, POPIA audit tracing, and strict privilege boundaries.

```
legal-matters/
├── .github/
│   └── workflows/
│       ├── test.yml (CI/CD test runner)
│       └── deploy.yml (Vercel deployment coordinator)
│
├── playwright/
│   ├── tests/
│   │   ├── tenant-isolation.spec.ts (Cross-tenant security checks)
│   │   ├── client-portal.spec.ts (Client Portal access checks)
│   │   └── authentication.spec.ts (MFA & password strength checks)
│   └── helpers/
│       └── auth.ts (Authentication mock helpers)
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260525000000_init_schemas.sql (Base DDL and enums)
│   │   ├── 20260525000001_enable_rls.sql (Tenant & role RLS policies)
│   │   └── 20260525000002_audit_triggers.sql (PII read access log trigger)
│   ├── seed.sql (South African public holiday registries & mock data)
│   └── config.toml (Local Supabase CLI configuration)
│
├── src/
│   ├── app/ (Next.js App Router pages & API routes)
│   │   ├── layout.tsx (Global theme & provider setup)
│   │   ├── page.tsx (Product landing and LPC verification info)
│   │   ├── login/
│   │   │   └── page.tsx (MFA-enabled login interface)
│   │   ├── register/
│   │   │   └── page.tsx (Firm registration onboarding)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx (Side-navigation dashboard shell)
│   │   │   └── page.tsx (Admin metrics & urgent court deadlines)
│   │   ├── matters/
│   │   │   ├── page.tsx (Matter registry lookup)
│   │   │   └── [id]/
│   │   │       ├── page.tsx (Matter details & chronological timeline)
│   │   │       └── documents/
│   │   │           └── page.tsx (Document list - privilege quarantined)
│   │   ├── clients/
│   │   │   ├── page.tsx (Individual and corporate client records)
│   │   │   └── [id]/
│   │   │       └── page.tsx (Client PII profile & POPIA consent log)
│   │   ├── portal/ (Client Portal Interface)
│   │   │   ├── page.tsx (Portal landing - matter cards)
│   │   │   └── invoices/
│   │   │       └── page.tsx (Invoice lists and billing records)
│   │   └── api/ (Next.js API route handlers)
│   │       ├── v1/
│   │       │   ├── clients/
│   │       │   │   └── route.ts (POST intake client)
│   │       │   ├── deadlines/
│   │       │   │   └── route.ts (POST calculate court days)
│   │       │   └── documents/
│   │       │       └── route.ts (POST generate secure upload tokens)
│   │       └── auth/
│   │           └── callback/
│   │               └── route.ts (Supabase OAuth/Email callback)
│   │
│   ├── components/ (Common UI shared across features)
│   │   ├── ui/ (shadcn/ui auto-generated components)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── input.tsx
│   │   │   └── select.tsx
│   │   ├── navbar.tsx (Global navigation controller)
│   │   ├── audit-log-table.tsx (Traceable audit entries viewer)
│   │   └── deadline-badge.tsx (Urgent court days visual indicator)
│   │
│   ├── features/ (Modular business capabilities)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── mfa-challenge.tsx
│   │   │   └── hooks/
│   │   │       └── use-session.ts
│   │   ├── billing/
│   │   │   ├── components/
│   │   │   │   ├── invoice-generator.tsx
│   │   │   │   └── trust-account-balance.tsx
│   │   │   └── utils/
│   │   │       └── vat-math.ts
│   │   ├── matters/
│   │   │   ├── components/
│   │   │   │   ├── timeline-feed.tsx
│   │   │   │   └── document-quarantine-vault.tsx
│   │   │   └── hooks/
│   │   │       └── use-court-deadlines.ts
│   │   └── clients/
│   │       └── components/
│   │           └── popia-consent-card.tsx
│   │
│   ├── lib/ (Core shared utilities and integrations)
│   │   ├── supabase/
│   │   │   ├── client.ts (Client-side Supabase wrapper)
│   │   │   ├── server.ts (Server-side Next.js route wrapper)
│   │   │   └── middleware.ts (Session validation middleware)
│   │   ├── court-days/
│   │   │   └── calculator.ts (Court day business rules)
│   │   ├── encryption/
│   │   │   └── field-crypto.ts (AES-256 PII encryptor)
│   │   └── logger.ts (Structured JSON audit logs)
│   │
│   ├── schemas/ (Universal Zod validation schemas)
│   │   ├── client.schema.ts (SA ID and company number Zod rules)
│   │   ├── matter.schema.ts (Case number format checks)
│   │   └── invoice.schema.ts (VAT compliant invoicing rules)
│   │
│   ├── types/ (Ambient type files)
│   │   ├── index.ts (Exports all database/DTO shapes)
│   │   ├── auth.types.ts
                  ├── database.types.ts (Auto-generated from Supabase DDL)
│   │   └── errors.types.ts
│   │
│   ├── server/ (Server-side actions and business controllers)
│   │   ├── actions/
│   │   │   ├── matters.actions.ts (Create matter server action)
│   │   │   └── billing.actions.ts (Finalize invoice action)
│   │   └── services/
│   │       ├── audit.service.ts
│   │       └── document.service.ts
│   │
│   └── tests/ (Vitest unit and service integration tests)
│       ├── unit/
│       │   ├── court-days.test.ts (Court day calculation tests)
│       │   └── validators.test.ts (Luhn ID & company reg checks)
│       └── integration/
│           ├── document-privilege.test.ts (Privilege quarantine RLS tests)
│           └── audit-trail.test.ts (PII read access log trigger tests)
│
├── .env.example (Environment variables template)
├── .env.test (Testing specific environments)
├── .gitignore (Version control ignore rules)
├── package.json (Dependency list and build pipelines)
├── tsconfig.json (Strict TypeScript compilation settings)
├── tailwind.config.ts (Tailwind spacing and shadcn components theme)
├── vitest.config.ts (Vitest testing paths and settings)
├── playwright.config.ts (Playwright E2E automation settings)
└── README.md (Setup and developer guidelines)
```

---

## 2. Directory Purpose Definitions

| Directory | Primary Architectural Purpose | Key Operational Responsibility |
|:---|:---|:---|
| **`playwright/`** | Browser automation test chamber | Enforces E2E tenant boundary checks and Client Portal safety boundaries. |
| **`supabase/`** | Local Supabase backend engine | Stores DDL, seeds South African public holidays, and governs DB schema. |
| **`src/app/`** | Unified Routing and Application Layer | Resolves layout compositions, pages, and `/api/v1/` endpoint routers. |
| **`src/components/`** | Common Shared Presentation UI | Hosts global elements (Navbar, standard buttons, dialog wrappers). |
| **`src/features/`** | High-level domain capabilities | Bundles components, state hooks, and UI logics per business boundary. |
| **`src/lib/`** | Core system infrastructure utilities | Sets up Supabase connectivity, AES-256 field cryptos, and court day rules. |
| **`src/schemas/`** | Strict runtime Zod validation gates | Governs format parsing for South African IDs, registration formats, and VAT checks. |
| **`src/types/`** | Compilation strict interfaces | Governs typing mappings matching PostgreSQL tables and API DTO models. |
| **`src/server/`** | Server Action context controllers | Executes transactional service logic, audit tracking, and database calls safely. |
| **`src/tests/`** | Vitest testing environment | Executes local math verification and schema integration test suites. |

---

## 3. Naming Conventions

All developers must strictly conform to these formatting naming standards to ensure code uniformity:

* **Directories & Folders**: Always `kebab-case` (e.g., `court-days`, `document-versions`).
* **UI Components**: PascalCase matching standard React practices (e.g., `PopiaConsentCard.tsx`, `DeadlineBadge.tsx`).
* **Source Code Files**: `kebab-case` with dotted suffix descriptors for domain isolation (e.g., `client.schema.ts`, `matters.actions.ts`, `validators.test.ts`).
* **TypeScript Types & Interfaces**: PascalCase starting with logical noun groupings (e.g., `interface ClientDTO`, `type AppRole`).
* **Zod Schemas**: PascalCase with explicit `Schema` suffix descriptors (e.g., `CreateClientSchema`, `SaIdSchema`).
* **Constants**: Global configurations in UPPER_SNAKE_CASE (e.g., `VAT_RATE_PERCENTAGE = 15.00`, `MAX_FILE_SIZE_BYTES = 26214400`).

---

## 4. Required Configuration Files

### 4.1 strict `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*": ["./src/lib/*"],
      "@schemas/*": ["./src/schemas/*"],
      "@types/*": ["./src/types/*"],
      "@server/*": ["./src/server/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist", "playwright/**/*"]
}
```

---

### 4.2 standard `package.json`
```json
{
  "name": "legal-matters",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:test": "supabase db test"
  },
  "dependencies": {
    "@supabase/ssr": "^0.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.379.0",
    "next": "^14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "supabase": "^1.165.0",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

---

## 5. Required Environment Variables (`.env.example`)

```
# ==========================================
# LEGAL MATTERS ENVIRONMENT CONFIGURATION
# ==========================================

# Application Runtime Setting
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Public Supabase Client Settings (Vercel Client Component accessible)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Private Supabase Admin Settings (Strictly Server-Side / Actions only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct PostgreSQL DB URL (Needed for Vitest Integrations and Migrations)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# South African Legal/Tax Constants
NEXT_PUBLIC_VAT_RATE_PERCENT=15.00
NEXT_PUBLIC_DEFAULT_TIMEZONE=Africa/Johannesburg
NEXT_PUBLIC_DEFAULT_LOCALE=en_ZA

# AES-256 Symmetric Encryption Keys for sensitive Client PII (SSN, ID numbers)
# Must be exactly 32 hex-encoded characters
ENCRYPTION_SECRET_KEY=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890
```

---

## 6. Git Ignore Rules (`.gitignore`)

```
# Next.js build compilation outputs
.next/
out/
build/
dist/

# Dependencies
node_modules/

# Local Environment secrets (Must never be committed)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Supabase local engine state variables
supabase/.temp/
.supabase/

# OS specific files
.DS_Store
Thumbs.db
*.db

# Logs and tracing dumps
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Testing coverage reports
coverage/
.nyc_output/
playwright-report/
test-results/
```
