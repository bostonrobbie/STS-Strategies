# STS Strategies

A production-ready SaaS platform for selling lifetime access to TradingView invite-only Pine Script trading strategies.

## Features

- **One-time Payment**: Lifetime access with a single payment (~$99)
- **Automated Provisioning**: TradingView access granted automatically via unofficial API
- **User Dashboard**: View purchased strategies and access status
- **Admin Dashboard**: Manage users, access, tickets, and audit logs
- **Support System**: Built-in ticket system for customer support
- **Email Notifications**: Transactional emails via Resend

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web App | Next.js 14 (App Router), TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Auth | NextAuth (Email Magic Link + Google OAuth) |
| Database | PostgreSQL (Neon) + Prisma |
| Payments | Stripe (one-time checkout) |
| Job Queue | BullMQ + Redis (Upstash) |
| Email | Resend |
| Hosting | Vercel (web) + Fly.io (worker) |

## Project Structure

```
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (public)/   # Public pages (home, strategies, pricing)
│   │   │   │   ├── (auth)/     # Auth pages (login, onboarding)
│   │   │   │   ├── (dashboard)/# User dashboard
│   │   │   │   ├── (admin)/    # Admin panel
│   │   │   │   └── api/        # API routes
│   │   │   ├── components/     # React components
│   │   │   └── lib/            # Utilities (auth, stripe, redis)
│   │   └── ...
│   └── worker/                 # BullMQ job processor
│       └── src/
│           ├── processors/     # Job handlers
│           └── services/       # TradingView, email services
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── shared/                 # Types, Zod schemas, constants
│   └── email/                  # React email templates
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database (Neon recommended)
- Redis (Upstash recommended)
- Stripe account
- Resend account
- TradingView Premium account (for auto-provisioning)

### Installation

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd sts-strategies
pnpm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Fill in all required values in `.env`:

```env
# Database
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Redis
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Email
RESEND_API_KEY=""
EMAIL_FROM="STS Strategies <noreply@yourdomain.com>"

# TradingView (optional - for auto-provisioning)
TV_ACCESS_API_URL=""
TV_SESSION_ID=""
TV_SIGNATURE=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@yourdomain.com"
```

3. **Set up the database**

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed with sample strategies
pnpm db:seed
```

4. **Run development servers**

```bash
# Run everything
pnpm dev

# Or run individually
pnpm --filter @sts/web dev     # Web app on port 3000
pnpm --filter @sts/worker dev  # Worker
```

### Setting Up Stripe

1. Create a product in Stripe Dashboard
2. Create a price for the product (one-time, ~$99)
3. Set up a webhook endpoint pointing to `/api/webhooks/stripe`
4. Enable the `checkout.session.completed` event
5. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Setting Up TradingView Auto-Provisioning

The worker uses the unofficial TradingView Access Management API for automatic access provisioning.

1. Set up the API from: https://github.com/trendoscope-algorithms/Tradingview-Access-Management
2. Configure your TradingView session credentials
3. Set `TV_ACCESS_API_URL`, `TV_SESSION_ID`, and `TV_SIGNATURE` in `.env`

If not configured, access will remain in "PENDING" status for manual provisioning via the admin panel.

## Deployment

### Web App (Vercel)

1. Connect your repository to Vercel
2. Set all environment variables
3. Deploy

### Worker (Fly.io)

```bash
cd apps/worker
fly launch
fly secrets set DATABASE_URL="..." UPSTASH_REDIS_REST_URL="..." ...
fly deploy
```

## Admin Access

To make a user an admin:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Or via Prisma Studio:

```bash
pnpm db:studio
```

## API Routes

### Public
- `POST /api/auth/[...nextauth]` - Authentication
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `POST /api/contact` - Contact form

### Protected (User)
- `POST /api/user/onboarding` - Submit TradingView username
- `GET/PATCH /api/user/settings` - User settings
- `GET/POST /api/support` - Support tickets
- `POST /api/support/[id]/messages` - Ticket replies

### Protected (Admin)
- `POST /api/admin/access/grant` - Manual access grant
- `POST /api/admin/access/[id]/revoke` - Revoke access
- `POST /api/admin/access/[id]/retry` - Retry provisioning
- `PATCH /api/admin/tickets/[id]` - Update ticket status
- `POST /api/admin/tickets/[id]/reply` - Admin reply

## License

Private - All rights reserved
