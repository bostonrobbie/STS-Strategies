# STS Strategies - Ship v1 Checklist

## Summary

This checklist prioritizes tasks for shipping v1. Tasks are grouped by priority.

**FOUNDER CONSTRAINTS (Non-Negotiable):**
1. Zero manual intervention in happy path
2. No graceful degradation - block checkout if validation/provisioning uncertain
3. No recurring manual operations - cookie rotation is NOT acceptable

---

## Priority 1: Critical Blockers (Must have for launch)

### P1.1 - Strict Username Validation (Blocks Checkout)
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - Users cannot pay with invalid TradingView usernames

**Implementation:**
- `apps/web/src/lib/tradingview-validator.ts` - Strict validation with caching
- `apps/web/src/app/api/user/validate-username/route.ts` - Real-time validation API
- `apps/web/src/app/api/user/onboarding/route.ts` - Validates BEFORE storing username
- `apps/web/src/app/api/checkout/route.ts` - Defense-in-depth re-validation
- `apps/web/src/app/(auth)/onboarding/page.tsx` - Real-time UI validation with debounce

**Behavior:**
- Returns 503 if TradingView validation service unavailable - BLOCKS CHECKOUT
- Returns 400 if username invalid - BLOCKS CHECKOUT
- Returns 429 if rate limited - User must wait
- Caches valid usernames for 24h, invalid for 1h

---

### P1.2 - Playwright Provisioning Provider (No Cookie Rotation)
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - No manual cookie rotation needed

**Implementation:**
- `apps/worker/src/providers/playwright.provider.ts` - Headless browser automation
- `apps/worker/src/providers/index.ts` - Auto-detects and prefers Playwright

**Behavior:**
- Logs into TradingView programmatically with email/password
- Supports TOTP 2FA
- Fresh login each time - no session expiration issues
- Falls back to unofficial-api → manual if not configured

**Required Environment Variables:**
```env
TV_BOT_EMAIL="bot@yourcompany.com"
TV_BOT_PASSWORD="secure-password"
TV_BOT_TOTP_SECRET="base32-totp-secret"  # If 2FA enabled
```

---

### P1.3 - Health Checks + Auto-Recovery
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - Auto-fallback and recovery

**Implementation:**
- `apps/worker/src/jobs/credential-health-check.ts` - Health monitoring job

**Behavior:**
- Health check every 15 minutes
- Recovery check every 5 minutes when in fallback mode
- Auto-switches to fallback on failure
- Auto-recovers when primary becomes healthy
- Sends admin email alerts on status changes

---

### P1.4 - New Strategy Auto-Grant
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - Lifetime purchasers auto-get new strategies

**Implementation:**
- `apps/worker/src/processors/new-strategy-grant.processor.ts` - Batch processor
- `apps/web/src/app/api/admin/strategies/route.ts` - Triggers on strategy creation
- `apps/web/src/app/api/admin/strategies/[id]/route.ts` - Triggers on activation

**Behavior:**
- When strategy activated, auto-grants to all users with completed purchases
- Idempotent via unique constraint + job ID pattern
- Rate limited: 1 second delay between operations
- Creates audit log entries

---

### P1.5 - Test Suite (Blocks Deployment)
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - No deployment without passing tests

**Implementation:**
- `vitest.config.ts` - Unit/integration test configuration
- `playwright.config.ts` - E2E test configuration
- `tests/setup.ts` - Test environment setup
- `tests/integration/checkout-validation.test.ts` - Checkout blocking tests
- `tests/integration/webhook-idempotency.test.ts` - Idempotency tests
- `tests/integration/new-strategy-grant.test.ts` - Auto-grant tests
- `tests/e2e/full-purchase.spec.ts` - Full flow E2E tests

---

### P1.6 - CI/CD Pipeline (Tests Block Deploy)
**Status:** ✅ IMPLEMENTED
**Risk:** MITIGATED - Deploy only runs after ALL tests pass

**Implementation:**
- `.github/workflows/ci.yml` - GitHub Actions workflow

**Behavior:**
- Runs lint, type-check, unit tests, integration tests, E2E tests
- Deploy job has `needs: [lint, test, e2e]` - only runs if all pass
- Preview deploys for PRs (also require passing tests)
- Codecov integration for coverage tracking

---

### P1.7 - Stripe Price ID Configuration
**Status:** ⬜ MANUAL - One-time setup required

**Tasks:**
1. Create Product in Stripe Dashboard
2. Create Price ($497 one-time lifetime)
3. Copy Price ID to `STRIPE_PRICE_ID` env var
4. Create webhook endpoint in Stripe
5. Configure webhook events: `checkout.session.completed`, `payment_intent.succeeded`
6. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

---

### P1.8 - Email Domain Verification
**Status:** ⬜ MANUAL - One-time setup required

**Tasks:**
1. Add DNS records for Resend domain verification
2. Wait for verification (up to 72 hours)
3. Test email delivery
4. Configure `EMAIL_FROM` with verified domain

---

### P1.9 - Database Deployment
**Status:** ⬜ MANUAL - One-time setup required

**Tasks:**
1. Create Neon database
2. Get `DATABASE_URL` connection string
3. Run `prisma migrate deploy` on production DB
4. Run `prisma db seed` to create strategies
5. Verify all 6 strategies exist

---

## Priority 2: Important (Should have for launch)

### P2.1 - Admin Account Creation
**Status:** ⬜ MANUAL - One-time setup required

**Tasks:**
1. Create first user via email login
2. Manually update user role to ADMIN in database
3. Verify admin access works

---

### P2.2 - Worker Deployment
**Status:** ⬜ MANUAL - Deployment required

**Tasks:**
1. Create Fly.io account/app
2. Configure Dockerfile
3. Set environment secrets
4. Deploy worker
5. Verify worker starts and connects

---

### P2.3 - TradingView Bot Account
**Status:** ⬜ MANUAL - One-time setup required

**Tasks:**
1. Create dedicated TradingView account for automation
2. Enable 2FA and extract TOTP secret
3. Configure `TV_BOT_EMAIL`, `TV_BOT_PASSWORD`, `TV_BOT_TOTP_SECRET`
4. Grant account access to manage Pine Scripts

---

## Ship v1 Task Summary

| ID | Task | Status | Type |
|----|------|--------|------|
| P1.1 | Strict Username Validation | ✅ DONE | Code |
| P1.2 | Playwright Provisioning | ✅ DONE | Code |
| P1.3 | Health Checks + Auto-Recovery | ✅ DONE | Code |
| P1.4 | New Strategy Auto-Grant | ✅ DONE | Code |
| P1.5 | Test Suite | ✅ DONE | Code |
| P1.6 | CI/CD Pipeline | ✅ DONE | Code |
| P1.7 | Stripe Configuration | ⬜ TODO | Manual |
| P1.8 | Email Domain Verification | ⬜ TODO | Manual |
| P1.9 | Database Deployment | ⬜ TODO | Manual |
| P2.1 | Admin Account | ⬜ TODO | Manual |
| P2.2 | Worker Deployment | ⬜ TODO | Manual |
| P2.3 | TradingView Bot Account | ⬜ TODO | Manual |

---

## NO Recurring Manual Operations

| Previous Manual Task | Now Automated |
|---------------------|---------------|
| Cookie rotation | Playwright provider logs in automatically |
| Health monitoring | 15-min automated health checks |
| Fallback switching | Auto-fallback on failure |
| Recovery detection | Auto-recovery when provider healthy |
| New strategy grants | Auto-queued on activation |

---

## Pre-Launch Checklist

### One-Time Environment Setup
- [ ] Neon database created and configured
- [ ] Upstash Redis created and configured
- [ ] Stripe account configured (live mode)
- [ ] Resend domain verified
- [ ] TradingView bot account created with 2FA
- [ ] All environment variables set in Vercel
- [ ] All environment variables set in Fly.io

### Code Deployment (Automated via CI/CD)
- [ ] All tests passing
- [ ] Web app deployed to Vercel
- [ ] Worker deployed to Fly.io
- [ ] Database migrated and seeded

### Testing
- [ ] User signup flow works
- [ ] Onboarding validates username (blocking if service down)
- [ ] Checkout blocked when validation unavailable
- [ ] Payment flow works
- [ ] Webhook processes correctly (idempotent)
- [ ] Provisioning creates access records
- [ ] Emails delivered
- [ ] Admin dashboard accessible
- [ ] Health check runs every 15 minutes

### Go-Live
- [ ] Switch Stripe to live mode
- [ ] Update webhook to live endpoint
- [ ] Final smoke test with real payment
- [ ] Monitor first 10 purchases closely

---

## Files Created/Modified in v1 Hardening

### New Files
| File | Purpose |
|------|---------|
| `apps/web/src/lib/tradingview-validator.ts` | Strict validation with caching |
| `apps/web/src/app/api/user/validate-username/route.ts` | Real-time validation API |
| `apps/worker/src/providers/playwright.provider.ts` | Automated provisioning |
| `apps/worker/src/providers/types.ts` | Provider type definitions |
| `apps/worker/src/jobs/credential-health-check.ts` | Health monitoring |
| `apps/worker/src/processors/new-strategy-grant.processor.ts` | Auto-grant logic |
| `apps/web/src/app/api/admin/strategies/route.ts` | Admin strategies API |
| `apps/web/src/app/api/admin/strategies/[id]/route.ts` | Single strategy API |
| `.github/workflows/ci.yml` | CI/CD with test blocking |
| `vitest.config.ts` | Test configuration |
| `playwright.config.ts` | E2E configuration |
| `tests/setup.ts` | Test environment setup |
| `tests/integration/*.test.ts` | Integration tests |
| `tests/e2e/*.spec.ts` | E2E tests |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/app/api/checkout/route.ts` | Strict validation blocking |
| `apps/web/src/app/api/user/onboarding/route.ts` | Validate before storing |
| `apps/web/src/app/(auth)/onboarding/page.tsx` | Real-time validation UI |
| `apps/web/src/lib/redis.ts` | Validation rate limiter |
| `apps/worker/src/providers/index.ts` | Playwright provider chain |
| `apps/web/src/lib/queue.ts` | Generic addJob helper |
| `package.json` | Test scripts and dependencies |

---

## Verification Commands

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Check test coverage
pnpm test:coverage

# Type check
pnpm type-check

# Lint
pnpm lint
```

---

## Launch Statement

After implementing P1.1-P1.6, the system meets the founder's zero-manual-intervention requirement:

1. **Zero manual intervention in happy path**: User pays → webhook fires → access records created → worker provisions → done
2. **No graceful degradation**: Checkout returns 503 if validation service unavailable
3. **No recurring manual operations**: Playwright logs in automatically, no cookie rotation needed

The only manual steps are one-time pre-launch setup tasks (P1.7-P1.9, P2.1-P2.3).
