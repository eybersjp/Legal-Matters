# Quick Start Guide for Antigravity 2

**How to use these developer docs to generate complete projects**

---

## 1. Setup Your Workspace

Copy all documentation files into your Antigravity 2 workspace:
- `00-SYSTEM-PROMPT.md` - Set as your global system prompt
- `01-SPEC-TEMPLATE.md` - Reference for defining requirements
- `02-ARCHITECTURE-TEMPLATE.md` - Reference for system design
- `03-SCHEMA-CONTRACTS.md` - Reference for data models
- `04-TESTING-STRATEGY.md` - Reference for test structure
- `05-PROJECT-STRUCTURE.md` - Reference for file organization

---

## 2. Project Generation Workflow

### Step 1: Create Technical Specification

Use **01-SPEC-TEMPLATE.md** as your template.

**Ask Antigravity:**
```
Use the Technical Specification Template from my docs.

Create a complete technical specification for:
[Your project description]

Follow the template structure exactly:
1. Project Overview
2. User Stories & Acceptance Criteria
3. Functional Requirements
4. Data Model
5. API Contracts
6. Non-Functional Requirements
7. Constraints & Assumptions
8. Testing Strategy
9. Deployment & Operations
10. Acceptance & Validation

Be comprehensive and specific. No placeholders.
```

### Step 2: Design Architecture

Use **02-ARCHITECTURE-TEMPLATE.md** as your reference.

**Ask Antigravity:**
```
Based on this technical specification: [paste spec]

Create a complete architecture document using the Architecture Template.

Include:
1. Architecture Overview (with text-based diagrams)
2. Component Architecture (with descriptions)
3. Data Flow Architecture
4. Database Architecture (with schema diagrams)
5. API Architecture
6. Authentication & Authorization
7. Error Handling Architecture
8. Scalability & Performance
9. Security Architecture
10. Deployment Architecture
11. Monitoring & Observability

Make all diagrams using ASCII/text format.
Explain every component's purpose and dependencies.
```

### Step 3: Define Schema & Contracts

Use **03-SCHEMA-CONTRACTS.md** as your reference.

**Ask Antigravity:**
```
Based on the specification and architecture:

Create complete schema and contract definitions including:

1. Database Schema (SQL DDL for all tables)
2. TypeScript Type Contracts
3. API Request/Response Contracts (all endpoints)
4. Validation Rules (Zod schemas)
5. Error Contracts

Use the template as reference for format.
Make every type fully specified.
Include all constraints and validation rules.
```

### Step 4: Plan Testing Strategy

Use **04-TESTING-STRATEGY.md** as your reference.

**Ask Antigravity:**
```
Create a comprehensive testing strategy for this project.

Define:
1. Unit test strategy (with examples)
2. Integration test strategy (with examples)
3. E2E test strategy (with examples)
4. Security testing (OWASP + POPIA compliance)
5. Test fixtures and data
6. Test configuration (vitest, playwright)
7. CI/CD test pipeline

Use the template as reference.
Include example test code for key scenarios.
```

### Step 5: Define Project Structure

Use **05-PROJECT-STRUCTURE.md** as your reference.

**Ask Antigravity:**
```
Based on the project definition, create the complete project structure.

Provide:
1. Directory tree (show all folders and files)
2. Purpose of each directory
3. File naming conventions to use
4. Configuration files needed (tsconfig.json, package.json, etc.)
5. Environment variables (.env.example)
6. Git configuration (.gitignore)

Use the template structure as starting point.
Adapt as needed for this specific project.
```

### Step 6: Generate Complete Implementation

**Ask Antigravity:**
```
You have the complete specification, architecture, schema, and test plan.

Now generate the COMPLETE WORKING implementation.

Follow this order:
1. Configuration files (tsconfig.json, package.json, vitest.config.ts, etc.)
2. Environment setup (.env.example, config/*.ts)
3. Type definitions (src/types/*)
4. Utilities (src/utils/* with full implementations)
5. Database schema and migrations (src/db/*)
6. Repositories (src/repositories/*)
7. Services (src/services/*)
8. Middleware (src/middleware/*)
9. Controllers (src/controllers/*)
10. Routes (src/routes/*)
11. Main entry point (src/index.ts)
12. Test files (tests/unit/*, tests/integration/*, tests/e2e/*)

Requirements:
- Complete working code, not pseudo-code
- No placeholder comments
- All files included, nothing omitted
- Full error handling
- Proper logging
- Type safety (strict TypeScript)
- POPIA compliance built in
- Security best practices
- All tests included and passing

Show file tree first, then complete code for each file.
```

---

## 3. Using the System Prompt in Antigravity

### Option A: Global System Prompt
1. Copy **00-SYSTEM-PROMPT.md** entirely
2. Paste into Antigravity's "System Prompt" setting
3. This becomes your global instruction set
4. Use for all projects

### Option B: Per-Project Prompt
For specific projects, add to your request:

```
SYSTEM CONTEXT:
[Paste relevant sections from 00-SYSTEM-PROMPT.md]

TASK:
[Your specific task]
```

---

## 4. Template Examples

### Example 1: Simple CRUD API

**Ask:**
```
Create a complete SaaS project for managing TODO items.

Specifications:
- User authentication (email/password)
- Each user has their own TODO list
- CRUD operations on TODOs
- Mark todo as complete/incomplete
- South Africa compliance (POPIA)
- PostgreSQL backend
- Next.js frontend
- TypeScript everywhere

Follow this process:
1. Technical specification (using template 01)
2. Architecture (using template 02)
3. Schema & contracts (using template 03)
4. Testing strategy (using template 04)
5. Project structure (using template 05)
6. Complete implementation (all files, fully working)

Then provide full working code for every file.
```

### Example 2: Multi-Tenant SaaS

**Ask:**
```
Create a SaaS platform for managing employee timesheets.

Requirements:
- Companies sign up and create accounts
- Each company has employees
- Employees submit timesheets (daily/weekly)
- Managers approve timesheets
- Admin dashboard with analytics
- POPIA-compliant data handling
- Audit trail for all changes
- Role-based access (admin, manager, employee)
- Export to CSV functionality

Use the developer docs:
1. Start with complete technical specification
2. Design full architecture
3. Define database schema
4. Plan comprehensive testing
5. Structure the project
6. Generate complete working implementation

Make it production-ready.
```

---

## 5. Verification Checklist

After Antigravity generates your project, verify:

### Documentation
- [ ] Technical specification is complete and signed off
- [ ] Architecture diagram shows all components
- [ ] Schema shows all tables with relationships
- [ ] API contracts show all endpoints
- [ ] Error codes are defined for all scenarios

### Code Quality
- [ ] All files are generated (no placeholders)
- [ ] TypeScript strict mode enabled
- [ ] No `any` types used
- [ ] All functions have parameter types
- [ ] All functions have return types
- [ ] Error handling on all paths
- [ ] No hardcoded secrets in code

### Tests
- [ ] Unit tests for utils and services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical workflows
- [ ] Security tests (OWASP, POPIA)
- [ ] Test fixtures are defined
- [ ] Coverage >80%

### Configuration
- [ ] .env.example provided
- [ ] package.json has all dependencies
- [ ] tsconfig.json strict: true
- [ ] vitest.config.ts configured
- [ ] playwright.config.ts configured
- [ ] GitHub actions workflows set up

### Compliance
- [ ] POPIA-compliant data handling
- [ ] Audit logging implemented
- [ ] Password hashing (bcrypt)
- [ ] JWT tokens properly signed
- [ ] No sensitive data in logs
- [ ] Rate limiting configured

### Security
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens (if needed)
- [ ] Authentication required
- [ ] Authorization checks
- [ ] Secrets not in code
- [ ] HTTPS enforced in production

---

## 6. Common Antigravity Prompts

### Generate API Endpoint

```
Generate the API endpoint implementation for: [endpoint description]

Based on these specifications:
- Path: [e.g., POST /api/v1/users]
- Request: [Zod schema]
- Response: [Response type]
- Auth: [Required/Optional]
- Permissions: [Who can use]
- Errors: [What can fail]
- Database: [What queries needed]

Create:
1. Route handler (full implementation)
2. Request validation
3. Service logic
4. Error handling
5. Response formatting
6. Unit tests
7. Integration tests

Complete working code, no pseudo-code.
```

### Generate Service Class

```
Generate the complete [ServiceName] service.

Methods:
- [method signature and description]
- [method signature and description]

Dependencies:
- [Repository/Service dependencies]

Error handling:
- [Error types and how handled]

Logging:
- [What to log]

Tests:
- Unit tests for all methods
- Error scenarios
- Edge cases

Full TypeScript implementation.
Complete test coverage.
```

### Generate Repository Class

```
Generate the complete [EntityName]Repository.

Methods needed:
- create(data): Create new record
- findById(id): Get by ID
- findAll(): List all
- update(id, data): Update record
- delete(id): Soft delete
- [any custom queries]

Database:
- Table: [table name]
- Use parameterized queries
- Transactions where needed

Error handling:
- [Handle specific database errors]

Full TypeScript implementation.
Assume PostgreSQL with connection pool.
```

---

## 7. South Africa Compliance Checklist

When generating projects, ensure Antigravity includes:

### POPIA (2013) Compliance
- [ ] Data collection consent mechanism
- [ ] Privacy policy link in UI
- [ ] Data processing logs (audit table)
- [ ] User data export endpoint
- [ ] User account deletion endpoint
- [ ] Data retention periods defined
- [ ] Sensitive data encrypted at rest
- [ ] Cross-border transfer controls (if applicable)

### ECTA (2002) Compliance
- [ ] Electronic signatures supported
- [ ] Secure communication (HTTPS)
- [ ] Digital evidence preservation
- [ ] Electronic records valid

### NCA (2005) Compliance (if financial services)
- [ ] Affordability checks
- [ ] Credit scoring documentation
- [ ] Lending decision transparency
- [ ] Customer interaction logs
- [ ] Complaint handling process

### King Code (if corporate)
- [ ] Governance documentation
- [ ] Audit trail
- [ ] Risk assessment
- [ ] Internal controls

---

## 8. Debugging Tips

### If Generation Seems Incomplete

**Ask:**
```
Review your generated [component] and:

1. Verify every function has full implementation (no TODO comments)
2. Verify all error cases are handled
3. Verify all types are properly defined
4. Verify all dependencies are imported
5. Verify all tests are included

If anything is missing or incomplete, regenerate with:
- Explicit requirement to include [missing part]
- Example of what a complete version looks like
- Full specification reference
```

### If Tests Don't Run

**Ask:**
```
Debug the test setup:

1. Show the exact error message
2. Check vitest configuration
3. Verify test fixtures are accessible
4. Verify database mocking is correct
5. Check path aliases in tsconfig.json

Provide:
- Complete working test setup
- All required fixtures
- Database setup and teardown
- Mock configurations
```

### If Types Don't Align

**Ask:**
```
Fix type misalignment:

1. Show the type error
2. Review the type definitions
3. Check API contract matches implementation
4. Verify database schema matches types
5. Ensure Zod schemas match types

Regenerate with:
- Type definitions matching API contracts
- Database types matching Zod schemas
- All type exports properly aliased
```

---

## 9. Production Deployment Checklist

Before deploying generated code:

### Pre-Deployment
- [ ] Run `npm run test:ci` - all tests pass
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run typecheck` - no type errors
- [ ] Security audit: `npm audit`
- [ ] Code review completed
- [ ] Secrets not in code
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Rollback plan documented

### Deployment
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backup verified
- [ ] Incident response plan ready

### Post-Deployment
- [ ] Health checks passing
- [ ] Error rates normal
- [ ] Response times normal
- [ ] User testing completed
- [ ] Documentation updated
- [ ] Team trained

---

## 10. Iterating on Generated Code

### Add New Feature

```
Add [feature description] to the existing project.

Update:
1. Technical specification (add new user stories)
2. Database schema (new tables/columns needed)
3. API contracts (new endpoints)
4. Service layer (new business logic)
5. Routes (new endpoints)
6. Tests (new test cases)

Provide:
- Complete updated files
- New tests
- Database migrations
- API documentation updates

Maintain consistency with existing code style.
```

### Fix Security Issue

```
Fix [security issue] in the generated code.

Provide:
1. Analysis of the vulnerability
2. Root cause
3. Complete fixed code
4. Tests verifying fix
5. Prevention guidance

Make fixes production-ready.
Ensure backward compatibility if possible.
```

---

## Support Resources

### Documentation Structure
```
/docs
├─ 00-SYSTEM-PROMPT.md ← Start here
├─ 01-SPEC-TEMPLATE.md ← Define requirements
├─ 02-ARCHITECTURE-TEMPLATE.md ← Design system
├─ 03-SCHEMA-CONTRACTS.md ← Define data
├─ 04-TESTING-STRATEGY.md ← Plan tests
├─ 05-PROJECT-STRUCTURE.md ← Organize files
└─ THIS-FILE (Quick Start)
```

### When Stuck

1. **Check the relevant template** - Most answers are in the docs
2. **Reference the examples** - Templates have worked examples
3. **Ask Antigravity** - Provide the template and specific issue
4. **Verify compliance** - Use checklist sections

### When Antigravity Generates Incorrectly

```
Antigravity generated [component] incorrectly.

Issues:
1. [Specific issue]
2. [Specific issue]

Reference:
[Link to relevant template section]

Requirements:
[Copy exact requirements from template]

Regenerate [component] following the template exactly.
Show your work.
```

---

**Version**: 1.0 | **Updated**: May 2026 | **For**: Antigravity 2 AI IDE

