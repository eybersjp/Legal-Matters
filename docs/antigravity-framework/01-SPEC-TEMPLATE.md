# Technical Specification Template

**Use this template for every project submitted to Antigravity 2**

---

## 1. Project Overview

### Title
[Project name]

### Description
[Brief description of what the system does]

### Business Value
[Why this project matters - who benefits and how]

### Compliance Scope
- [ ] POPIA (Personal Information Protection Act)
- [ ] ECTA (Electronic Communications & Transactions Act)
- [ ] NCA (National Credit Act) - if financial services
- [ ] King Code - if corporate
- [ ] Industry-specific regulations: [specify]

---

## 2. User Stories & Acceptance Criteria

### Story Template
```
As a [user role]
I want to [action/capability]
So that [business outcome]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Preconditions:
- [State system must be in before action]

Postconditions:
- [State system is in after action]
```

### Example Story
```
As a user
I want to create an account with my email
So that I can securely access the application

Acceptance Criteria:
- [ ] User can input email and password
- [ ] Password must be 12+ characters with mixed case
- [ ] System validates email format per RFC 5322
- [ ] Duplicate emails are rejected
- [ ] Password is hashed with bcrypt (cost 12+)
- [ ] User receives confirmation email
- [ ] Email link expires after 24 hours
- [ ] Account created event is logged

Preconditions:
- User is unauthenticated
- Email service is operational

Postconditions:
- Account exists in database
- User is not automatically logged in
- Confirmation email is sent
```

---

## 3. Functional Requirements

### Core Features
List each feature with:
- **Feature Name**: [Name]
- **Description**: [What it does]
- **Actors**: [Who uses it]
- **Inputs**: [What data is provided]
- **Outputs**: [What is returned/produced]
- **Rules**: [Business rules that apply]
- **Errors**: [What can fail and how to handle]

### Example
```
Feature: User Authentication

Description:
Users must prove their identity before accessing protected resources.

Actors:
- Unauthenticated user
- Application system

Inputs:
- Email address
- Password

Outputs:
- JWT token (valid for 24 hours)
- User profile object
- Refresh token (valid for 30 days)

Rules:
- Maximum 5 failed login attempts per email per 15 minutes
- Failed attempts trigger rate limiting
- Successful login clears failed attempt counter
- Session tokens are revoked on logout
- Token claims include user ID and role

Errors:
- Invalid credentials: Return 401 without revealing if email exists
- Rate limited: Return 429 with retry-after header
- Database error: Return 500 with generic message, log full error
```

---

## 4. Data Model

### Entities
For each entity, provide:

```
Entity: [Name]

Fields:
- id: UUID (primary key)
- field_name: DataType (constraints)
- created_at: timestamp (auto-set)
- updated_at: timestamp (auto-set)

Relationships:
- [One-to-Many to Entity X]
- [Many-to-Many with Entity Y via JoinTable]

Constraints:
- Unique: [field]
- Not Null: [fields]
- Check: [validation rule]
- Foreign Key: [references]

Compliance:
- POPIA: [personal data?]
- Retention: [how long to keep]
- Encryption: [what's encrypted at rest]

Indexes:
- (email) - for authentication lookups
- (created_at) - for time-based queries
```

### Example
```
Entity: User

Fields:
- id: UUID (primary key, generated)
- email: VARCHAR(255) (unique, not null)
- email_verified: BOOLEAN (default false)
- password_hash: VARCHAR(60) (not null, bcrypt)
- first_name: VARCHAR(100) (nullable)
- last_name: VARCHAR(100) (nullable)
- phone_number: VARCHAR(20) (nullable)
- role: ENUM('user', 'admin', 'moderator') (default 'user')
- is_active: BOOLEAN (default true)
- last_login_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP (auto-set)
- updated_at: TIMESTAMP (auto-set)
- deleted_at: TIMESTAMP (nullable, soft delete)

Relationships:
- One-to-Many with Sessions
- Many-to-Many with Roles via UserRoles

Constraints:
- Unique: email
- Not Null: password_hash, role, is_active
- Check: email matches RFC 5322
- Foreign Key: role references Roles(id)

Compliance:
- POPIA: Yes (personal data: email, name, phone)
- Retention: 7 years after deletion (per NCA)
- Encryption: password_hash (bcrypt), phone_number (AES-256)

Indexes:
- (email) UNIQUE - for login
- (is_active, created_at) - for active users
- (deleted_at) - for soft deletes
```

---

## 5. API Contracts

### REST Endpoints

```
Method: GET|POST|PUT|DELETE|PATCH
Path: /api/v1/[resource]
Description: [What it does]

Request:
- Headers: [Required headers]
- Params: [URL parameters]
- Query: [Query string parameters]
- Body: [Request body schema]

Response (Success):
- Status: 200|201|204
- Headers: [Response headers]
- Body: [Response schema]

Response (Errors):
- 400: [Invalid request - specific conditions]
- 401: [Authentication required]
- 403: [Permission denied]
- 404: [Not found]
- 429: [Rate limited]
- 500: [Server error]

Example Request:
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

Example Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

## 6. Non-Functional Requirements

### Performance
- Page load: < 2 seconds (p95)
- API response: < 200ms (p95)
- Database query: < 100ms (p95)
- Concurrent users: [specify capacity]

### Scalability
- Horizontal scaling: [Yes/No]
- Load balancing: [Type if yes]
- Database sharding: [Strategy if applicable]

### Security
- Encryption at rest: AES-256
- Encryption in transit: TLS 1.3+
- Authentication: JWT or [specify]
- Rate limiting: [requests per second]
- CORS: [allowed origins]

### Reliability
- Uptime SLA: [99.9%/99.99%]
- Recovery time objective (RTO): [time]
- Recovery point objective (RPO): [data loss tolerance]
- Backup frequency: [daily/hourly/continuous]

### Compliance
- POPIA: [required controls]
- ECTA: [required controls]
- Audit logging: [events to log]
- Data retention: [policies per entity]

---

## 7. Constraints & Assumptions

### Technical Constraints
- [Runtime versions]
- [Database version]
- [Memory/CPU limits]
- [Third-party service dependencies]

### Business Constraints
- [Budget limits]
- [Timeline]
- [Resource availability]
- [Integration dependencies]

### Assumptions
- [System assumes X is available]
- [Users have Y capability]
- [Infrastructure supports Z]

### Out of Scope
- [Features explicitly excluded]
- [Integrations not included]
- [User roles not covered]

---

## 8. Testing Strategy

### Unit Tests
```
Scope: Individual functions/methods
Coverage Target: >90%
Tools: Vitest

Examples:
- Validate email format
- Hash password correctly
- Check rate limiting logic
- Verify permission checks
```

### Integration Tests
```
Scope: API endpoints with database
Coverage Target: >80%
Tools: Vitest + Test database

Examples:
- Create user flow (email validation, hashing, DB insert)
- Login flow (fetch user, verify password, issue token)
- Permission checks across services
```

### End-to-End Tests
```
Scope: Full user workflows
Coverage Target: Critical paths only
Tools: Playwright

Examples:
- User signup → email confirm → login
- User update profile
- Admin delete user
```

### Security Tests
```
- SQL injection attempts
- XSS payloads
- CSRF token validation
- Rate limiting enforcement
- Authentication bypass attempts
```

---

## 9. Deployment & Operations

### Environment Configuration
```
Development:
- Database: Local PostgreSQL
- Cache: Redis (optional)
- Email: Dev sink
- Logging: Console
- Monitoring: Basic

Staging:
- Database: Managed instance
- Cache: Redis cluster
- Email: Test account
- Logging: Centralized
- Monitoring: Full stack

Production:
- Database: Replicated, backed up
- Cache: Distributed cache
- Email: Production service
- Logging: Centralized, encrypted
- Monitoring: Full observability
```

### Monitoring & Alerts
- Uptime alerts: < 60 seconds
- Error rate alert: > 1%
- API latency alert: > 500ms (p95)
- Database connection alert: > 80% pool usage
- Disk space alert: > 80% full

### Incident Response
- Page on-call: [procedure]
- Escalation path: [contacts]
- Rollback procedure: [steps]

---

## 10. Acceptance & Validation

### Go-Live Checklist
- [ ] All user stories accepted by product owner
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] POPIA compliance verified
- [ ] Data migration tested
- [ ] Monitoring configured
- [ ] Incident response documented
- [ ] Deployment runbook created
- [ ] Rollback tested
- [ ] Team trained on operations

### Success Metrics
- [Metric 1 and target]
- [Metric 2 and target]
- [Metric 3 and target]

---

## Approval

- **Product Owner**: _________________________ Date: _______
- **Tech Lead**: _________________________ Date: _______
- **Security Lead**: _________________________ Date: _______
- **Compliance Officer**: _________________________ Date: _______

---

## Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | [Date] | [Name] | Initial spec |

