# Production Redis Setup Guide

This guide covers setting up a production Redis instance for the STS Strategies platform's BullMQ job queue.

---

## Why Redis?

The STS Strategies platform uses **BullMQ** for background job processing, specifically for:

- **Provisioning TradingView Access**: Automated process to grant users access to strategies
- **Email Queue**: Reliable email delivery with retries
- **Job Monitoring**: Track job status and failures
- **Rate Limiting**: Prevent abuse of API endpoints

**Redis is required** for the worker service to function.

---

## Recommended Providers

### Option 1: Upstash (Recommended for Serverless)

**Pros**:
- Serverless Redis with per-request pricing
- Excellent for low-traffic applications
- Built-in REST API (no connection pooling needed)
- Global replication available
- Generous free tier

**Setup Steps**:

1. Go to [upstash.com](https://upstash.com) and create an account
2. Create a new Redis database named "sts-strategies-production"
3. Select region closest to your users
4. Choose "Regional" (or "Global" for multi-region)
5. Copy the connection string from the "Redis Connect" tab
6. Add to your `.env.production`:
   ```
   REDIS_URL="rediss://default:YOUR_PASSWORD@us1-xxx.upstash.io:6379"
   ```

**Optional REST API** (for edge functions):
```
UPSTASH_REDIS_REST_URL="https://us1-xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="YOUR_TOKEN_HERE"
```

**Pricing**: Free tier includes 10,000 commands/day

---

### Option 2: Railway

**Pros**:
- Simple setup
- Good for both database and Redis in one place
- Predictable pricing
- Easy to scale

**Setup Steps**:

1. Go to [railway.app](https://railway.app) and create an account
2. Open your existing project (or create new one)
3. Click "New" → "Database" → "Add Redis"
4. Copy the connection string from the "Connect" tab
5. Add to your `.env.production`:
   ```
   REDIS_URL="redis://default:password@containers-us-west-xxx.railway.app:6379"
   ```

**Pricing**: ~$5-10/month depending on usage

---

### Option 3: Redis Cloud

**Pros**:
- Official Redis offering
- Excellent performance and reliability
- Advanced features (Redis Stack, modules)
- Good for high-traffic applications

**Setup Steps**:

1. Go to [redis.com/try-free](https://redis.com/try-free) and create an account
2. Create a new subscription (Free tier available)
3. Create a database named "sts-strategies-production"
4. Select region closest to your users
5. Copy the connection string
6. Add to your `.env.production`:
   ```
   REDIS_URL="redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345"
   ```

**Pricing**: Free tier includes 30 MB storage

---

## Redis Configuration

### Connection Settings

The platform uses these Redis settings:

```typescript
// BullMQ connection config
{
  host: 'your-redis-host',
  port: 6379,
  password: 'your-password',
  tls: true, // Required for Upstash and most cloud providers
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  enableOfflineQueue: false,
}
```

### TLS/SSL

**Important**: Most cloud Redis providers require TLS/SSL connections.

- Use `rediss://` (with double 's') for TLS connections
- Upstash, Railway, and Redis Cloud all require TLS
- Local Redis (development) uses `redis://` without TLS

---

## BullMQ Queue Configuration

The platform uses a single queue: `provisioning`

### Queue Settings

```typescript
{
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
}
```

### Job Types

1. **Provision TradingView Access**
   - Grants user access to invite-only strategies
   - Retries up to 3 times with exponential backoff
   - Sends email notification on completion

---

## Testing Redis Connection

### Using Redis CLI

```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# Test connection
PING
# Should return: PONG

# Check queue keys
KEYS bull:provisioning:*

# Monitor commands in real-time
MONITOR
```

### Using Node.js

```javascript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Test connection
await redis.ping();
console.log('Redis connected!');

// Close connection
await redis.quit();
```

---

## Monitoring

### Queue Metrics

Monitor these metrics in production:

- **Completed Jobs**: Jobs successfully processed
- **Failed Jobs**: Jobs that failed after all retries
- **Active Jobs**: Currently processing
- **Waiting Jobs**: In queue, not yet processed
- **Delayed Jobs**: Scheduled for future processing

### Using BullMQ Dashboard (Optional)

Install Bull Board for visual monitoring:

```bash
pnpm add @bull-board/api @bull-board/express
```

Access at: `https://yourdomain.com/admin/queues`

---

## Backup & Persistence

### Redis Persistence

**Upstash**: Automatic persistence with AOF (Append-Only File)

**Railway**: Automatic persistence with RDB snapshots

**Redis Cloud**: Configurable persistence (RDB + AOF available)

### Backup Strategy

**Important**: Redis data is ephemeral by design. Critical data should be stored in PostgreSQL.

For BullMQ:
- Completed jobs are automatically removed after 24 hours
- Failed jobs are kept for 7 days for debugging
- Job data is not critical (can be retried)

**No manual backups needed** for job queue data.

---

## Security Best Practices

1. **Use TLS/SSL**: Always use `rediss://` for production
2. **Strong Password**: Use a long, random password
3. **Rotate Passwords**: Change Redis password every 90 days
4. **Limit Access**: Only allow connections from your app servers
5. **Disable Dangerous Commands**: `FLUSHALL`, `FLUSHDB`, `CONFIG` (most providers do this)

---

## Troubleshooting

### Connection Refused

**Symptom**: `Error: connect ECONNREFUSED`

**Solution**:
- Verify Redis URL is correct
- Check if TLS is required (`rediss://` vs `redis://`)
- Verify firewall/network settings

### Authentication Failed

**Symptom**: `Error: NOAUTH Authentication required`

**Solution**:
- Verify password is correct
- Check if username is required (use `default` if unsure)
- Format: `redis://default:password@host:port`

### Jobs Not Processing

**Symptom**: Jobs stuck in "waiting" state

**Solution**:
- Verify worker service is running
- Check worker logs for errors
- Restart worker service
- Verify Redis connection from worker

### High Memory Usage

**Symptom**: Redis using > 100 MB memory

**Solution**:
- Check for failed jobs piling up
- Reduce `removeOnComplete.count` setting
- Clear old completed jobs manually
- Upgrade to higher tier if needed

---

## Performance Optimization

### Connection Pooling

BullMQ automatically manages connections. No additional pooling needed.

### Job Concurrency

Configure worker concurrency based on your needs:

```typescript
// In worker service
const worker = new Worker('provisioning', processor, {
  connection: redisConnection,
  concurrency: 5, // Process 5 jobs simultaneously
});
```

**Recommendation**: Start with concurrency of 5, increase if needed.

### Rate Limiting

Limit job processing rate to avoid overwhelming external services:

```typescript
{
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per 1 second
  },
}
```

---

## Cost Estimation

### Free Tier (Suitable for MVP/Testing)

- **Upstash**: Free (10,000 commands/day)
- **Railway**: $5/month minimum
- **Redis Cloud**: Free (30 MB storage)

### Production (1000 users, 100 jobs/day)

- **Upstash**: $10/month (Pay-as-you-go)
- **Railway**: $5-10/month
- **Redis Cloud**: $7/month (Essentials plan)

**Recommendation**: Start with Upstash free tier, upgrade when you hit limits.

---

## Migration from Development to Production

### 1. Export Job Data (Optional)

```bash
# Connect to development Redis
redis-cli -u $REDIS_URL_DEV

# Export all keys
redis-cli -u $REDIS_URL_DEV --scan > dev-keys.txt
```

### 2. Update Environment Variables

```bash
# Update .env.production
REDIS_URL="your_production_redis_url"
```

### 3. Test Connection

```bash
# Run worker in production mode
NODE_ENV=production pnpm --filter @sts/worker start
```

### 4. Monitor First Jobs

Watch the first few jobs process successfully before scaling up.

---

## Next Steps

After setting up Redis:

1. ✅ Update `.env.production` with `REDIS_URL`
2. ✅ Test connection: `redis-cli -u $REDIS_URL ping`
3. ✅ Deploy worker service
4. ✅ Test job processing end-to-end
5. ✅ Set up monitoring alerts
6. ✅ Configure rate limiting if needed

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
