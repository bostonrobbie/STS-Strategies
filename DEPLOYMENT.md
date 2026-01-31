# STS Strategies - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the STS Strategies platform to production. The platform consists of two main services:

1. **Web Application** (Next.js 14) - User-facing website with authentication, payments, and dashboard
2. **Worker Service** (BullMQ) - Background job processor for TradingView provisioning automation

## Architecture

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, NextAuth.js for authentication
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ with Redis
- **Payments**: Stripe (one-time payments)
- **Email**: Resend (transactional emails)
- **Deployment**: Vercel (web) + any Node.js host (worker)

### Database Schema

The platform uses Prisma with the following main models:

- **User**: User accounts with email authentication
- **Account**: OAuth provider accounts
- **Session**: User sessions
- **VerificationToken**: Magic link tokens
- **Strategy**: Trading strategies (6 pre-seeded)
- **Purchase**: Customer purchases
- **StrategyAccess**: User access to strategies
- **ProvisioningJob**: TradingView provisioning queue
- **SupportTicket**: Customer support system
- **SystemConfig**: System configuration

## Environment Variables

### Required for Production

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Redis (Upstash or any Redis provider)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
REDIS_URL="redis://..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="STS Strategies <noreply@your-domain.com>"

# Admin
ADMIN_EMAIL="admin@your-domain.com"

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_APP_NAME="STS Strategies"

# TradingView Access API (Optional - for automated provisioning)
TV_ACCESS_API_URL=""
TV_SESSION_ID=""
TV_SIGNATURE=""

# Encryption
CREDENTIAL_ENCRYPTION_KEY="<generate-with-openssl-rand-base64-32>"

# Worker Configuration
WORKER_CONCURRENCY="5"
WORKER_MAX_RETRIES="5"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CREDENTIAL_ENCRYPTION_KEY
openssl rand -base64 32
```

## Deployment Steps

### 1. Database Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed initial data (6 strategies)
pnpm db:seed
```

### 2. Stripe Configuration

1. Create a product in Stripe Dashboard
2. Create a one-time price for the product
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Configure webhook events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 3. Deploy Web Application (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# or use: vercel env add
```

**Vercel Configuration** (`vercel.json`):

```json
{
  "buildCommand": "pnpm build --filter=@sts/web",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install"
}
```

### 4. Deploy Worker Service

The worker can be deployed to any Node.js hosting platform:

- **Railway**: Recommended for simplicity
- **Render**: Good free tier
- **Fly.io**: Global edge deployment
- **DigitalOcean App Platform**: Reliable and scalable
- **AWS ECS/Fargate**: Enterprise-grade

**Example Dockerfile** (for containerized deployment):

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build worker
RUN pnpm --filter @sts/worker build

# Start worker
CMD ["pnpm", "--filter", "@sts/worker", "start"]
```

### 5. Redis Setup

**Option A: Upstash (Recommended)**
- Create account at upstash.com
- Create Redis database
- Copy REST URL and token

**Option B: Self-hosted Redis**
- Deploy Redis 6.2+ instance
- Use `REDIS_URL` for BullMQ connection

### 6. Email Setup (Resend)

1. Create account at resend.com
2. Verify your domain
3. Create API key
4. Set `RESEND_API_KEY` and `EMAIL_FROM`

## Post-Deployment Checklist

### Security

- [ ] All environment variables are set correctly
- [ ] Database credentials are secure
- [ ] Stripe webhook signature is verified
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (Vercel automatic)

### Functionality

- [ ] Homepage loads correctly
- [ ] User registration works (magic link email)
- [ ] User login works
- [ ] Stripe checkout flow completes
- [ ] Webhook processes payments
- [ ] Worker processes provisioning jobs
- [ ] Email notifications are sent
- [ ] Admin dashboard is accessible
- [ ] Support ticket system works

### Performance

- [ ] Page load time < 2s
- [ ] Database queries are optimized
- [ ] Redis connection is stable
- [ ] Worker processes jobs efficiently
- [ ] No memory leaks in worker

### Monitoring

- [ ] Error tracking enabled (Sentry recommended)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Database monitoring
- [ ] Worker health checks
- [ ] Stripe webhook monitoring

## Monitoring & Maintenance

### Health Checks

**Web Application**:
```bash
curl https://your-domain.com/api/health
```

**Worker**:
- Monitor BullMQ dashboard
- Check Redis connection
- Monitor job completion rates
- Track failed jobs

### Logs

**Vercel**:
```bash
vercel logs
```

**Worker** (depends on hosting):
```bash
# Railway
railway logs

# Render
render logs

# Docker
docker logs <container-id>
```

### Database Backups

```bash
# Automated daily backups (recommended)
# Set up with your hosting provider

# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## Scaling Considerations

### Web Application

- **Vercel**: Automatically scales
- **Edge Functions**: Consider for API routes
- **CDN**: Static assets cached globally

### Worker Service

- **Horizontal Scaling**: Deploy multiple worker instances
- **Concurrency**: Adjust `WORKER_CONCURRENCY` based on load
- **Queue Monitoring**: Use BullMQ dashboard

### Database

- **Connection Pooling**: Use PgBouncer or Prisma Data Proxy
- **Read Replicas**: For high read loads
- **Indexes**: Ensure proper indexing on frequently queried fields

### Redis

- **Memory**: Monitor Redis memory usage
- **Persistence**: Enable RDB or AOF for data durability
- **Clustering**: For high availability

## Troubleshooting

### Common Issues

**1. Worker not processing jobs**
- Check Redis connection
- Verify environment variables
- Check worker logs
- Ensure worker is running

**2. Stripe webhook failing**
- Verify webhook secret
- Check endpoint URL
- Review Stripe dashboard logs
- Ensure HTTPS is enabled

**3. Email not sending**
- Verify Resend API key
- Check domain verification
- Review email logs
- Check spam folder

**4. Database connection errors**
- Verify DATABASE_URL
- Check connection limits
- Review database logs
- Ensure database is running

**5. Authentication issues**
- Verify NEXTAUTH_URL matches domain
- Check NEXTAUTH_SECRET is set
- Review session configuration
- Clear browser cookies

## Support

For issues or questions:
- GitHub Issues: https://github.com/bostonrobbie/STS-Strategies/issues
- Email: admin@sts-strategies.com

## License

Proprietary - All rights reserved
