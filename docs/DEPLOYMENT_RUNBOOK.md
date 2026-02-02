# STS Strategies - Deployment Runbook

This runbook provides a step-by-step guide for deploying the STS Strategies platform to production.

---

## Pre-Deployment Checklist

### 1. Domain Name

- [ ] **Purchase Domain**: `yourdomain.com` (e.g., from Namecheap, GoDaddy)
- [ ] **Configure DNS**: Point NS records to Vercel:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

### 2. Production Credentials

- [ ] **Database**: Create production PostgreSQL database (Neon recommended)
- [ ] **Redis**: Create production Redis instance (Upstash recommended)
- [ ] **Stripe**: Get live API keys and webhook secret
- [ ] **Resend**: Get API key and verify domain
- [ ] **TradingView**: Create dedicated account for automation
- [ ] **Sentry**: Create project and get DSN

### 3. Environment Variables

- [ ] **Create `.env.production`**: Copy from `.env.production.template`
- [ ] **Fill in all values**: Use production credentials
- [ ] **Generate secrets**: `openssl rand -base64 32` for `NEXTAUTH_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`

### 4. Vercel Project

- [ ] **Create Vercel Account**: [vercel.com](https://vercel.com)
- [ ] **Import Git Repository**: `bostonrobbie/STS-Strategies`
- [ ] **Configure Project**: 
  - **Framework**: Next.js
  - **Root Directory**: `apps/web`
  - **Build Command**: `pnpm build --filter=@sts/web`
  - **Install Command**: `pnpm install`
- [ ] **Add Environment Variables**: Copy all values from `.env.production`

### 5. Railway Project (for Worker)

- [ ] **Create Railway Account**: [railway.app](https://railway.app)
- [ ] **Import Git Repository**: `bostonrobbie/STS-Strategies`
- [ ] **Configure Service**: 
  - **Build Method**: Dockerfile
  - **Dockerfile Path**: `apps/worker/Dockerfile`
  - **Start Command**: `pnpm --filter @sts/worker start`
- [ ] **Add Environment Variables**: Copy all values from `.env.production`

---

## Deployment Steps

### Step 1: Deploy Web App to Vercel

1. **Push to `main` branch**: This will trigger a production deployment on Vercel.
2. **Monitor Deployment**: Check Vercel dashboard for build progress.
3. **Assign Domain**: Go to **Settings** → **Domains** and assign `yourdomain.com`.
4. **Test Deployment**: Visit `https://yourdomain.com` and verify it loads.

### Step 2: Deploy Worker to Railway

1. **Push to `main` branch**: This will trigger a production deployment on Railway.
2. **Monitor Deployment**: Check Railway dashboard for build progress.
3. **Verify Worker is Running**: Check logs for "Worker started".

### Step 3: Database Migration

1. **Connect to Production Database**: Use a secure shell or local `psql`.
2. **Set `DATABASE_URL`**: `export DATABASE_URL="your_production_db_url"`
3. **Run Migrations**: `pnpm db:migrate:deploy`
4. **Seed Database**: `pnpm db:seed`

### Step 4: Final Configuration

1. **Stripe Webhook**: Update webhook URL to `https://yourdomain.com/api/webhooks/stripe`.
2. **Resend Domain**: Verify production domain in Resend.
3. **Uptime Monitoring**: Update monitor URLs to `https://yourdomain.com`.

---

## Post-Deployment Checklist

### 1. End-to-End Testing

- [ ] **Create Account**: Sign up with a new email.
- [ ] **Test Magic Link**: Verify email is received and works.
- [ ] **Test Purchase**: Complete a real purchase with a small amount.
- [ ] **Verify Fulfillment**: Check if TradingView access is granted.
- [ ] **Verify Emails**: Check if confirmation emails are received.
- [ ] **Refund Test Purchase**: Refund the purchase in Stripe.

### 2. Monitoring

- [ ] **Check Sentry**: Verify errors are being captured.
- [ ] **Check Vercel Analytics**: Verify traffic is being tracked.
- [ ] **Check UptimeRobot**: Verify monitors are green.
- [ ] **Check Worker Logs**: Verify jobs are processing.

### 3. Security

- [ ] **Rotate Secrets**: If any were exposed during deployment.
- [ ] **Review Access**: Limit access to production environments.
- [ ] **Enable 2FA**: On all accounts (Vercel, Railway, Stripe, etc.).

---

## Rollback Plan

### Vercel (Web App)

1. Go to **Deployments** in Vercel dashboard.
2. Find the previous successful deployment.
3. Click the "..." menu and select "Redeploy".
4. This will instantly roll back to the previous version.

### Railway (Worker)

1. Go to **Deployments** in Railway dashboard.
2. Find the previous successful deployment.
3. Click "Redeploy".

### Database

1. **Restore from backup**: Use `pg_restore` to restore from a previous backup.
2. **Roll back migration**: `pnpm db:migrate:down` (if using migrations).

---

## Emergency Procedures

### Site Down

1. **Check UptimeRobot**: Identify which service is down.
2. **Check Vercel/Railway Status**: [vercel-status.com](https://vercel-status.com), [status.railway.app](https://status.railway.app)
3. **Check Logs**: Look for critical errors.
4. **Roll back**: If recent deployment caused the issue.
5. **Contact Support**: Vercel/Railway support if platform issue.

### High Error Rate

1. **Check Sentry**: Identify the source of errors.
2. **Roll back**: If related to a recent deployment.
3. **Deploy Hotfix**: If a small fix is needed.
4. **Disable Feature**: Use feature flags to disable problematic feature.

### Payment Issues

1. **Check Stripe Status**: [status.stripe.com](https://status.stripe.com)
2. **Check Webhook Logs**: Look for failed webhooks.
3. **Check Worker Logs**: Look for processing errors.
4. **Manually Fulfill**: If automation fails, manually grant access.

---

## On-Call Rotation

- **Primary**: [Name], [Phone Number]
- **Secondary**: [Name], [Phone Number]

---

## Key Contacts

- **Vercel Support**: [support@vercel.com](mailto:support@vercel.com)
- **Railway Support**: [support@railway.app](mailto:support@railway.app)
- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Resend Support**: [support@resend.com](mailto:support@resend.com)

---

## Appendix

### Useful Commands

```bash
# Check web app logs (Vercel)
vercel logs your-project-name.vercel.app

# Check worker logs (Railway)
railway logs

# Connect to production database
psql $DATABASE_URL

# Check Redis keys
redis-cli -u $REDIS_URL keys "*"

# Run production build locally
NODE_ENV=production pnpm build

# Run production start locally
NODE_ENV=production pnpm start
```

### Source Code

- **GitHub**: [github.com/bostonrobbie/STS-Strategies](https://github.com/bostonrobbie/STS-Strategies)

### Documentation

- **Database Setup**: `docs/DATABASE_SETUP.md`
- **Redis Setup**: `docs/REDIS_SETUP.md`
- **Stripe Setup**: `docs/STRIPE_SETUP.md`
- **Email Setup**: `docs/EMAIL_SETUP.md`
- **Monitoring Setup**: `docs/MONITORING_SETUP.md`

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
