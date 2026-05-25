# Project Structure Template

**Standard file organization for Antigravity 2 projects**

---

## Directory Structure

```
project-name/
├─ .github/
│  └─ workflows/
│     ├─ test.yml (CI/CD for tests)
│     ├─ security.yml (Security scanning)
│     └─ deploy.yml (Deployment pipeline)
│
├─ config/
│  ├─ database.ts (Database configuration)
│  ├─ env.ts (Environment validation)
│  ├─ constants.ts (Application constants)
│  └─ index.ts (Export all config)
│
├─ src/
│  ├─ types/
│  │  ├─ index.ts (Aggregate exports)
│  │  ├─ user.types.ts
│  │  ├─ auth.types.ts
│  │  ├─ api.types.ts
│  │  └─ errors.types.ts
│  │
│  ├─ utils/
│  │  ├─ crypto.ts (Password hashing, token generation)
│  │  ├─ validation.ts (Zod schemas)
│  │  ├─ logger.ts (Structured logging)
│  │  ├─ errors.ts (Error classes and handling)
│  │  └─ index.ts (Export all utils)
│  │
│  ├─ middleware/
│  │  ├─ auth.ts (JWT verification)
│  │  ├─ authorization.ts (Role checking)
│  │  ├─ validation.ts (Request validation)
│  │  ├─ errorHandler.ts (Centralized error handling)
│  │  ├─ requestLogger.ts (Log all requests)
│  │  ├─ rateLimiter.ts (Rate limiting)
│  │  └─ index.ts (Middleware chain)
│  │
│  ├─ repositories/
│  │  ├─ user.repository.ts (User data access)
│  │  ├─ session.repository.ts (Session data access)
│  │  ├─ auditLog.repository.ts (Audit logging)
│  │  ├─ base.repository.ts (Base class with common methods)
│  │  └─ index.ts (Export all repositories)
│  │
│  ├─ services/
│  │  ├─ auth.service.ts (Authentication logic)
│  │  ├─ user.service.ts (User management)
│  │  ├─ email.service.ts (Email sending)
│  │  ├─ cache.service.ts (Caching)
│  │  ├─ audit.service.ts (Audit logging)
│  │  └─ index.ts (Export all services)
│  │
│  ├─ controllers/
│  │  ├─ auth.controller.ts (Auth endpoints)
│  │  ├─ user.controller.ts (User endpoints)
│  │  └─ index.ts (Export all controllers)
│  │
│  ├─ routes/
│  │  ├─ api/
│  │  │  ├─ v1/
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ register.ts (POST /register)
│  │  │  │  │  ├─ login.ts (POST /login)
│  │  │  │  │  ├─ logout.ts (POST /logout)
│  │  │  │  │  ├─ refresh.ts (POST /refresh)
│  │  │  │  │  ├─ verify-email.ts (POST /verify-email)
│  │  │  │  │  └─ reset-password.ts (POST /reset-password)
│  │  │  │  │
│  │  │  │  ├─ users/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  ├─ index.ts (GET, PUT, DELETE user)
│  │  │  │  │  │  └─ profile.ts (GET user profile)
│  │  │  │  │  └─ me.ts (GET current user)
│  │  │  │  │
│  │  │  │  ├─ admin/
│  │  │  │  │  ├─ users.ts (Admin user management)
│  │  │  │  │  └─ audit-logs.ts (View audit logs)
│  │  │  │  │
│  │  │  │  └─ health.ts (GET /health - readiness check)
│  │  │  │
│  │  │  └─ index.ts (Router configuration)
│  │  │
│  │  └─ index.ts (Main router)
│  │
│  ├─ db/
│  │  ├─ migrations/
│  │  │  ├─ 001_create_users_table.sql
│  │  │  ├─ 002_create_sessions_table.sql
│  │  │  └─ 003_create_audit_logs_table.sql
│  │  │
│  │  └─ schema.ts (TypeORM or Prisma schema)
│  │
│  └─ index.ts (Application entry point)
│
├─ tests/
│  ├─ unit/
│  │  ├─ utils/
│  │  │  ├─ crypto.test.ts
│  │  │  └─ validation.test.ts
│  │  │
│  │  ├─ services/
│  │  │  ├─ auth.service.test.ts
│  │  │  └─ user.service.test.ts
│  │  │
│  │  └─ repositories/
│  │     └─ user.repository.test.ts
│  │
│  ├─ integration/
│  │  ├─ auth.integration.test.ts
│  │  └─ user.integration.test.ts
│  │
│  ├─ e2e/
│  │  ├─ registration.e2e.test.ts
│  │  ├─ login.e2e.test.ts
│  │  └─ session.e2e.test.ts
│  │
│  ├─ security/
│  │  ├─ owasp.test.ts
│  │  ├─ popia.test.ts
│  │  └─ injection.test.ts
│  │
│  ├─ fixtures/
│  │  ├─ users.ts
│  │  ├─ requests.ts
│  │  └─ database.ts
│  │
│  └─ setup.ts (Test environment setup)
│
├─ docs/
│  ├─ API.md (API documentation)
│  ├─ ARCHITECTURE.md (Architecture guide)
│  ├─ CONTRIBUTING.md (Contribution guidelines)
│  ├─ DEPLOYMENT.md (Deployment procedures)
│  └─ SECURITY.md (Security guidelines)
│
├─ .env.example (Example environment variables)
├─ .env.test (Test environment variables)
├─ .eslintrc.json (ESLint configuration)
├─ .prettierrc.json (Prettier configuration)
├─ tsconfig.json (TypeScript configuration)
├─ package.json (Dependencies and scripts)
├─ vitest.config.ts (Vitest configuration)
├─ playwright.config.ts (Playwright configuration)
├─ docker-compose.yml (Docker services for development)
├─ Dockerfile (Production Docker image)
├─ .gitignore (Git ignore rules)
├─ README.md (Project overview)
└─ LICENSE (Project license)
```

---

## File Organization Principles

### 1. By Feature (Horizontal)
```
src/
├─ auth/
│  ├─ auth.service.ts
│  ├─ auth.controller.ts
│  ├─ auth.types.ts
│  └─ auth.test.ts
│
└─ users/
   ├─ user.service.ts
   ├─ user.controller.ts
   ├─ user.types.ts
   └─ user.test.ts
```

### 2. By Layer (Vertical)
```
src/
├─ services/
│  ├─ auth.service.ts
│  └─ user.service.ts
│
├─ controllers/
│  ├─ auth.controller.ts
│  └─ user.controller.ts
│
└─ types/
   ├─ user.types.ts
   └─ auth.types.ts
```

**Recommendation**: Start with vertical (by layer) for clarity, transition to horizontal (by feature) as project grows.

---

## Configuration Files

### package.json
```json
{
  "name": "project-name",
  "version": "1.0.0",
  "description": "Project description",
  "main": "dist/index.js",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:unit": "vitest run --include '**/*.test.ts'",
    "test:integration": "vitest run --include '**/*.integration.test.ts'",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:security": "vitest run --include '**/*security*.test.ts'",
    "test:ci": "npm run test:coverage && npm run test:e2e && npm run test:security",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src",
    "migrate": "node scripts/migrate.js",
    "migrate:test": "NODE_ENV=test node scripts/migrate.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "zod": "^3.22.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.10.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "vitest": "^0.34.0",
    "playwright": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "eslint": "^8.50.0",
    "prettier": "^3.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["config/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@middleware/*": ["src/middleware/*"],
      "@repositories/*": ["src/repositories/*"],
      "@services/*": ["src/services/*"],
      "@controllers/*": ["src/controllers/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### .env.example
```
# Application
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/app_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=86400
REFRESH_TOKEN_SECRET=your-refresh-secret-key
REFRESH_TOKEN_EXPIRES_IN=2592000

# Email
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
EMAIL_FROM=noreply@example.com

# Security
BCRYPT_COST=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# External Services
[Any third-party API keys]

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=http://localhost:3000,https://example.com
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/utils/logger.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './config'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@repositories': path.resolve(__dirname, './src/repositories'),
      '@services': path.resolve(__dirname, './src/services'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
    },
  },
});
```

---

## Import Path Examples

### Absolute Imports (Using Path Aliases)
```typescript
// Good ✅
import { User } from '@types/user.types';
import { UserService } from '@services/user.service';
import { validateEmail } from '@utils/validation';
import { authenticate } from '@middleware/auth';
import { UserRepository } from '@repositories/user.repository';

// Avoid ❌
import { User } from '../../../types/user.types';
import { UserService } from '../../../services/user.service';
```

### Relative Imports (Within Same Directory)
```typescript
// Fine for same directory
import { validateEmail } from './validation';
import { AppError } from './errors';
```

---

## Naming Conventions

### Files
- **Service files**: `*.service.ts` (e.g., `user.service.ts`)
- **Controller files**: `*.controller.ts` (e.g., `auth.controller.ts`)
- **Repository files**: `*.repository.ts` (e.g., `user.repository.ts`)
- **Type files**: `*.types.ts` (e.g., `user.types.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts` (e.g., `auth.service.test.ts`)
- **Middleware files**: `*.middleware.ts` (e.g., `auth.middleware.ts`)
- **Utility files**: `*.ts` (e.g., `logger.ts`, `validation.ts`)
- **Route files**: `index.ts` (e.g., `src/routes/api/v1/auth/login.ts`)

### Classes and Interfaces
```typescript
// Classes - PascalCase
class UserService { }
class AuthMiddleware { }
class ValidationError { }

// Interfaces - PascalCase with I prefix (optional)
interface User { }
interface IUserRepository { }

// Types - PascalCase
type UserRole = 'admin' | 'user';
type AuthToken = { token: string; expiresIn: number };

// Functions - camelCase
function validateEmail(email: string): boolean { }
const hashPassword = async (password: string): Promise<string> => { };

// Constants - UPPER_SNAKE_CASE
const JWT_SECRET = process.env.JWT_SECRET;
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRY_SECONDS = 86400;
```

---

## Module Export/Import Patterns

### Service Exports
```typescript
// src/services/index.ts
export { UserService } from './user.service';
export { AuthService } from './auth.service';
export { EmailService } from './email.service';

// Usage
import { UserService, AuthService } from '@services';
```

### Type Exports
```typescript
// src/types/index.ts
export * from './user.types';
export * from './auth.types';
export * from './api.types';
export * from './errors.types';

// Usage
import { User, UserDTO, AuthTokens } from '@types';
```

### Utility Exports
```typescript
// src/utils/index.ts
export { hashPassword, comparePassword } from './crypto';
export { validateEmail, validatePassword } from './validation';
export { logger } from './logger';
export { AppError, handleError } from './errors';

// Usage
import { hashPassword, logger, AppError } from '@utils';
```

---

## Dependency Injection Pattern

```typescript
// services/user.service.ts
import { UserRepository } from '@repositories/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUserById(id: string) {
    return this.userRepository.findById(id);
  }
}

// controllers/user.controller.ts
import { UserService } from '@services/user.service';
import { UserRepository } from '@repositories/user.repository';

export class UserController {
  private userService: UserService;

  constructor() {
    const userRepository = new UserRepository();
    this.userService = new UserService(userRepository);
  }

  async getUser(req, res) {
    const user = await this.userService.getUserById(req.params.id);
    res.json(user);
  }
}
```

---

## Version Control Structure

### .gitignore
```
# Dependencies
node_modules/
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Temporary files
.tmp/
temp/
```

### GitHub Branch Strategy
```
main (production)
  ↑ (merge with PR, requires tests pass)
develop (staging)
  ↑ (merge with PR)
feature/* (new features)
bugfix/* (bug fixes)
hotfix/* (production hotfixes)
```

---

## Generated vs. Source Files

### Keep in Version Control
- ✅ Source code (src/*)
- ✅ Configuration files (tsconfig.json, package.json, etc.)
- ✅ Tests (tests/*)
- ✅ Documentation (docs/*)
- ✅ Environment example (.env.example)
- ✅ GitHub workflows (.github/*)

### Don't Keep in Version Control
- ❌ node_modules/
- ❌ dist/ (built output)
- ❌ coverage/ (test coverage)
- ❌ .env (actual secrets)
- ❌ .DS_Store (OS files)
- ❌ *.log (log files)

