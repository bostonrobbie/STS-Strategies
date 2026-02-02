# Monitoring & Error Tracking Setup Guide

This guide covers setting up comprehensive monitoring and error tracking for the STS Strategies platform.

---

## Overview

Monitoring is critical for production applications. The platform needs:

- **Error Tracking**: Catch and log all errors
- **Performance Monitoring**: Track response times and Core Web Vitals
- **Uptime Monitoring**: Ensure services are running
- **Log Aggregation**: Centralized logging
- **Alerts**: Get notified of issues immediately

---

## Recommended Stack

### Option 1: Sentry (Recommended)

**Best for**: Error tracking and performance monitoring

**Features**:
- Real-time error tracking
- Performance monitoring (APM)
- Release tracking
- User feedback
- Breadcrumbs for debugging
- Source maps support

**Pricing**: Free tier includes 5,000 errors/month

---

### Option 2: LogRocket

**Best for**: Session replay and frontend monitoring

**Features**:
- Session replay (see what users see)
- Console and network logs
- Performance monitoring
- Error tracking
- User analytics

**Pricing**: Free tier includes 1,000 sessions/month

---

### Option 3: Better Stack (formerly Logtail)

**Best for**: Log aggregation and uptime monitoring

**Features**:
- Centralized logging
- Log search and filtering
- Uptime monitoring
- Incident management
- Alerts and notifications

**Pricing**: Free tier includes 1 GB logs/month

---

## Step 1: Set Up Sentry

### 1.1 Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project
3. Select "Next.js" as the platform
4. Copy the DSN (Data Source Name)

### 1.2 Install Sentry

```bash
cd /home/ubuntu/STS-Strategies
pnpm add --filter @sts/web @sentry/nextjs
pnpm add --filter @sts/worker @sentry/node
```

### 1.3 Configure Sentry for Web App

Create `apps/web/sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

Create `apps/web/sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

Create `apps/web/sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 1.4 Configure Sentry for Worker

Create `apps/worker/src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not set, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });

  console.log('Sentry initialized');
}

export { Sentry };
```

Update `apps/worker/src/index.ts`:

```typescript
import { initSentry, Sentry } from './lib/sentry';

// Initialize Sentry first
initSentry();

// Wrap worker processing with Sentry
worker.on('failed', (job, err) => {
  Sentry.captureException(err, {
    tags: {
      jobId: job.id,
      jobName: job.name,
    },
    extra: {
      jobData: job.data,
      attemptsMade: job.attemptsMade,
    },
  });
});
```

### 1.5 Add Environment Variables

Add to `.env.production`:

```
# Sentry
SENTRY_DSN="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
NEXT_PUBLIC_SENTRY_DSN="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
SENTRY_ENVIRONMENT="production"
```

---

## Step 2: Set Up Uptime Monitoring

### Option 1: UptimeRobot (Free)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create a new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://yourdomain.com`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Your email

3. Add additional monitors:
   - `/api/health` - Health check endpoint
   - `/api/webhooks/stripe` - Stripe webhook endpoint

### Option 2: Better Stack Uptime

1. Go to [betterstack.com/uptime](https://betterstack.com/uptime)
2. Create a new monitor
3. Configure alerts (email, Slack, etc.)

---

## Step 3: Set Up Log Aggregation

### Option 1: Vercel Logs (Built-in)

Vercel automatically captures logs from your Next.js app:

1. Go to your Vercel project
2. Click "Logs" tab
3. View real-time logs
4. Filter by severity, function, etc.

**Limitations**: 
- Limited retention (7 days on free tier)
- No advanced search
- No alerting

### Option 2: Better Stack Logs

1. Go to [betterstack.com/logs](https://betterstack.com/logs)
2. Create a new source
3. Get the source token
4. Configure log shipping:

```typescript
// apps/web/src/lib/logger.ts
import { createLogger, transports } from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

export const logger = createLogger({
  level: 'info',
  transports: [
    new LogtailTransport(logtail),
    new transports.Console(),
  ],
});
```

---

## Step 4: Set Up Performance Monitoring

### Vercel Analytics (Recommended)

1. Go to your Vercel project settings
2. Enable "Analytics"
3. Add to `apps/web/src/app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Metrics Tracked**:
- Page views
- Unique visitors
- Core Web Vitals (LCP, FID, CLS)
- Time to First Byte (TTFB)

---

## Step 5: Set Up Alerts

### Sentry Alerts

1. Go to **Alerts** in Sentry dashboard
2. Create alert rules:
   - **High error rate**: > 10 errors in 5 minutes
   - **New issue**: First occurrence of an error
   - **Regression**: Error reappears after being resolved

### UptimeRobot Alerts

1. Configure alert contacts (email, SMS, Slack)
2. Set alert thresholds:
   - Down after 2 failed checks
   - Slow response time (> 5 seconds)

### Custom Alerts (Optional)

Create a health check endpoint:

```typescript
// apps/web/src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@sts/database';
import { Redis } from 'ioredis';

export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    await redis.quit();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Monitor Key Metrics

### Application Metrics

**Web App**:
- Response time (target: < 500ms)
- Error rate (target: < 1%)
- Uptime (target: > 99.9%)
- Core Web Vitals (all "Good")

**Worker**:
- Job processing time (target: < 30 seconds)
- Job failure rate (target: < 5%)
- Queue length (target: < 100)
- Worker uptime (target: > 99%)

### Business Metrics

- New user signups
- Purchase conversion rate
- Average order value
- Customer lifetime value
- Churn rate

---

## Step 7: Set Up Dashboards

### Sentry Dashboard

Create custom dashboards for:
- Error trends over time
- Top errors by volume
- Errors by release
- Performance metrics

### Vercel Analytics Dashboard

Monitor:
- Traffic trends
- Geographic distribution
- Device breakdown
- Top pages

### Custom Dashboard (Optional)

Use Grafana or Datadog for advanced monitoring:

1. Set up Grafana Cloud (free tier)
2. Connect to your data sources
3. Create custom dashboards
4. Set up alerts

---

## Troubleshooting

### Sentry Not Capturing Errors

**Solutions**:
1. Verify `SENTRY_DSN` is set correctly
2. Check Sentry is initialized before errors occur
3. Verify source maps are uploaded (for Next.js)
4. Check network requests in browser DevTools

### High Error Volume

**Solutions**:
1. Review error details in Sentry
2. Check if errors are related to a specific release
3. Roll back deployment if critical
4. Fix errors and deploy patch

### False Positive Alerts

**Solutions**:
1. Adjust alert thresholds
2. Add filters to exclude known issues
3. Use alert grouping to reduce noise

---

## Best Practices

### Error Handling

1. **Catch errors gracefully**: Use try-catch blocks
2. **Log context**: Include user ID, request ID, etc.
3. **Don't expose sensitive data**: Sanitize error messages
4. **Group similar errors**: Use Sentry fingerprinting
5. **Set up error boundaries**: Catch React errors

### Performance Monitoring

1. **Set performance budgets**: Define acceptable thresholds
2. **Monitor Core Web Vitals**: LCP, FID, CLS
3. **Track slow queries**: Log database queries > 1 second
4. **Optimize images**: Use Next.js Image component
5. **Enable caching**: Use CDN and browser caching

### Alerting

1. **Alert on actionable issues**: Don't alert on noise
2. **Set appropriate thresholds**: Avoid alert fatigue
3. **Use escalation policies**: Alert team if unresolved
4. **Document runbooks**: How to respond to alerts
5. **Review alerts regularly**: Adjust as needed

---

## Monitoring Checklist

### Pre-Launch

- [ ] Sentry configured for web app
- [ ] Sentry configured for worker
- [ ] Uptime monitoring set up
- [ ] Health check endpoint created
- [ ] Performance monitoring enabled
- [ ] Alerts configured
- [ ] Test alerts (trigger intentional error)

### Post-Launch

- [ ] Monitor error rate daily
- [ ] Review performance metrics weekly
- [ ] Check uptime reports monthly
- [ ] Analyze user feedback
- [ ] Optimize slow endpoints
- [ ] Update alert thresholds as needed

---

## Cost Estimation

### Free Tier (Suitable for MVP)

- **Sentry**: Free (5,000 errors/month)
- **UptimeRobot**: Free (50 monitors, 5-min intervals)
- **Vercel Analytics**: Free (basic metrics)
- **Total**: $0/month

### Production (1000 users)

- **Sentry**: $26/month (Team plan, 50k errors/month)
- **Better Stack**: $20/month (Uptime + Logs)
- **Vercel Analytics**: $10/month (Pro features)
- **Total**: $56/month

---

## Next Steps

After setting up monitoring:

1. ✅ Create Sentry account and get DSN
2. ✅ Install Sentry in web app and worker
3. ✅ Set up uptime monitoring
4. ✅ Configure alerts
5. ✅ Create health check endpoint
6. ✅ Test error tracking (trigger test error)
7. ✅ Set up performance monitoring
8. ✅ Create monitoring dashboard

---

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [UptimeRobot Guide](https://uptimerobot.com/help/)
- [Better Stack Docs](https://betterstack.com/docs)
- [Core Web Vitals](https://web.dev/vitals/)

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
