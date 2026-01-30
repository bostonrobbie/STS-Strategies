# TradingView Provisioning System Design

## Overview

This document describes the architecture and operation of the TradingView access provisioning system used to grant and revoke indicator/strategy access to subscribers.

---

## Architecture

### Service Boundary

All TradingView operations flow through a single service module:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TradingView Access Service                    │
│  apps/worker/src/services/tradingview-access/                   │
├─────────────────────────────────────────────────────────────────┤
│  Public Interface:                                               │
│  • validateUsername(username) → ValidationResult                │
│  • grantAccess(scriptId, username) → AccessResult               │
│  • revokeAccess(scriptId, username) → AccessResult              │
│  • healthCheck() → HealthCheckResult                            │
│  • getStatus() → ServiceStatus                                  │
│  • testCredentials(credentials) → boolean                       │
├─────────────────────────────────────────────────────────────────┤
│  Internal Components:                                            │
│  • credential-manager.ts - Encrypted credential storage         │
│  • types.ts - Type definitions                                  │
│  • index.ts - Public exports                                    │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Unofficial TradingView API                         │
│  (Session cookie authenticated REST calls)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Customer Purchase → Stripe Webhook → Provisioning Worker
                                           │
                                           ▼
                                    Service Mode Check
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
                  AUTO                  MANUAL                DISABLED
                    │                      │                      │
                    ▼                      ▼                      ▼
            TradingView API         Create Manual           Block + Alert
            Grant Access              Task for                  Admin
                    │                   Admin
                    ▼
              Update DB
            (status=GRANTED)
```

---

## Credential Management

### Storage

Credentials are stored encrypted in the database using AES-256-GCM:

```
TradingViewCredential
├── sessionIdEncrypted  (Bytes)  - Encrypted sessionid cookie
├── signatureEncrypted  (Bytes)  - Encrypted sessionid_sign cookie
├── iv                  (Bytes)  - Initialization vector
├── authTag             (Bytes)  - GCM authentication tag
├── apiUrl              (String) - API endpoint URL
├── isActive            (Boolean)
├── validatedAt         (DateTime)
├── lastUsedAt          (DateTime)
└── createdBy           (String) - Admin who saved credentials
```

### Encryption

- Algorithm: AES-256-GCM
- Key: 32-byte key from `CREDENTIAL_ENCRYPTION_KEY` environment variable
- Each credential set gets a unique IV
- Auth tag prevents tampering

### Credential Lifecycle

```
┌─────────────────┐
│   Admin logs    │
│   into TV bot   │
│    account      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Copy cookies   │
│  from DevTools  │
│  (sessionid +   │
│ sessionid_sign) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Admin > Creds   │────▶│    Validate     │──── Invalid ──▶ Show Error
│     Page        │     │  (API test)     │
└─────────────────┘     └────────┬────────┘
                                 │ Valid
                                 ▼
                        ┌─────────────────┐
                        │  Encrypt +      │
                        │  Store in DB    │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Switch mode    │
                        │   to AUTO       │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Audit log      │
                        │  created        │
                        └─────────────────┘
```

---

## Operating Modes

### AUTO Mode

- **Normal operation** - all provisioning automated
- TradingView API calls made automatically
- Health checks run every 15 minutes
- Switches to MANUAL if health check fails

### MANUAL Mode

- **Degraded operation** - API unavailable or credentials expired
- Manual tasks created for admin to process
- Admin receives alerts via email
- Requires admin to update credentials to restore AUTO mode
- **Does NOT auto-recover** - explicit admin action required

### DISABLED Mode

- **Emergency shutdown** - all provisioning stopped
- No tasks created, no API calls made
- Used during maintenance or critical issues
- Requires admin to explicitly re-enable

### Mode Transitions

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │   Health check fails                    │
                    │   (automatic)                           │
                    ▼                                         │
┌──────────┐     ┌──────────┐                           ┌──────────┐
│   AUTO   │────▶│  MANUAL  │──────────────────────────▶│ DISABLED │
└──────────┘     └──────────┘     Admin disables        └──────────┘
     ▲                │                                       │
     │                │                                       │
     │                │                                       │
     └────────────────┘                                       │
        Admin saves valid                                     │
        credentials                                           │
     ┌────────────────────────────────────────────────────────┘
     │ Admin re-enables with valid credentials
     ▼
```

**Important:** There is NO automatic transition from MANUAL → AUTO. This is intentional - when credentials fail, an admin must:

1. Obtain new session cookies from TradingView
2. Navigate to Admin > Credentials
3. Enter and validate new credentials
4. Click "Save & Activate"

---

## Health Monitoring

### Health Check Job

- **Schedule:** Every 15 minutes
- **Queue:** `health-check` (BullMQ)
- **Location:** `apps/worker/src/jobs/credential-health-check.ts`

### Checks Performed

1. **API Availability** - Can we reach the TradingView API?
2. **Credential Validity** - Do our credentials still work?
3. **Credential Age** - How old are the current credentials?

### Credential Age Thresholds

| Age | Action |
|-----|--------|
| < 7 days | Normal - no action |
| 7-13 days | WARNING email sent (daily) |
| ≥ 14 days | CRITICAL email sent (daily) |

### Alerting

Alerts sent to admin email addresses configured in `ADMIN_ALERT_EMAILS`:

```
Subject: TradingView Credentials Aging - Consider Refresh
Body: TradingView credentials are 8 days old. Consider refreshing...

Subject: URGENT: TradingView Credentials Need Refresh
Body: TradingView credentials are 15 days old and may expire soon...

Subject: URGENT: Provisioning Provider Failed - Manual Mode Active
Body: Primary provider failed health check. System in MANUAL mode...
```

---

## Constraints

### No Official TradingView API

TradingView does not provide an official API for managing indicator/strategy access. This system uses:

- Session cookie authentication (sessionid + sessionid_sign)
- Unofficial REST endpoints discovered through reverse engineering
- These endpoints may change without notice

### Two-Factor Authentication (2FA)

The TradingView bot account has 2FA enabled, which means:

- **No automated login** - credentials cannot be refreshed programmatically
- **Manual cookie extraction** - admin must log in and copy cookies from browser
- **Periodic manual refresh** - typically every 2-4 weeks

### No Browser Automation

**The Playwright provider is DISABLED.** Previous attempts at browser automation failed because:

- 2FA requires human interaction
- Bot detection can block automated browsers
- Session management is unreliable

The codebase retains the Playwright provider code but:
- `isConfigured()` always returns `false`
- Console warnings indicate deprecation
- `PROVISIONING_MODE=playwright` falls back to unofficial-api

---

## API Endpoints

### Admin Credential Management

```
GET  /api/admin/credentials/status
POST /api/admin/credentials/validate
POST /api/admin/credentials/update
```

All endpoints require admin authentication.

### Status Response

```json
{
  "hasCredentials": true,
  "isValid": true,
  "lastValidatedAt": "2024-01-15T10:30:00Z",
  "credentialAgeHours": 72,
  "apiUrl": "https://tv-api.example.com",
  "mode": "AUTO",
  "credentialHistory": [...]
}
```

### Validate Request/Response

```json
// Request
{
  "sessionId": "abc123...",
  "signature": "xyz789...",
  "apiUrl": "https://..." // optional
}

// Response
{
  "valid": true
}
```

### Update Request/Response

```json
// Request
{
  "sessionId": "abc123...",
  "signature": "xyz789...",
  "apiUrl": "https://..." // optional
}

// Response
{
  "success": true,
  "credentialId": "cred_abc123",
  "mode": "AUTO",
  "message": "Credentials saved and service mode set to AUTO"
}
```

---

## Environment Variables

### Required

```env
# Encryption key for credential storage (generate: openssl rand -base64 32)
CREDENTIAL_ENCRYPTION_KEY="your-32-byte-base64-key"

# TradingView API endpoint
TV_ACCESS_API_URL="https://your-tv-api.example.com"
```

### Optional (Legacy Support)

```env
# Direct credentials (deprecated - use admin UI instead)
TV_SESSION_ID="..."
TV_SIGNATURE="..."
```

### Other

```env
# Redis for job queues
REDIS_URL="redis://..."
UPSTASH_REDIS_REST_URL="..."

# Admin notification emails (comma-separated)
ADMIN_ALERT_EMAILS="admin@example.com,ops@example.com"
```

---

## Incident Runbooks

### Runbook: Credential Refresh

**When:** Credential age warnings received, or system switched to MANUAL mode

**Steps:**

1. Log into TradingView with the bot account
   - URL: https://www.tradingview.com/
   - Use the credentials stored in password manager

2. Complete 2FA verification

3. Open browser DevTools
   - Chrome: F12 or Right-click > Inspect
   - Firefox: F12 or Right-click > Inspect

4. Navigate to Application > Cookies > tradingview.com

5. Locate and copy these cookie values:
   - `sessionid` - the main session cookie
   - `sessionid_sign` - the signature cookie

6. Navigate to your admin panel: `/admin/credentials`

7. Paste the cookie values into the form

8. Click "Validate" to test the credentials

9. If valid, click "Save & Activate"

10. Verify system returns to AUTO mode

**Expected outcome:** Service mode shows AUTO, health check passes

---

### Runbook: Provider Health Check Failure

**When:** Alert received "Provisioning Provider Failed - Manual Mode Active"

**Steps:**

1. Check if TradingView is experiencing outages
   - Visit https://status.tradingview.com/
   - Check Twitter/X for TradingView reports

2. If TradingView is up, credentials likely expired:
   - Follow "Credential Refresh" runbook above

3. If TradingView is down:
   - System will remain in MANUAL mode
   - Monitor for service restoration
   - Once TradingView recovers, refresh credentials

4. Process any pending manual tasks:
   - Navigate to `/admin/provisioning`
   - Complete pending grant/revoke operations manually

**Expected outcome:** AUTO mode restored after credentials refreshed

---

### Runbook: Manual Task Processing

**When:** System in MANUAL mode and pending tasks exist

**Steps:**

1. Navigate to Admin > Provisioning

2. For each pending GRANT task:
   - Log into TradingView bot account
   - Navigate to the indicator/strategy page
   - Go to Access Management
   - Add the username with appropriate permissions
   - Mark task as complete in admin panel

3. For each pending REVOKE task:
   - Log into TradingView bot account
   - Navigate to the indicator/strategy page
   - Go to Access Management
   - Remove the username
   - Mark task as complete in admin panel

4. After processing all tasks, refresh credentials to restore AUTO mode

**Expected outcome:** All manual tasks completed, AUTO mode restored

---

## One-Time Setup Steps

### Initial Deployment

1. **Generate encryption key:**
   ```bash
   openssl rand -base64 32
   ```
   Add as `CREDENTIAL_ENCRYPTION_KEY` environment variable.

2. **Run database migration:**
   ```bash
   pnpm db:migrate
   ```

3. **Configure admin emails:**
   Set `ADMIN_ALERT_EMAILS` with comma-separated admin email addresses.

4. **Set TradingView API URL:**
   Set `TV_ACCESS_API_URL` to your TradingView API proxy endpoint.

5. **Initial credential setup:**
   - Log into TradingView bot account
   - Extract cookies as described in runbook
   - Navigate to `/admin/credentials`
   - Validate and save credentials

6. **Verify health check:**
   - Check worker logs for health check execution
   - Confirm no alerts sent
   - Verify mode is AUTO

### Bot Account Setup

1. Create dedicated TradingView account for bot operations
2. Enable 2FA for security
3. Store credentials in password manager
4. Grant necessary permissions for indicator management
5. Document account email and recovery options

---

## DEGRADED State & Zero-Downtime Recovery

This section explicitly documents the three critical operational requirements:

### 1. Credentials Stored Encrypted in Database (Not Env Vars)

**Answer: YES**

Credentials are stored encrypted at rest in the `TradingViewCredential` database table using AES-256-GCM encryption:

```
Database: TradingViewCredential table
├── sessionIdEncrypted  (Bytes)  - AES-256-GCM encrypted
├── signatureEncrypted  (Bytes)  - AES-256-GCM encrypted
├── iv                  (Bytes)  - Unique per-credential initialization vector
├── authTag             (Bytes)  - GCM authentication tag (tamper detection)
└── isActive            (Boolean) - Only one active at a time
```

**Key location:** `CREDENTIAL_ENCRYPTION_KEY` env var holds the 32-byte encryption key (base64-encoded).

**NOT stored in env vars:** The actual session cookies are never stored in environment variables. The legacy `TV_SESSION_ID` and `TV_SIGNATURE` env vars exist only for backwards compatibility during migration and are deprecated.

**Implementation:** `packages/database/src/encryption.ts` and `apps/worker/src/services/tradingview-access/credential-manager.ts`

---

### 2. Worker Reads Credentials Dynamically (Not Only at Startup)

**Answer: YES**

The worker reads credentials from the database **on every job execution**, not at startup:

```typescript
// apps/worker/src/services/tradingview-access/credential-manager.ts
export async function getActiveCredentials(): Promise<TradingViewCredentials | null> {
  // Queries database on EVERY call - no caching
  const dbCredential = await prisma.tradingViewCredential.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  // ... decrypt and return
}
```

**Call flow for each provisioning job:**
1. Job dequeued from BullMQ
2. `processProvisioningJob()` executes
3. `grantAccess()` or `revokeAccess()` called
4. Each call invokes `getActiveCredentials()` → fresh database query
5. Credentials decrypted in memory, used, then discarded

**No worker restart required:** When admin updates credentials via the UI, the next job automatically uses the new credentials.

---

### 3. DEGRADED Recovery Without Redeployment

**Answer: YES**

The system supports full incident recovery without redeploying any service:

#### DEGRADED State Storage

State stored in `SystemConfig` table with key `provisioning_state`:

```typescript
// apps/worker/src/services/provisioning-state.ts
interface ProvisioningState {
  state: "HEALTHY" | "DEGRADED";
  reason?: string;
  degradedAt?: string;      // ISO timestamp
  incidentId?: string;      // Tracking ID like "INC-M5K2J-A8B3C"
}
```

#### Automatic DEGRADED Transition

When a provisioning job encounters auth errors (401/403), the system automatically:

1. Detects auth error via `isAuthErrorResult()`
2. Calls `transitionToDegraded(reason)`
3. Updates `SystemConfig` with DEGRADED state
4. Sends admin alert email with incident ID
5. Job stays as PENDING (not FAILED) for automatic retry

```typescript
// apps/worker/src/processors/provisioning.processor.ts
if (isAuthErrorResult(result)) {
  await transitionToDegraded(`Auth error: ${result.message}`);
  // Job kept PENDING, will retry after recovery
}
```

#### Recovery Flow (No Redeployment)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INCIDENT RECOVERY FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. DEGRADED Detected                                               │
│     └─▶ Auth error on job → transitionToDegraded()                  │
│     └─▶ Admin alert email sent                                      │
│     └─▶ Jobs stay PENDING (not FAILED)                              │
│                                                                     │
│  2. Admin Updates Credentials (via /admin/credentials)              │
│     └─▶ New cookies entered in UI                                   │
│     └─▶ Validation API tests against TradingView                    │
│     └─▶ If valid: encrypt & store in database                       │
│                                                                     │
│  3. Automatic Recovery Triggered                                    │
│     └─▶ transitionToHealthy() updates SystemConfig                  │
│     └─▶ resumePendingJobs() re-queues all PENDING jobs              │
│     └─▶ Jobs use new credentials (dynamic read)                     │
│                                                                     │
│  4. System Returns to HEALTHY                                       │
│     └─▶ No restart needed                                           │
│     └─▶ No redeployment needed                                      │
│     └─▶ Audit log records incident duration                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Job Resume Implementation

When credentials are updated, pending jobs are automatically resumed:

```typescript
// apps/web/src/lib/job-resume.ts
export async function resumePendingJobs(adminId?: string): Promise<ResumeResult> {
  // Find all PENDING StrategyAccess records
  const pendingAccess = await db.strategyAccess.findMany({
    where: { status: "PENDING" },
  });

  // Re-queue each with fresh job ID
  for (const access of pendingAccess) {
    await provisioningQueue.add("provision-access", {
      strategyAccessId: access.id,
      isResume: true,  // Flag for resumed jobs
    }, {
      jobId: `resume-${access.id}-${Date.now()}`,
      backoff: { type: "exponential", delay: 5000 }, // 5s for resumed
    });
  }
}
```

#### Why No Redeployment Needed

| Component | Storage | Update Mechanism |
|-----------|---------|------------------|
| Credentials | Database (encrypted) | Admin UI → database write |
| Provisioning State | Database (`SystemConfig`) | State manager → database write |
| Pending Jobs | Database (`StrategyAccess`) | Status field, re-queued to BullMQ |
| Worker Config | Database query per-job | No caching, fresh reads |

**All state is in the database.** Workers are stateless and query the database on every operation.

---

### Operational Summary

| Question | Answer | Evidence |
|----------|--------|----------|
| Encrypted in DB? | ✅ YES | AES-256-GCM in `TradingViewCredential` table |
| Dynamic credential reads? | ✅ YES | Database queried per-job, never cached |
| Recovery without redeployment? | ✅ YES | Database state transition + job resume |

---

## Testing

### Integration Tests

```bash
# Run all integration tests
pnpm test tests/integration/

# Specific test files
pnpm test tests/integration/credential-update.test.ts
pnpm test tests/integration/degraded-provisioning.test.ts
```

### Test Coverage

- Credential validation before storage
- Encryption at rest verification
- Mode switching (AUTO ↔ MANUAL)
- Health check failure handling
- Manual task creation
- Admin alert sending
- No auto-recovery verification

---

## File Reference

| File | Purpose |
|------|---------|
| `apps/worker/src/services/tradingview-access/` | Main service module |
| `apps/worker/src/jobs/credential-health-check.ts` | Health monitoring |
| `apps/web/src/app/(admin)/admin/credentials/page.tsx` | Admin UI |
| `apps/web/src/app/api/admin/credentials/` | API endpoints |
| `packages/database/src/encryption.ts` | Encryption utilities |
| `packages/database/prisma/schema.prisma` | Database schema |
| `tests/integration/credential-update.test.ts` | Credential tests |
| `tests/integration/degraded-provisioning.test.ts` | Fallback tests |
