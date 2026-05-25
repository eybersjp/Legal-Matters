# Schema & Contracts Template

**Define all data structures and API contracts before implementation**

---

## 1. Database Schema (DDL)

### SQL Template
```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(60) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_role ON users(role);

-- Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NULL,
  company_name VARCHAR(255) NULL,
  job_title VARCHAR(255) NULL,
  bio TEXT NULL,
  avatar_url TEXT NULL,
  locale VARCHAR(10) DEFAULT 'en_ZA',
  timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Audit Log Table (for POPIA compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NULL,
  changes JSONB NULL,
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### Table Specifications

#### Users
```
Purpose: Store user account information

Fields:
- id: UUID (PRIMARY KEY) - Unique identifier
- email: VARCHAR(255) UNIQUE NOT NULL - Contact email, case-insensitive
- password_hash: VARCHAR(60) NOT NULL - Bcrypt hash, never plain text
- first_name: VARCHAR(100) NULL - User's first name
- last_name: VARCHAR(100) NULL - User's last name
- role: VARCHAR(50) NOT NULL DEFAULT 'user' - 'user', 'admin', 'moderator'
- is_active: BOOLEAN DEFAULT true - Soft delete flag
- email_verified: BOOLEAN DEFAULT false - Email confirmation status
- last_login_at: TIMESTAMP NULL - Last successful login
- created_at: TIMESTAMP NOT NULL DEFAULT NOW() - Account creation time
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW() - Last modification time
- deleted_at: TIMESTAMP NULL - Soft delete timestamp

Constraints:
- UNIQUE: email
- FOREIGN KEYS: None (references user_profiles, sessions)
- CHECK: email matches RFC 5322 pattern
- CHECK: role IN ('user', 'admin', 'moderator')

Compliance:
- POPIA: Contains personal data (email, name)
- Encryption: password_hash (bcrypt), phone in profile (AES-256)
- Retention: 7 years after deletion per NCA
- Access: Audit all access to this table

Soft Delete Strategy:
- deleted_at IS NULL = active user
- deleted_at IS NOT NULL = deleted user
- Queries always filter: WHERE deleted_at IS NULL
- Permanent deletion: Only after retention period
```

#### Sessions
```
Purpose: Track active login sessions and tokens

Fields:
- id: UUID (PRIMARY KEY) - Session identifier
- user_id: UUID NOT NULL FK - Reference to user
- token_hash: VARCHAR(255) UNIQUE NOT NULL - Hash of JWT token
- refresh_token_hash: VARCHAR(255) UNIQUE NOT NULL - Hash of refresh token
- ip_address: INET NULL - Client IP address
- user_agent: TEXT NULL - Browser/client identifier
- expires_at: TIMESTAMP NOT NULL - When token expires
- created_at: TIMESTAMP NOT NULL - When session created
- updated_at: TIMESTAMP NOT NULL - When token last refreshed

Constraints:
- FOREIGN KEY: user_id → users.id (CASCADE DELETE)
- UNIQUE: token_hash (for lookups)
- UNIQUE: refresh_token_hash

Cleanup:
- Delete records where expires_at < NOW() (daily)
- Keep audit trail of deleted sessions for 90 days

Security:
- Never store plain tokens, only hashes
- Hash with SHA-256 before storing
- Include salt in hash (use bcrypt for tokens too)
```

#### User Profiles
```
Purpose: Extended user profile information

Fields:
- id: UUID (PRIMARY KEY) - Profile identifier
- user_id: UUID UNIQUE FK - Reference to user
- phone_number: VARCHAR(20) NULL - Contact phone
- company_name: VARCHAR(255) NULL - User's company
- job_title: VARCHAR(255) NULL - User's job title
- bio: TEXT NULL - User biography
- avatar_url: TEXT NULL - Profile picture URL
- locale: VARCHAR(10) DEFAULT 'en_ZA' - Preferred language
- timezone: VARCHAR(50) DEFAULT 'Africa/Johannesburg' - User timezone
- created_at: TIMESTAMP NOT NULL - Record creation
- updated_at: TIMESTAMP NOT NULL - Last modification

Constraints:
- UNIQUE: user_id (1:1 with users)
- FOREIGN KEY: user_id → users.id (CASCADE DELETE)

Compliance:
- POPIA: Contains personal data (phone, location preferences)
- Encryption: Encrypt phone_number, bio at rest
- User Rights: User can export/delete profile data
```

#### Audit Logs
```
Purpose: Track all data changes for POPIA compliance

Fields:
- id: UUID (PRIMARY KEY) - Log entry identifier
- user_id: UUID FK NULL - Who made the change
- action: VARCHAR(100) NOT NULL - 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'DELETE_REQUESTED'
- resource_type: VARCHAR(100) NOT NULL - 'user', 'session', 'profile'
- resource_id: VARCHAR(255) NULL - ID of changed resource
- changes: JSONB NULL - Old vs new values (encrypted)
- ip_address: INET NULL - Source IP address
- created_at: TIMESTAMP NOT NULL - When change occurred

Queries:
- Find all changes to a user: WHERE resource_type='user' AND resource_id=?
- Find all user actions: WHERE user_id=? ORDER BY created_at DESC
- POPIA audit trail: WHERE action IN ('EXPORT', 'DELETE_REQUESTED') AND created_at > '7 days ago'

Retention:
- Keep for 3 years minimum (regulatory requirement)
- Encrypt sensitive changes with AES-256
- Never log passwords or sensitive data
```

---

## 2. TypeScript Type Contracts

### User Types
```typescript
// User domain types (what exists in database)
export type UserRole = 'user' | 'admin' | 'moderator';

export interface User {
  id: string; // UUID
  email: string; // lowercase for comparison
  password_hash: string; // bcrypt hash
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserProfile {
  id: string; // UUID
  user_id: string; // FK
  phone_number: string | null;
  company_name: string | null;
  job_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

// Data Transfer Objects (API responses)
export interface UserDTO {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  email_verified: boolean;
  profile: UserProfileDTO;
}

export interface UserProfileDTO {
  phone_number: string | null;
  company_name: string | null;
  job_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
}

// Request validation schemas (use Zod)
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be 12+ characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const UpdateProfileRequestSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  bio: z.string().max(500).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
```

### Authentication Types
```typescript
export interface AuthTokens {
  token: string; // JWT access token
  refreshToken: string; // Refresh token
  expiresIn: number; // Seconds until expiration
}

export interface TokenPayload {
  sub: string; // User ID (subject)
  email: string;
  role: UserRole;
  iat: number; // Issued at (unix timestamp)
  exp: number; // Expires at (unix timestamp)
  jti: string; // JWT ID (unique per token)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    token: string;
    refreshToken: string;
    expiresIn: number;
    user: UserDTO;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  success: true;
  data: {
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

### Error Types
```typescript
export enum ErrorCode {
  // Validation
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  FORBIDDEN = 'FORBIDDEN',
  
  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  
  // Rate limit
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
    timestamp: string;
    traceId: string;
  };
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## 3. API Request/Response Contracts

### Authentication Endpoints

#### POST /api/v1/auth/register
```
Request:
{
  "data": {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
  }
}

Response (201 Created):
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "email_verified": false,
      "profile": {
        "phone_number": null,
        "company_name": null,
        "job_title": null,
        "bio": null,
        "avatar_url": null,
        "locale": "en_ZA",
        "timezone": "Africa/Johannesburg"
      }
    },
    "message": "Account created. Check your email to verify."
  },
  "meta": {
    "version": "v1",
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}

Response (400 Bad Request):
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Password must be 12+ characters with uppercase, lowercase, number, and special character",
    "statusCode": 400,
    "details": {
      "field": "password",
      "rules": [
        "min_length: 12",
        "has_uppercase: false",
        "has_lowercase: true",
        "has_number: true",
        "has_special: false"
      ]
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}

Response (409 Conflict):
{
  "success": false,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Email already registered",
    "statusCode": 409,
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

#### POST /api/v1/auth/login
```
Request:
{
  "data": {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "email_verified": true,
      "profile": { ... }
    }
  },
  "meta": { ... }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "statusCode": 401,
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}

Response (429 Too Many Requests):
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many login attempts. Try again in 15 minutes.",
    "statusCode": 429,
    "details": {
      "retryAfter": 900
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

#### POST /api/v1/auth/refresh
```
Request:
{
  "data": {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "meta": { ... }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Refresh token has expired. Please login again.",
    "statusCode": 401,
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

#### POST /api/v1/auth/logout
```
Request:
{
  "data": {}
}

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "meta": { ... }
}
```

### User Endpoints

#### GET /api/v1/users/:id
```
Request:
GET /api/v1/users/550e8400-e29b-41d4-a716-446655440000

Headers:
Authorization: Bearer [token]

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "email_verified": true,
    "profile": {
      "phone_number": "+27 (0)11 1234 567",
      "company_name": "Acme Corp",
      "job_title": "Engineer",
      "bio": "Software engineer interested in AI",
      "avatar_url": "https://cdn.example.com/avatars/user.jpg",
      "locale": "en_ZA",
      "timezone": "Africa/Johannesburg"
    }
  },
  "meta": { ... }
}

Response (404 Not Found):
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "statusCode": 404,
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

#### PUT /api/v1/users/:id
```
Request:
PUT /api/v1/users/550e8400-e29b-41d4-a716-446655440000

Headers:
Authorization: Bearer [token]
Content-Type: application/json

Body:
{
  "data": {
    "first_name": "Jonathan",
    "phone_number": "+27 (0)21 1234 567",
    "timezone": "Africa/Cape_Town"
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "Jonathan",
    "last_name": "Doe",
    "role": "user",
    "email_verified": true,
    "profile": {
      "phone_number": "+27 (0)21 1234 567",
      "company_name": "Acme Corp",
      "job_title": "Engineer",
      "bio": "Software engineer interested in AI",
      "avatar_url": "https://cdn.example.com/avatars/user.jpg",
      "locale": "en_ZA",
      "timezone": "Africa/Cape_Town"
    }
  },
  "meta": { ... }
}

Response (403 Forbidden):
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You can only update your own profile",
    "statusCode": 403,
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "uuid-for-logging"
  }
}
```

---

## 4. Validation Rules

### Email Validation
```
- Format: RFC 5322 compliant
- Regex: ^[^\s@]+@[^\s@]+\.[^\s@]+$
- Length: 1-255 characters
- Case: Normalize to lowercase for storage and comparison
- Reserved: No @example.com, @test.com, @localhost
```

### Password Validation
```
Requirements:
- Minimum 12 characters
- At least one uppercase letter [A-Z]
- At least one lowercase letter [a-z]
- At least one number [0-9]
- At least one special character [!@#$%^&*()_+-=\[\]{};':"\\|,.<>\/?]

Storage:
- Hash with bcrypt (cost 12+)
- Never log plaintext password
- Never send password in response
- Never store password in audit logs

Comparison:
- Always use constant-time comparison (bcrypt.compare)
- Never use === for password comparison
```

### Phone Number Validation
```
Formats accepted:
- +27 (0)11 1234 567
- +27111234567
- 011 1234 567
- 0111234567

Storage:
- Normalize to E.164 format: +27111234567
- Encrypt in database (AES-256)
- Comply with POPIA for contact data
```

---

## 5. Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform(val => val.toLowerCase()); // Normalize

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be 12+ characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Must contain special character');

export const PhoneSchema = z
  .string()
  .regex(/^\+?27\d{9}$/, 'Invalid South African phone number')
  .optional();

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string(),
});

export const UpdateProfileSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone_number: PhoneSchema,
  company_name: z.string().max(255).optional(),
  job_title: z.string().max(255).optional(),
  bio: z.string().max(500).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});
```

