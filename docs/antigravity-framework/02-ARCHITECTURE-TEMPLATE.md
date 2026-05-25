# Architecture Documentation Template

**Use this template to define system design clearly and unambiguously**

---

## 1. Architecture Overview

### System Context Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Internet Users                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼─────┐
                    │   Nginx     │ (Reverse Proxy)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌───▼────┐        ┌───▼────┐
   │ Next.js │        │ Next.js │        │ Next.js │
   │ Server1 │        │ Server2 │        │ Server3 │
   └────┬────┘        └───┬────┘        └───┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL  │ (Primary)
                    │  Replication │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL  │ (Replica)
                    │    (Backup)  │
                    └──────────────┘
```

### Key Technologies
- **Frontend**: Next.js 14 (React, TypeScript)
- **Backend**: Node.js with Next.js API routes
- **Database**: PostgreSQL 15
- **Cache**: Redis (optional)
- **Message Queue**: [if async processing needed]
- **Authentication**: JWT + HTTP-only cookies
- **File Storage**: [S3 or local]
- **CDN**: [CloudFlare or similar]

---

## 2. Component Architecture

### High-Level Components
```
Application Layer
├─ Web Frontend (Next.js pages)
├─ API Layer (Next.js route handlers)
└─ Admin Dashboard (separate Next.js app)

Service Layer
├─ Authentication Service
├─ User Service
├─ Business Logic Services
└─ External Integration Services

Data Layer
├─ Database (PostgreSQL)
├─ Cache (Redis)
└─ File Storage

Infrastructure Layer
├─ Load Balancer
├─ API Gateway
├─ Monitoring/Logging
└─ Message Queue
```

### Component Details
```
Component: [Name]

Purpose:
[What this component does]

Responsibilities:
- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

Dependencies:
- [Depends on Component X]
- [Uses Service Y]
- [Consumes Message Queue Z]

Interfaces:
```
interface ComponentX {
  initialize(): Promise<void>;
  process(input: InputType): Promise<OutputType>;
  shutdown(): Promise<void>;
}
```

Error Handling:
- [Error type] → [How handled]
- [Error type] → [How handled]

Scaling:
- [Horizontal/Vertical]
- [Bottlenecks]
- [Mitigation]
```

### Example: Authentication Service
```
Component: AuthenticationService

Purpose:
Handle user authentication, token generation, and verification.

Responsibilities:
- Validate user credentials
- Generate JWT tokens
- Verify and decode tokens
- Manage refresh token lifecycle
- Revoke tokens on logout
- Enforce rate limiting on failed attempts

Dependencies:
- UserRepository (database access)
- CacheService (rate limiting, token blacklist)
- EmailService (password reset)

Interfaces:
```
interface AuthenticationService {
  login(email: string, password: string): Promise<{
    token: string;
    refreshToken: string;
    user: UserDTO;
  }>;
  
  verify(token: string): Promise<TokenPayload>;
  
  refresh(refreshToken: string): Promise<{
    token: string;
    refreshToken: string;
  }>;
  
  logout(token: string): Promise<void>;
  
  resetPassword(email: string, newPassword: string): Promise<void>;
}
```

Error Handling:
- InvalidCredentialsError → Return 401
- RateLimitedError → Return 429
- TokenExpiredError → Return 401, client requests refresh
- InvalidTokenError → Return 401
- DatabaseError → Return 500, log error

Scaling:
- Horizontal: Multiple instances share Redis cache for rate limiting
- Bottleneck: Token verification on every request
- Mitigation: Cache verified tokens in Redis with 5-minute TTL
```

---

## 3. Data Flow Architecture

### User Registration Flow
```
1. User submits registration form
   ↓
2. Frontend validates (email format, password strength)
   ↓
3. POST /api/auth/register
   ↓
4. API validates input (Zod schema)
   ↓
5. Check if email already exists
   ├─ Yes → Return 400
   └─ No → Continue
   ↓
6. Hash password (bcrypt cost 12)
   ↓
7. Create user record in database
   ↓
8. Generate verification token
   ↓
9. Send verification email
   ↓
10. Return 201 (account created, not verified)
   ↓
11. User clicks email link
   ↓
12. Verify token and mark email as verified
   ↓
13. User can now login
```

### API Request Flow
```
┌─────────────────────┐
│   Client Request    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 1. Receive & Log Request            │
│    - Log ID, method, path, IP       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Parse & Validate Input           │
│    - Parse JSON/form data           │
│    - Validate with Zod schema       │
│    - Return 400 if invalid          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Authentication Middleware        │
│    - Extract JWT from header        │
│    - Verify signature               │
│    - Check token expiry             │
│    - Return 401 if invalid          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 4. Authorization Middleware         │
│    - Check user role/permissions    │
│    - Return 403 if denied           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 5. Route Handler                    │
│    - Call service layer             │
│    - Handle business logic          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 6. Database Queries (if needed)     │
│    - Parameterized queries          │
│    - Transaction handling           │
│    - Error handling                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 7. Format Response                  │
│    - Serialize data                 │
│    - Set status code                │
│    - Set response headers           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 8. Send Response to Client          │
│    - Status: 200|201|400|500 etc    │
│    - Headers set                    │
│    - Body JSON serialized           │
└─────────────────────────────────────┘
```

---

## 4. Database Architecture

### Schema Diagram (Text Format)

```
Users Table
├─ id (UUID, PK)
├─ email (VARCHAR, UNIQUE)
├─ password_hash (VARCHAR)
├─ role (ENUM)
├─ created_at (TIMESTAMP)
└─ deleted_at (TIMESTAMP, nullable - soft delete)
     │
     ├──────────────► Sessions (1:N)
     │                ├─ id (UUID, PK)
     │                ├─ user_id (FK → Users.id)
     │                ├─ token_hash (VARCHAR)
     │                └─ expires_at (TIMESTAMP)
     │
     └──────────────► Profiles (1:1)
                      ├─ id (UUID, PK)
                      ├─ user_id (FK → Users.id, UNIQUE)
                      ├─ first_name (VARCHAR)
                      ├─ last_name (VARCHAR)
                      └─ updated_at (TIMESTAMP)
```

### Indexes
```
Users
├─ (email) UNIQUE - for login lookups
├─ (created_at DESC) - for listing recent users
└─ (deleted_at) - for soft delete queries

Sessions
├─ (user_id) - for finding user sessions
├─ (expires_at) - for cleanup jobs
└─ (user_id, created_at DESC) - for session listing

Profiles
├─ (user_id) UNIQUE - for profile lookups
└─ (updated_at DESC) - for change tracking
```

### Data Integrity Constraints
```
Foreign Keys:
├─ Sessions.user_id → Users.id (DELETE CASCADE)
└─ Profiles.user_id → Users.id (DELETE CASCADE)

Unique Constraints:
├─ Users.email
└─ Profiles.user_id

Check Constraints:
├─ Users.email matches RFC 5322
└─ Sessions.expires_at > created_at
```

---

## 5. API Architecture

### API Layer Structure
```
API Routes
├─ /api/v1/
│  ├─ auth/
│  │  ├─ POST /register
│  │  ├─ POST /login
│  │  ├─ POST /logout
│  │  └─ POST /refresh
│  │
│  ├─ users/
│  │  ├─ GET /:id
│  │  ├─ PUT /:id
│  │  └─ DELETE /:id
│  │
│  └─ health/
│     └─ GET / (readiness check)
└─ /api/v1/admin/ (admin-only routes)
   ├─ GET /users
   └─ POST /users/:id/deactivate
```

### Request/Response Pattern
```
All requests:
{
  "data": { ... },          // Actual payload
  "meta": {                 // Metadata
    "version": "v1",
    "timestamp": "2024-...",
    "traceId": "uuid"
  }
}

All responses (success):
{
  "success": true,
  "data": { ... },          // Response data
  "meta": { ... }           // Same format
}

All responses (error):
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email format is invalid",
    "details": { ... }       // Additional context
  },
  "meta": { ... }
}
```

---

## 6. Authentication & Authorization

### JWT Token Structure
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user ID
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,                              // issued at
  "exp": 1234567890 + 86400,                      // expires in 24 hours
  "jti": "token-id-unique-per-token"              // for revocation
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  SECRET_KEY
)
```

### Role-Based Access Control (RBAC)
```
Roles:
├─ user
│  ├─ Can read own profile
│  └─ Can update own profile
├─ moderator
│  ├─ Can read all profiles
│  ├─ Can moderate content
│  └─ Can manage reports
└─ admin
   ├─ Can read all profiles
   ├─ Can update any profile
   ├─ Can deactivate users
   └─ Can access admin dashboard

Permission Checks:
```
async function requireRole(req: NextApiRequest, allowedRoles: string[]) {
  const user = req.user;
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}
```
```

---

## 7. Error Handling Architecture

### Error Hierarchy
```
Error (base)
├─ ValidationError (400)
│  ├─ InvalidEmailError
│  ├─ PasswordTooWeakError
│  └─ MissingFieldError
├─ AuthenticationError (401)
│  ├─ InvalidCredentialsError
│  └─ TokenExpiredError
├─ AuthorizationError (403)
│  └─ InsufficientPermissionsError
├─ NotFoundError (404)
├─ ConflictError (409)
│  └─ DuplicateEmailError
├─ RateLimitError (429)
└─ InternalError (500)
   ├─ DatabaseError
   └─ ExternalServiceError
```

### Error Response Format
```
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email format is invalid",
    "statusCode": 400,
    "details": {
      "field": "email",
      "value": "notanemail"
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

---

## 8. Scalability & Performance

### Horizontal Scaling Strategy
```
Load Balancer
    ↓
[Instance 1] [Instance 2] [Instance 3] (stateless)
    ↓           ↓           ↓
    └───────────┼───────────┘
                │
          PostgreSQL
          (connection pool)
```

### Caching Strategy
```
Frontend Cache
├─ Static assets (browser cache, 1 year)
├─ API responses (in-memory, 5 minutes)
└─ User session (Redis, 24 hours)

Backend Cache
├─ Database query results (Redis, 10 minutes)
├─ User profiles (Redis, 1 hour)
└─ Permission checks (in-memory, 5 minutes)

Cache Invalidation:
├─ On user update → invalidate user profile cache
├─ On role change → invalidate permission cache
└─ Explicit cleanup on logout
```

### Database Optimization
```
Connection Pooling:
├─ Pool size: 20 connections
├─ Idle timeout: 30 seconds
└─ Queue timeout: 5 seconds

Query Optimization:
├─ Use indexes on frequently filtered columns
├─ Avoid N+1 queries (use joins or batch loading)
├─ Use EXPLAIN ANALYZE for slow queries
└─ Archive old data to separate tables

Replication:
├─ Primary (read/write)
├─ Replica 1 (read-only)
└─ Replica 2 (read-only for analytics)
```

---

## 9. Security Architecture

### Defense in Depth
```
Layer 1: Network
├─ HTTPS/TLS 1.3+
├─ CORS configured
└─ Rate limiting per IP

Layer 2: Application
├─ Input validation (Zod)
├─ Output encoding
├─ CSRF token validation
└─ SQL injection prevention (parameterized queries)

Layer 3: Authentication
├─ bcrypt password hashing
├─ JWT with short expiry (24 hours)
├─ Refresh tokens (30 days)
└─ Session invalidation on logout

Layer 4: Authorization
├─ Role-based access control
├─ Resource ownership checks
└─ Permission caching

Layer 5: Data
├─ Encryption at rest (AES-256)
├─ Encryption in transit (TLS)
├─ Database backups
└─ Audit logging
```

### POPIA Compliance Implementation
```
Data Collection
├─ Collect only necessary data
├─ Document lawful basis
├─ Explicit user consent
└─ Store consent record

Data Processing
├─ Process only for stated purpose
├─ Limit access to trained staff
├─ Document all processing
└─ Use encryption for sensitive data

Data Rights
├─ User can request data export
├─ User can request deletion
├─ Implement 30-day response time
└─ Log all access requests

Data Retention
├─ Delete data after retention period
├─ Anonymize when possible
├─ Maintain backup deletion logs
└─ Keep audit logs for 3 years
```

---

## 10. Deployment Architecture

### Environments
```
Development
├─ Local PostgreSQL
├─ Local Redis (optional)
├─ Console logging
└─ No external dependencies

Staging
├─ Managed PostgreSQL
├─ Managed Redis
├─ Centralized logging
├─ Monitoring enabled
└─ Staging email service

Production
├─ Multi-instance PostgreSQL with replication
├─ Redis cluster
├─ Centralized encrypted logging
├─ Full monitoring and alerting
├─ Production email service
└─ CDN for static assets
```

### Deployment Pipeline
```
Developer commits code
    ↓
GitHub Actions triggers
    ↓
Run tests (unit + integration)
    ↓
Run security scans
    ↓
Build Docker image
    ↓
Push to registry
    ↓
Deploy to staging
    ↓
Run E2E tests
    ↓
Manual approval required
    ↓
Deploy to production (blue-green)
    ↓
Smoke tests
    ↓
Monitor error rates
    ↓
Automatic rollback if errors > 1%
```

---

## 11. Monitoring & Observability

### Metrics to Track
```
Application Metrics
├─ Request rate (requests/second)
├─ Response time (p50, p95, p99)
├─ Error rate (% 5xx responses)
├─ Authentication failures
└─ Authorization denials

Infrastructure Metrics
├─ CPU usage (% of limit)
├─ Memory usage (% of limit)
├─ Disk usage (% of capacity)
├─ Network I/O
└─ Database connection pool usage

Business Metrics
├─ Active users
├─ Sign-ups per day
├─ User retention
└─ Feature usage
```

### Logging Strategy
```
Log Format (JSON)
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO|WARN|ERROR",
  "service": "auth-service",
  "traceId": "uuid",
  "userId": "optional-user-id",
  "message": "User logged in successfully",
  "meta": {
    "email": "user@example.com",
    "ip": "192.168.1.1",
    "duration_ms": 145
  }
}

Sensitive Data Redaction:
├─ Never log passwords
├─ Never log full credit cards
├─ Redact personal information
└─ Hash email for correlation
```

### Alerting Rules
```
Alert on:
├─ Error rate > 1% for 5 minutes
├─ Response time p95 > 500ms for 10 minutes
├─ Database connection pool > 80% for 5 minutes
├─ Failed login attempts > 100 per minute
├─ Disk usage > 85%
└─ Memory usage > 90%
```

---

## Deployment Instructions

### For Antigravity 2
1. Read technical specification first
2. Understand data model and API contracts
3. Set up database schema from schema definitions
4. Implement authentication layer first
5. Build API endpoints according to contracts
6. Add monitoring and error handling
7. Run security tests before deployment

### Version Control
- **Branch strategy**: GitHub Flow
- **Main branch**: Production-ready code only
- **Review required**: All PRs require 2 approvals
- **Protected branches**: main, staging

