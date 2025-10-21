# YL Portal - Bug Report & Security Analysis
> **Generated:** 2025-10-17
> **Analysis Scope:** Authentication system, API security, database schema, frontend components

---

## 🚨 CRITICAL ISSUES - FIX IMMEDIATELY

### 1. Session ID Type Mismatch **[BLOCKS ALL AUTH]**
**Status:** 🔴 Critical - Authentication completely broken
**Files:**
- `apps/backend/prisma/schema.prisma:44`
- `apps/backend/src/services/authService.ts:44`

**Problem:**
```prisma
// schema.prisma defines:
id String @id @db.Uuid

// But authService.ts generates:
const sessionId = generateIdFromEntropySize(25); // Returns 40-char string
```

This causes database insertion to fail when users try to log in or register.

**Fix:**
```prisma
# Option 1: Change schema to accept strings
model Session {
  id        String   @id  // Remove @db.Uuid
  userId    String   @db.Uuid
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@index([userId])
}
```

OR

```typescript
// Option 2: Change authService to use UUIDs
const sessionId = crypto.randomUUID(); // Native Node.js UUID
```

**Testing:** After fix, test registration and login flows.

---

### 2. Missing CSRF Protection
**Status:** 🔴 Critical - Security vulnerability
**Files:** All POST endpoints in `apps/backend/src/routes/auth.ts`

**Problem:**
State-changing operations (registration, login, logout) lack CSRF protection. While SameSite=Lax cookies provide some protection, it's insufficient for POST requests.

**Impact:** Attackers can forge requests to register accounts, force logins, or log users out.

**Fix:**
```bash
# Install CSRF middleware
cd apps/backend
pnpm add hono-csrf
```

```typescript
// apps/backend/src/index.ts
import { csrf } from 'hono/csrf';

// Add after CORS middleware
app.use('*', csrf({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
```

Frontend (auto-handled by fetch with credentials):
```typescript
// No changes needed - Hono CSRF works with fetch credentials
```

---

### 3. Redis Connection Not Gracefully Handled
**Status:** 🔴 Critical - App crashes if Redis unavailable
**File:** `apps/backend/src/middleware/rateLimit.ts:4`

**Problem:**
Redis client instantiated without error handling. If Redis is down during startup, app crashes on first rate-limit check despite "fail open" logic.

**Fix:**
```typescript
// apps/backend/src/middleware/rateLimit.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
  reconnectOnError(err) {
    console.error('Redis reconnection error:', err);
    return true; // Retry connection
  },
});

// Error handling
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

// Connect with error handling
redis.connect().catch((err) => {
  console.warn('⚠️  Redis unavailable, rate limiting will be disabled:', err.message);
});

export { redis };
```

---

### 4. Weak SESSION_SECRET
**Status:** 🔴 Critical - Security vulnerability
**File:** `.env:22`

**Problem:**
```env
SESSION_SECRET="change_me_in_production_generate_random_secret"
```
This placeholder value compromises session security.

**Fix:**
```bash
# Generate strong secret
openssl rand -base64 32

# Update .env (example output)
SESSION_SECRET="a8f5f167f44f4964e6c998dee827110c"
```

**Important:**
- Never commit secrets to version control
- Use different secrets for dev/staging/production
- Rotate secrets periodically (every 90 days)

---

### 5. Dependencies Not Installed
**Status:** 🔴 Critical - App won't run

**Problem:** `@node-rs/argon2` not installed, app will crash on password hashing.

**Fix:**
```bash
# From project root
pnpm install
```

---

## ⚠️ HIGH PRIORITY ISSUES

### 6. No Email Verification Flow
**Status:** ⚠️ High - Security risk
**Files:** Backend has `emailVerified` field but no implementation

**Problem:**
Anyone can register with any email address. Account takeover possible if someone registers with another person's email.

**Impact:**
- No verification of legitimate users
- Spam account creation
- Potential for phishing using registered accounts

**Recommended Implementation:**
1. Generate verification token on registration
2. Send email with verification link
3. Create `/api/auth/verify-email` endpoint
4. Require verification before accessing sensitive features

**Estimated Effort:** 4-6 hours

---

### 7. Missing Password Reset Functionality
**Status:** ⚠️ High - Major UX issue
**File:** `apps/frontend/src/routes/login/+page.svelte:107` (link exists, route doesn't)

**Problem:**
"Forgot password?" link leads nowhere. Users locked out permanently if they forget passwords.

**Recommended Implementation:**
1. Create `/forgot-password` route
2. Generate password reset token (expires in 1 hour)
3. Send reset email
4. Create `/reset-password/[token]` route
5. Add backend `/api/auth/reset-password` endpoint

**Estimated Effort:** 3-4 hours

---

### 8. Rate Limiter Uses Wrong IP Identification
**Status:** ⚠️ High - Security vulnerability
**File:** `apps/backend/src/middleware/rateLimit.ts:18`

**Problem:**
```typescript
const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
```
Attackers can spoof these headers to bypass rate limiting.

**Fix:**
```typescript
const getClientIP = (c: Context): string => {
  // Only trust forwarded headers in production with known proxy
  if (process.env.NODE_ENV === 'production' && process.env.TRUSTED_PROXY === 'true') {
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
      // Take first IP from comma-separated list
      return forwarded.split(',')[0].trim();
    }
  }

  // Development: use real IP or fallback
  return c.req.header('x-real-ip') || 'unknown';
};

const identifier = getClientIP(c);
```

Add to `.env`:
```env
TRUSTED_PROXY=false  # Set to true in production behind load balancer
```

---

### 9. No Request Timeout
**Status:** ⚠️ High - DoS vulnerability
**File:** `apps/backend/src/index.ts`

**Problem:**
Long-running requests can exhaust server resources. Vulnerable to slowloris attacks.

**Fix:**
```typescript
import { timeout } from 'hono/timeout';

// Add after logger middleware
app.use('*', timeout(30000)); // 30 second timeout
```

---

### 10. Password Complexity Not Enforced on Backend
**Status:** ⚠️ High - Weak security
**File:** `apps/backend/src/routes/auth.ts:21`

**Problem:**
Backend only validates length (8+ chars). Users can register with "12345678".

**Fix:**
```typescript
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain special character'),
});
```

---

### 11. Monorepo Packages Referenced But Don't Exist
**Status:** ⚠️ High - Build failures
**Files:**
- `apps/backend/tsconfig.json:39-41`
- `apps/frontend/vite.config.ts:16`

**Problem:**
TypeScript and Vite configs reference `@yl-portal/types`, `@yl-portal/validation`, `@yl-portal/config` packages that don't exist.

**Options:**

**Option A - Remove references (Quick fix):**
```typescript
// Remove from both tsconfig.json and vite.config.ts
// paths: {
//   "@yl-portal/types": ["../../packages/types/src"],
//   "@yl-portal/validation": ["../../packages/validation/src"],
//   "@yl-portal/config": ["../../packages/config/src"]
// }
```

**Option B - Create packages (Better long-term):**
```bash
mkdir -p packages/types/src
mkdir -p packages/validation/src
mkdir -p packages/config/src

# Create package.json for each
```

---

## 📋 MEDIUM PRIORITY ISSUES

### 12. Session Extension Doesn't Preserve "Remember Me"
**File:** `apps/backend/src/services/authService.ts:103-117`

**Problem:**
Auto-extension always uses 7 days, ignoring original "remember me" preference. Users who checked "remember me" get logged out sooner than expected.

**Fix:**
```typescript
// Add rememberMe field to Session model
model Session {
  id         String   @id
  userId     String   @db.Uuid
  expiresAt  DateTime
  rememberMe Boolean  @default(false) // Add this
  createdAt  DateTime @default(now())
  // ...
}

// Update extension logic
if (session.expiresAt < oneDayFromNow) {
  const sessionDuration = session.rememberMe ? 30 : 7;
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + sessionDuration);

  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: newExpiresAt },
  });
}
```

---

### 13. CORS Allows No-Origin Requests
**File:** `apps/backend/src/middleware/cors.ts:12`

**Problem:**
CORS middleware allows requests with no origin. While intended for mobile apps, this can be exploited.

**Fix:**
```typescript
origin: (origin) => {
  if (!origin) {
    // Only allow no-origin in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    // In production, check for mobile app header
    const isMobileApp = req.header('X-Mobile-App') === 'true';
    return isMobileApp ? null : 'reject';
  }
  // ... rest of logic
}
```

---

### 14. Missing Database Indexes
**File:** `apps/backend/prisma/schema.prisma`

**Problem:**
Composite index on `[areaId, transactionDate]` exists, but date-range queries without area filtering will be slow.

**Fix:**
```prisma
model Movement {
  // ... existing fields

  @@index([transactionDate])  // Add standalone index
  @@index([areaId, transactionDate])  // Keep existing composite
  @@index([status])  // Also useful for filtering
}
```

---

### 15. No Connection Pool Configuration
**File:** `apps/backend/src/db/prisma.ts`

**Problem:**
Prisma client created without connection pool limits. Could exhaust database connections under load.

**Fix:**
```env
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://ylportal:ylportal_dev_password@localhost:5432/ylportal?schema=public&connection_limit=10&pool_timeout=10"
```

---

### 16. Frontend Auth Store - Concurrent Requests
**File:** `apps/frontend/src/lib/stores/authStore.ts:34-66`

**Problem:**
Multiple components calling `checkAuth()` creates race conditions and duplicate API calls.

**Fix:**
```typescript
let checkAuthPromise: Promise<void> | null = null;

async checkAuth() {
  // Return existing promise if already checking
  if (checkAuthPromise) return checkAuthPromise;

  update((state) => ({ ...state, isLoading: true }));

  checkAuthPromise = (async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  })();

  try {
    await checkAuthPromise;
  } finally {
    checkAuthPromise = null;
  }
}
```

---

### 17. Movement Distribution Doesn't Verify Target Area Access
**File:** `apps/backend/src/services/movementService.ts:91-167`

**Problem:**
`distributeExpense()` doesn't verify user has access to target areas before distribution.

**Fix:**
```typescript
// Inside distributeExpense transaction, before creating movements:
for (const targetAreaId of targetAreaIds) {
  const hasAccess = await tx.userArea.findFirst({
    where: {
      userId: data.userId,
      areaId: targetAreaId
    }
  });

  if (!hasAccess) {
    throw new Error(`Access denied to area: ${targetAreaId}`);
  }
}
```

---

### 18. No Session Expiry Info in API Response
**File:** `apps/backend/src/routes/auth.ts:97, 185`

**Problem:**
Login/register responses don't include session expiry. Frontend can't display "Session expires in X" or warn users.

**Fix:**
```typescript
return c.json({
  success: true,
  message: 'Login successful',
  user: { /* ... */ },
  session: {
    expiresAt: expiresAt.toISOString(),
    rememberMe: rememberMe,
  }
}, 200);
```

---

## 🔧 LOW PRIORITY (Future Enhancements)

### 19. API Versioning Inconsistency
- `/api/v1/hello` uses versioning but `/api/auth` doesn't
- **Fix:** Change to `/api/v1/auth` for consistency

### 20. No Request ID Tracking
- No request ID middleware for log tracing
- **Fix:** Add `import { requestId } from 'hono/request-id'`

### 21. Health Check Doesn't Check Dependencies
- `/health` returns OK even if database/Redis are down
- **Fix:** Add DB and Redis ping checks

### 22. No Response Compression
- Large JSON responses consume bandwidth
- **Fix:** `import { compress } from 'hono/compress'`

### 23. Missing Audit Log for Logout
- Can't track when users logged out
- **Fix:** Add audit log entry in logout endpoint

### 24. Environment Variables Not Validated on Startup
- App could run with missing config
- **Fix:** Validate required env vars in index.ts

---

## 📊 SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | **FIX BEFORE PRODUCTION** |
| ⚠️ High | 6 | Fix in next sprint |
| 📋 Medium | 9 | Fix before Phase 2 |
| 🔧 Low | 6 | Future enhancements |
| **Total** | **26** | |

---

## 🎯 RECOMMENDED FIX ORDER

### Sprint 1 (This Week)
1. ✅ Fix Session ID type mismatch (30 min)
2. ✅ Run `pnpm install` (5 min)
3. ✅ Add CSRF protection (1 hour)
4. ✅ Fix Redis connection handling (1 hour)
5. ✅ Strengthen SESSION_SECRET (5 min)
6. ✅ Test authentication flow end-to-end (30 min)

**Total: ~3.5 hours**

### Sprint 2 (Next Week)
1. Email verification system (4-6 hours)
2. Password reset flow (3-4 hours)
3. Fix rate limiter IP identification (1 hour)
4. Add request timeout (30 min)
5. Enforce password complexity (30 min)
6. Add session expiry to responses (1 hour)

**Total: ~11 hours**

### Sprint 3 (Following Week)
1. Fix session extension logic (2 hours)
2. Add database indexes (1 hour)
3. Configure connection pooling (30 min)
4. Fix concurrent auth check calls (1 hour)
5. Add area access verification (1 hour)
6. Improve CORS security (1 hour)

**Total: ~6.5 hours**

---

## ✅ POSITIVE OBSERVATIONS

The codebase demonstrates several excellent practices:

- **Strong Security Foundations**
  - Argon2 password hashing with proper parameters
  - Proper use of Prisma transactions
  - Comprehensive audit logging infrastructure
  - Soft delete implementation

- **Good Architecture**
  - Clean separation of concerns (routes, services, middleware)
  - Multi-tenant architecture with RBAC
  - Well-structured database schema
  - Type-safe development with TypeScript

- **Performance Considerations**
  - Database indexes on key relationships
  - Session auto-extension for better UX
  - Efficient movement distribution algorithm

---

## 📝 NOTES

- The authentication system is well-architected but needs security hardening
- Most issues are edge cases and completeness, not fundamental design flaws
- Priority should be: Security > UX > Performance > Features
- All critical issues can be fixed in ~4 hours of focused work

**Next Review:** After Sprint 1 fixes are complete
