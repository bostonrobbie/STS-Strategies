# Production Database Setup Guide

This guide covers setting up a production PostgreSQL database for the STS Strategies platform.

---

## Recommended Providers

### Option 1: Neon (Recommended for Serverless)

**Pros**:
- Serverless PostgreSQL with automatic scaling
- Built-in connection pooling
- Generous free tier
- Instant branching for staging environments
- Excellent for Next.js/Vercel deployments

**Setup Steps**:

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project named "sts-strategies-production"
3. Select region closest to your users (e.g., US East for North America)
4. Copy the connection string (starts with `postgresql://`)
5. Enable connection pooling (recommended for serverless)
6. Add the pooled connection string to your `.env.production`:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

**Pricing**: Free tier includes 0.5 GB storage, 3 GB data transfer

---

### Option 2: Supabase

**Pros**:
- PostgreSQL with additional features (auth, storage, realtime)
- Built-in connection pooling
- Good free tier
- Excellent dashboard and monitoring

**Setup Steps**:

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project named "sts-strategies-production"
3. Select region closest to your users
4. Copy the "Connection Pooling" connection string (not direct connection)
5. Add to your `.env.production`:
   ```
   DATABASE_URL="postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```

**Pricing**: Free tier includes 500 MB storage, 2 GB data transfer

---

### Option 3: Railway

**Pros**:
- Simple setup
- Good for both database and worker deployment
- Predictable pricing
- Excellent for monorepos

**Setup Steps**:

1. Go to [railway.app](https://railway.app) and create an account
2. Create a new project
3. Add a PostgreSQL database service
4. Copy the connection string from the "Connect" tab
5. Add to your `.env.production`:
   ```
   DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:7432/railway"
   ```

**Pricing**: $5/month minimum, pay-as-you-go

---

## Database Migration

Once you have your production database URL, run these commands:

### 1. Set the DATABASE_URL

```bash
export DATABASE_URL="your_production_database_url"
```

### 2. Generate Prisma Client

```bash
pnpm db:generate
```

### 3. Push Schema to Production

```bash
pnpm db:push
```

**Note**: For production, you should use migrations instead of `db:push`:

```bash
# Create migration
pnpm db:migrate:create

# Deploy migration
pnpm db:migrate:deploy
```

### 4. Seed Production Database

```bash
pnpm db:seed
```

This will create:
- 6 trading strategies
- Admin user (using ADMIN_EMAIL from .env)
- Initial pricing configuration

---

## Connection Pooling

**Important**: Always use connection pooling for serverless environments (Vercel, Netlify, etc.)

### Why Connection Pooling?

- Serverless functions create many database connections
- PostgreSQL has a limited number of connections (typically 100)
- Connection pooling reuses connections efficiently

### How to Enable

**Neon**: Use the "Pooled connection" string (port 5432 with `?sslmode=require`)

**Supabase**: Use the "Connection Pooling" string (port 6543)

**Railway**: Add PgBouncer service and use its connection string

---

## Database Indexes

The following indexes are automatically created by Prisma:

- `User.email` - Unique index for fast user lookup
- `User.stripeCustomerId` - Index for Stripe integration
- `Purchase.userId` - Index for user purchases
- `Purchase.stripeSessionId` - Unique index for payment tracking
- `ProvisioningJob.userId` - Index for job lookup
- `Strategy.slug` - Unique index for URL routing

**No additional indexes needed** for initial launch.

---

## Backup Strategy

### Automated Backups

**Neon**: 
- Automatic daily backups (retained for 7 days on free tier)
- Point-in-time recovery available on paid plans

**Supabase**:
- Automatic daily backups (retained for 7 days on free tier)
- Manual backups available in dashboard

**Railway**:
- Automatic daily backups (retained for 7 days)
- Manual backups via CLI

### Manual Backup

To create a manual backup:

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress the backup
gzip backup-$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Decompress
gunzip backup-20260201.sql.gz

# Restore
psql $DATABASE_URL < backup-20260201.sql
```

---

## Monitoring

### Query Performance

**Neon**: Built-in query monitoring in dashboard

**Supabase**: Query performance tab in dashboard

**Railway**: Use `pg_stat_statements` extension

### Connection Monitoring

Monitor active connections:

```sql
SELECT count(*) FROM pg_stat_activity;
```

Check for long-running queries:

```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

---

## Security Best Practices

1. **Use SSL/TLS**: Always include `?sslmode=require` in connection string
2. **Rotate Passwords**: Change database password every 90 days
3. **Limit Access**: Only allow connections from your app servers
4. **Use Environment Variables**: Never hardcode database credentials
5. **Enable Audit Logging**: Track all database access (available on paid plans)

---

## Troubleshooting

### Connection Timeout

**Symptom**: `Error: connect ETIMEDOUT`

**Solution**: 
- Check if your IP is whitelisted (some providers require this)
- Verify SSL mode is set correctly
- Check firewall settings

### Too Many Connections

**Symptom**: `Error: sorry, too many clients already`

**Solution**:
- Enable connection pooling
- Reduce `connection_limit` in Prisma schema
- Upgrade to a higher tier with more connections

### Slow Queries

**Symptom**: Queries taking > 1 second

**Solution**:
- Add indexes to frequently queried columns
- Use `EXPLAIN ANALYZE` to identify bottlenecks
- Consider caching frequently accessed data

---

## Next Steps

After setting up the database:

1. ✅ Update `.env.production` with `DATABASE_URL`
2. ✅ Run migrations: `pnpm db:migrate:deploy`
3. ✅ Seed database: `pnpm db:seed`
4. ✅ Test connection: `pnpm db:studio`
5. ✅ Set up automated backups
6. ✅ Configure monitoring alerts

---

## Cost Estimation

### Free Tier (Suitable for MVP/Testing)

- **Neon**: Free (0.5 GB storage, 3 GB transfer)
- **Supabase**: Free (500 MB storage, 2 GB transfer)
- **Railway**: $5/month minimum

### Production (1000 users, 10k requests/day)

- **Neon**: $19/month (Scale plan)
- **Supabase**: $25/month (Pro plan)
- **Railway**: $10-20/month (usage-based)

**Recommendation**: Start with Neon free tier, upgrade to Scale plan when you hit limits.

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
