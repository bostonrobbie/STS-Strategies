# STS Strategies Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Fly.io        │     │   External      │
│   (Web App)     │────▶│   (Worker)      │────▶│   Services      │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │                       │
         │                       │              ┌────────┴────────┐
         ▼                       ▼              │                 │
┌─────────────────┐     ┌─────────────────┐    │  - Stripe       │
│   Neon          │◀────│   Upstash       │    │  - Resend       │
│   (PostgreSQL)  │     │   (Redis)       │    │  - TradingView  │
└─────────────────┘     └─────────────────┘    │    API          │
                                               └─────────────────┘
```

## Required Environment Variables

### Web App (Vercel)

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host/database?sslmode=require"

# NextAuth (Authentication)
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Redis (Upstash - for rate limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Redis (for BullMQ queues)
REDIS_URL="redis://..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="STS Strategies <noreply@yourdomain.com>"

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_APP_NAME="STS Strategies"

# Admin
ADMIN_EMAIL="admin@yourdomain.com"
```

### Worker (Fly.io)

```bash
# Database (same as web)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Redis (Upstash - for BullMQ)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
REDIS_URL="redis://..."  # Standard Redis URL for ioredis

# TradingView Access API (Optional - for automated provisioning)
TV_ACCESS_API_URL="https://your-tv-api.com"
TV_SESSION_ID="your-session-id"
TV_SIGNATURE="your-signature"

# Provisioning Mode
PROVISIONING_MODE="unofficial-api"  # or "manual"
PROVISIONING_FALLBACK_MODE="manual"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="STS Strategies <noreply@yourdomain.com>"

# Admin
ADMIN_EMAIL="admin@yourdomain.com"

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_APP_NAME="STS Strategies"

# Worker Settings
WORKER_CONCURRENCY="5"
WORKER_MAX_RETRIES="5"
```

## Setup Instructions

### 1. Database Setup (Neon)

1. Create a Neon project at https://neon.tech
2. Copy the connection strings (pooled and unpooled)
3. Run database migrations:

```bash
cd packages/database
npx prisma migrate deploy
npx prisma db seed
```

### 2. Redis Setup (Upstash)

1. Create an Upstash Redis database at https://upstash.com
2. Copy the REST URL and token
3. Note: BullMQ requires a standard Redis connection URL
   - Upstash provides both REST API and standard Redis protocol
   - Use the standard URL for `REDIS_URL`

### 3. Stripe Setup

1. Create products and prices in Stripe Dashboard
2. Create a webhook endpoint pointing to:
   ```
   https://your-domain.com/api/webhooks/stripe
   ```
3. Subscribe to events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret

### 4. Resend Setup

1. Create an account at https://resend.com
2. Verify your sending domain
3. Create an API key
4. Configure `EMAIL_FROM` with your verified domain

### 5. Web App Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... add all required variables

# Deploy to production
vercel --prod
```

**Vercel Configuration Notes:**
- Root Directory: `apps/web`
- Build Command: `cd ../.. && pnpm build --filter=@sts/web`
- Output Directory: `.next`
- Install Command: `cd ../.. && pnpm install`

### 6. Worker Deployment (Fly.io)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Navigate to worker directory
cd apps/worker

# Create the app (first time only)
fly launch --name sts-worker --no-deploy

# Set secrets
fly secrets set DATABASE_URL="..."
fly secrets set REDIS_URL="..."
fly secrets set RESEND_API_KEY="..."
# ... add all required variables

# Deploy
fly deploy
```

**Fly.io Configuration** (`fly.toml`):
```toml
app = "sts-worker"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
```

## Webhook URL Setup

### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Queue Setup

The system uses BullMQ with Redis for background job processing.

### Queues

| Queue | Purpose | Retry Policy |
|-------|---------|--------------|
| `provisioning` | TradingView access grants | 5 attempts, exponential backoff |
| `email` | Transactional emails | 3 attempts, exponential backoff |

### Monitoring

- Jobs are retained for 7 days (completed) / 30 days (failed)
- Use the Admin Provisioning Health dashboard to monitor
- Failed jobs send admin alerts after 3 attempts

## Smoke Test Steps

After deployment, verify the following:

### 1. Web App Health
```bash
# Check homepage loads
curl -I https://your-domain.com

# Check API responds
curl https://your-domain.com/api/health
```

### 2. Authentication
1. Navigate to `/login`
2. Enter email and request magic link
3. Check email delivery (check spam folder)
4. Click magic link and verify login

### 3. Database Connection
1. Login as admin
2. Navigate to `/admin/users`
3. Verify user list loads

### 4. Stripe Integration
1. Navigate to `/pricing`
2. Click purchase button
3. Verify Stripe checkout loads
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase
6. Verify webhook processes (check audit logs)

### 5. Worker Health
```bash
# Check Fly.io logs
fly logs -a sts-worker

# Look for:
# "STS Strategies Worker Started"
# "Connected to Redis"
```

### 6. Email Delivery
1. Create a support ticket
2. Verify confirmation email arrives
3. Admin should receive notification

### 7. Provisioning Health
1. Login as admin
2. Navigate to `/admin/provisioning`
3. Verify health status displays
4. Check for any pending/failed records

## Troubleshooting

### Web App Issues

**Build fails on Vercel:**
- Check `apps/web/next.config.js` for transpilePackages
- Verify all workspace dependencies are listed
- Check build logs for missing dependencies

**Auth issues:**
- Verify `NEXTAUTH_URL` matches deployment URL
- Check `NEXTAUTH_SECRET` is set correctly
- Verify email provider is configured

### Worker Issues

**Worker won't start:**
- Check `REDIS_URL` is valid ioredis connection string
- Verify database connection works
- Check Fly.io logs: `fly logs -a sts-worker`

**Jobs not processing:**
- Verify worker is running: `fly status -a sts-worker`
- Check Redis connection in worker logs
- Verify queue names match between web and worker

### Provisioning Issues

**All provisioning fails:**
- Check TradingView API credentials
- Verify `TV_ACCESS_API_URL` is accessible
- Check if credentials have expired

**Manual fallback not working:**
- Verify `PROVISIONING_FALLBACK_MODE=manual`
- Check admin email delivery
- Review audit logs for task creation

## Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback
```

### Fly.io
```bash
# List releases
fly releases -a sts-worker

# Rollback to previous
fly releases rollback -a sts-worker
```

### Database
```bash
# Create backup before changes
pg_dump $DATABASE_URL > backup.sql

# Rollback migration if needed
npx prisma migrate resolve --rolled-back <migration_name>
```

## Monitoring & Alerts

### Recommended Setup

1. **Vercel Analytics** - Built-in for web performance
2. **Fly.io Metrics** - CPU/memory for worker
3. **Upstash Console** - Redis metrics and alerts
4. **Stripe Dashboard** - Payment monitoring
5. **Resend Dashboard** - Email delivery rates

### Admin Alerts

The system sends alerts to `ADMIN_EMAIL` for:
- New purchases
- Provisioning failures (after 3 attempts)
- Manual tasks created
- Support tickets

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced on all endpoints
- [ ] Stripe webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] Admin routes protected by role check
- [ ] Database connections use SSL
- [ ] No sensitive data in logs

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01 | 1.0 | Initial deployment guide |
