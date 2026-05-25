# Testing Strategy Template

**Comprehensive testing approach for Antigravity 2 projects**

---

## 1. Testing Philosophy

### Pyramid Approach
```
        ▲
       /│\
      / │ \
     /  │  \  E2E Tests (10%)
    /   │   \ - Full user workflows
   /    │    \- Playwright/Cypress
  /─────┼─────\
 /      │      \  Integration Tests (30%)
/       │       \ - API endpoints + Database
─────────────────\ - Vitest + test database
 \      │      / \
  \     │     /   \ Unit Tests (60%)
   \    │    /    - Functions/methods
    \   │   /     - Vitest
     \  │  /
      \ │ /
       \│/
        ▼
```

### Testing Strategy
1. **Unit Tests**: Fast, focused, high coverage (>90%)
2. **Integration Tests**: Test APIs with real database
3. **E2E Tests**: Critical user workflows only
4. **Security Tests**: OWASP, POPIA compliance
5. **Load Tests**: Performance under stress

---

## 2. Unit Testing

### Test Structure (Vitest)
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEmail } from './validators';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept valid email format', () => {
      const result = validateEmail('user@example.com');
      expect(result).toBe(true);
    });

    it('should accept emails with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result).toBe(true);
    });

    it('should normalize to lowercase', () => {
      const result = validateEmail('USER@EXAMPLE.COM');
      expect(result).toBe('user@example.com');
    });
  });

  describe('invalid emails', () => {
    it('should reject missing @', () => {
      const result = validateEmail('userexample.com');
      expect(result).toBe(false);
    });

    it('should reject missing domain', () => {
      const result = validateEmail('user@');
      expect(result).toBe(false);
    });

    it('should reject spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very long emails', () => {
      const longEmail = 'a'.repeat(256) + '@example.com';
      expect(() => validateEmail(longEmail)).toThrow('Email too long');
    });

    it('should handle null/undefined', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });
});
```

### Unit Test Patterns

#### Pure Function Testing
```typescript
import { hashPassword, comparePassword } from './crypto';

describe('Password Hashing', () => {
  it('should hash passwords with bcrypt', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true); // Bcrypt format
    expect(hash.length).toBe(60); // Bcrypt hash length
  });

  it('should generate different hashes for same password', async () => {
    const password = 'SecurePassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2); // Different salts
  });

  it('should correctly compare password with hash', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject invalid password', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await comparePassword('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should use constant-time comparison', async () => {
    const hash = await hashPassword('test');
    // Should not reveal timing difference between wrong and correct password
    const start1 = Date.now();
    await comparePassword('wrong', hash);
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await comparePassword('wrong2', hash);
    const time2 = Date.now() - start2;
    
    // Times should be similar (within 50ms noise)
    expect(Math.abs(time1 - time2)).toBeLessThan(50);
  });
});
```

#### Error Handling Testing
```typescript
import { AppError, ErrorCode } from './errors';
import { validateRegistration } from './validation';

describe('Error Handling', () => {
  it('should throw AppError with correct code', async () => {
    expect(() => {
      throw new AppError('Invalid email', ErrorCode.INVALID_EMAIL, 400);
    }).toThrow(AppError);
  });

  it('should include error details', async () => {
    const error = new AppError(
      'Validation failed',
      ErrorCode.INVALID_PASSWORD,
      400,
      { field: 'password', requirement: 'min_length: 12' }
    );

    expect(error.code).toBe(ErrorCode.INVALID_PASSWORD);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'password', requirement: 'min_length: 12' });
  });

  it('should validate on invalid input', () => {
    expect(() => {
      validateRegistration({
        email: 'notanemail',
        password: 'short',
      });
    }).toThrow(AppError);
  });
});
```

#### Mock Testing
```typescript
import { vi } from 'vitest';
import { sendEmail } from './email';
import { registerUser } from './auth';

describe('Registration with Mocked Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send verification email on successful registration', async () => {
    const sendEmailMock = vi.spyOn({ sendEmail }, 'sendEmail').mockResolvedValue(true);

    const user = await registerUser({
      email: 'user@example.com',
      password: 'SecurePass123!',
    });

    expect(user.id).toBeDefined();
    expect(user.email_verified).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Verify your email',
      template: 'verification',
    });
  });

  it('should handle email service failure gracefully', async () => {
    vi.spyOn({ sendEmail }, 'sendEmail').mockRejectedValue(
      new Error('Email service down')
    );

    expect(() => registerUser({
      email: 'user@example.com',
      password: 'SecurePass123!',
    })).toThrow('Failed to send verification email');
  });
});
```

---

## 3. Integration Testing

### Test Database Setup
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from './test-db';
import { UserRepository } from './repositories/user';

let db: any;
let userRepo: UserRepository;

describe('UserRepository', () => {
  beforeEach(async () => {
    db = await createTestDatabase();
    userRepo = new UserRepository(db);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('should create user in database', async () => {
    const newUser = await userRepo.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'user',
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe('test@example.com');
    expect(newUser.role).toBe('user');
  });

  it('should enforce unique email constraint', async () => {
    await userRepo.create({
      email: 'test@example.com',
      password_hash: 'hash1',
      role: 'user',
    });

    expect(() => userRepo.create({
      email: 'test@example.com',
      password_hash: 'hash2',
      role: 'user',
    })).toThrow('Unique constraint violation');
  });

  it('should retrieve user by email', async () => {
    const created = await userRepo.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'user',
    });

    const found = await userRepo.findByEmail('test@example.com');

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
  });

  it('should soft delete user', async () => {
    const created = await userRepo.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'user',
    });

    await userRepo.delete(created.id);

    const found = await userRepo.findById(created.id);
    expect(found).toBeUndefined(); // Soft deleted

    // But still retrievable with includeDeleted flag
    const foundWithDeleted = await userRepo.findById(created.id, { includeDeleted: true });
    expect(foundWithDeleted?.deleted_at).toBeDefined();
  });

  it('should update user profile', async () => {
    const user = await userRepo.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'user',
    });

    await userRepo.updateProfile(user.id, {
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+27111234567',
    });

    const updated = await userRepo.findById(user.id);
    expect(updated?.first_name).toBe('John');
    expect(updated?.last_name).toBe('Doe');
  });
});
```

### API Integration Testing
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from './server';
import { createTestDatabase, cleanupTestDatabase } from './test-db';

let server: any;
let db: any;

describe('POST /api/v1/auth/register', () => {
  beforeEach(async () => {
    db = await createTestDatabase();
    server = createServer(db);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    await cleanupTestDatabase(db);
  });

  it('should register user successfully', async () => {
    const response = await server.post('/api/v1/auth/register', {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      first_name: 'John',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('newuser@example.com');
    expect(response.body.data.user.email_verified).toBe(false);
  });

  it('should validate password requirements', async () => {
    const response = await server.post('/api/v1/auth/register', {
      email: 'newuser@example.com',
      password: 'weak', // Too weak
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
  });

  it('should reject duplicate email', async () => {
    // First registration
    await server.post('/api/v1/auth/register', {
      email: 'duplicate@example.com',
      password: 'SecurePass123!',
    });

    // Second registration with same email
    const response = await server.post('/api/v1/auth/register', {
      email: 'duplicate@example.com',
      password: 'SecurePass123!',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('should send verification email', async () => {
    const emailSpy = vi.spyOn(emailService, 'send');

    await server.post('/api/v1/auth/register', {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
    });

    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newuser@example.com',
        subject: expect.stringContaining('Verify'),
      })
    );
  });
});

describe('POST /api/v1/auth/login', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create test user
    testUser = await db.users.create({
      email: 'user@example.com',
      password_hash: await hashPassword('SecurePass123!'),
      email_verified: true,
    });
  });

  it('should login successfully with correct credentials', async () => {
    const response = await server.post('/api/v1/auth/login', {
      email: 'user@example.com',
      password: 'SecurePass123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const response = await server.post('/api/v1/auth/login', {
      email: 'user@example.com',
      password: 'WrongPassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should rate limit failed attempts', async () => {
    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await server.post('/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'WrongPassword',
      });
    }

    // 6th attempt should be rate limited
    const response = await server.post('/api/v1/auth/login', {
      email: 'user@example.com',
      password: 'SecurePass123!',
    });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
```

---

## 4. End-to-End Testing (Playwright)

### E2E Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete full registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3000/register');

    // Fill form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('text=Check your email to verify')).toBeVisible();

    // Check that verification email was sent (in test email service)
    const emails = await page.context().evaluate(() => {
      return (window as any).testEmailService.getEmails();
    });

    expect(emails).toContainEqual(
      expect.objectContaining({
        to: 'newuser@example.com',
        subject: expect.stringContaining('Verify'),
      })
    );
  });
});

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create test user in database
    await setupTestUser({
      email: 'user@example.com',
      password: 'SecurePass123!',
      email_verified: true,
    });
  });

  test('should login and access dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Fill login form
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');

    // Verify user content is visible
    await expect(page.locator('text=Welcome, John')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');

    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Verify still on login page
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
});

test.describe('Session Management', () => {
  test('should logout and clear session', async ({ page }) => {
    await loginTestUser(page, 'user@example.com', 'SecurePass123!');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Verify redirect to login
    await expect(page).toHaveURL('http://localhost:3000/login');

    // Verify can't access dashboard
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should refresh token on expiry', async ({ page }) => {
    await loginTestUser(page, 'user@example.com', 'SecurePass123!');

    // Wait for token to expire (mock time advancement)
    await page.evaluate(() => {
      (window as any).simulateTokenExpiry();
    });

    // Make request that should trigger refresh
    await page.goto('http://localhost:3000/dashboard');

    // Should still be on dashboard (token refreshed)
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
});
```

---

## 5. Security Testing

### OWASP Top 10 Tests
```typescript
describe('Security - OWASP Top 10', () => {
  describe('A01 Broken Access Control', () => {
    it('should not allow user to access other user profile', async () => {
      const user1Token = await loginUser('user1@example.com', 'Pass123!');
      const user2Id = 'different-user-id';

      const response = await api.get(`/api/v1/users/${user2Id}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(response.status).toBe(403);
    });

    it('should not allow regular user to access admin endpoints', async () => {
      const userToken = await loginUser('user@example.com', 'Pass123!');

      const response = await api.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('A02 Cryptographic Failures', () => {
    it('should encrypt sensitive data at rest', async () => {
      // Create user with phone number
      const user = await setupUser({
        email: 'test@example.com',
        phone_number: '+27111234567',
      });

      // Check database directly
      const dbUser = await db.query(
        'SELECT phone_number FROM users WHERE id = $1',
        [user.id]
      );

      // Should be encrypted (not plaintext)
      expect(dbUser[0].phone_number).not.toBe('+27111234567');
    });

    it('should transmit data over HTTPS only', async () => {
      const response = await http.get('http://localhost:3000/api/v1/auth/login');
      // In test, should redirect to HTTPS or refuse
      expect(response.status).toBe(403);
    });
  });

  describe('A03 Injection', () => {
    it('should prevent SQL injection', async () => {
      const response = await api.post('/api/v1/auth/login', {
        email: "admin'--",
        password: "' OR '1'='1",
      });

      expect(response.status).toBe(401); // Auth failed, not injection success
    });

    it('should prevent NoSQL injection', async () => {
      const response = await api.post('/api/v1/users/search', {
        name: { $ne: null },
      });

      expect(response.status).toBe(400); // Invalid input
    });
  });

  describe('A05 Broken Access Control / A07 XSS', () => {
    it('should escape user input in responses', async () => {
      const xssPayload = '<img src=x onerror="alert(1)">';

      await setupUser({
        first_name: xssPayload,
      });

      const response = await api.get('/api/v1/users/me');
      const html = response.body.data.user.first_name;

      // Should be escaped
      expect(html).not.toContain('onerror=');
      expect(html).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    });
  });

  describe('POPIA Compliance', () => {
    it('should log all data access', async () => {
      const user = await setupUser({ email: 'test@example.com' });

      // Access user data
      await api.get(`/api/v1/users/${user.id}`);

      // Check audit log
      const logs = await db.query(
        'SELECT * FROM audit_logs WHERE action = $1 AND user_id = $2',
        ['ACCESS', user.id]
      );

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should allow user data export', async () => {
      const token = await loginUser('user@example.com', 'Pass123!');

      const response = await api.post('/api/v1/users/export-data', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toContain('email');
      expect(response.body.data).toContain('profile');
    });

    it('should allow user account deletion', async () => {
      const user = await setupUser({ email: 'test@example.com' });
      const token = await loginUser('test@example.com', 'Pass123!');

      const response = await api.post('/api/v1/users/delete-account', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);

      // Verify soft delete
      const dbUser = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [user.id]
      );
      expect(dbUser[0].deleted_at).toBeDefined();
    });
  });
});
```

---

## 6. Test Configuration

### Vitest Config
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/types/**'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
```

### Playwright Config
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 7. Test Fixtures

### Database Fixtures
```typescript
// tests/fixtures/users.ts
export const createTestUser = async (db: any, overrides = {}) => {
  return await db.users.create({
    email: 'test@example.com',
    password_hash: 'hashed_password',
    role: 'user',
    email_verified: true,
    ...overrides,
  });
};

export const createAdminUser = async (db: any, overrides = {}) => {
  return await db.users.create({
    email: 'admin@example.com',
    password_hash: 'hashed_password',
    role: 'admin',
    email_verified: true,
    ...overrides,
  });
};

export const createMultipleUsers = async (db: any, count = 5) => {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      db.users.create({
        email: `user${i}@example.com`,
        password_hash: 'hashed_password',
        role: 'user',
      })
    )
  );
};
```

### API Request Fixtures
```typescript
// tests/fixtures/requests.ts
export const validRegistration = {
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  first_name: 'John',
  last_name: 'Doe',
};

export const invalidPasswords = [
  'short', // Too short
  'NoNumber!', // No number
  'nouppercase123!', // No uppercase
  'NOLOWERCASE123!', // No lowercase
  'NoSpecial123', // No special char
];

export const invalidEmails = [
  'notanemail',
  'missing@domain',
  '@nodomain.com',
  'spaces in@email.com',
];
```

---

## 8. Running Tests

### Commands
```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm run test -- src/auth.test.ts

# Run E2E tests
npm run test:e2e

# Run security tests
npm run test:security

# Run all tests with reporting
npm run test:ci
```

### GitHub Actions CI/CD
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Test Quality Checklist

- [ ] All user stories have acceptance tests
- [ ] > 80% code coverage (unit + integration)
- [ ] All API endpoints tested (happy path + errors)
- [ ] Authentication/authorization tested
- [ ] POPIA compliance tested
- [ ] Security tests for OWASP Top 10
- [ ] Database constraints tested
- [ ] Error messages don't leak information
- [ ] Rate limiting tested
- [ ] Soft deletes and auditing tested
- [ ] E2E tests cover critical workflows

