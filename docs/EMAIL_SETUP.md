# Email Service Setup Guide (Resend)

This guide covers setting up Resend for transactional emails on the STS Strategies platform.

---

## Overview

The platform uses Resend for sending:
- **Magic link authentication emails** (passwordless login)
- **Purchase confirmation emails** (after successful payment)
- **TradingView access emails** (credentials and instructions)
- **Admin notifications** (new purchases, errors)

---

## Step 1: Create Resend Account

### 1.1 Sign Up

1. Go to [resend.com](https://resend.com)
2. Click "Get Started"
3. Sign up with your email or GitHub account
4. Verify your email address

### 1.2 Choose Plan

**Free Tier** (Suitable for MVP):
- 3,000 emails/month
- 100 emails/day
- 1 custom domain
- Email support

**Pro Plan** ($20/month):
- 50,000 emails/month
- No daily limit
- Unlimited custom domains
- Priority support

**Recommendation**: Start with free tier, upgrade when you hit limits.

---

## Step 2: Verify Your Domain

### 2.1 Add Domain

1. Go to **Domains** in Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Click "Add"

### 2.2 Add DNS Records

Resend will provide DNS records to add. You'll need to add these to your domain registrar:

#### SPF Record (TXT)

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM Record (TXT)

```
Type: TXT
Name: resend._domainkey
Value: [Provided by Resend - unique per domain]
TTL: 3600
```

#### DMARC Record (TXT)

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

### 2.3 Verify Domain

1. After adding DNS records, wait 5-10 minutes for propagation
2. Click "Verify" in Resend dashboard
3. If verification fails, wait longer (DNS can take up to 48 hours)
4. Check DNS propagation: [dnschecker.org](https://dnschecker.org)

---

## Step 3: Get API Key

### 3.1 Create API Key

1. Go to **API Keys** in Resend dashboard
2. Click "Create API Key"
3. Fill in details:
   - **Name**: `STS Strategies Production`
   - **Permission**: `Full access` (or `Sending access` for production)
   - **Domain**: Select your verified domain

4. Click "Create"
5. **Copy the API key** (starts with `re_...`)

**⚠️ Important**: Save this key securely. You won't be able to see it again.

### 3.2 Add to Environment Variables

Add to your `.env.production`:

```
RESEND_API_KEY="re_YOUR_API_KEY_HERE"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

---

## Step 4: Configure Email Templates

The platform uses React Email for beautiful, responsive email templates.

### 4.1 Email Templates Location

**Path**: `apps/worker/src/emails/`

**Templates**:
1. `magic-link.tsx` - Authentication email
2. `purchase-confirmation.tsx` - Purchase success email
3. `tradingview-access.tsx` - TradingView credentials email

### 4.2 Customize Templates

Edit the templates to match your branding:

```typescript
// apps/worker/src/emails/purchase-confirmation.tsx

export function PurchaseConfirmationEmail({ userName, purchaseDate }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to STS Strategies!</Heading>
          <Text style={text}>
            Hi {userName},
          </Text>
          <Text style={text}>
            Thank you for your purchase! You now have lifetime access to all 6 professional trading strategies.
          </Text>
          {/* ... more content ... */}
        </Container>
      </Body>
    </Html>
  );
}
```

### 4.3 Preview Templates

Preview templates locally:

```bash
cd apps/worker
pnpm email:dev
```

Open [localhost:3001](http://localhost:3001) to see all email templates.

---

## Step 5: Test Email Delivery

### 5.1 Send Test Email

Use Resend dashboard to send a test email:

1. Go to **Emails** → **Send Test Email**
2. Fill in:
   - **From**: `noreply@yourdomain.com`
   - **To**: Your email address
   - **Subject**: `Test Email`
   - **HTML**: `<p>This is a test email</p>`

3. Click "Send"
4. Check your inbox (and spam folder)

### 5.2 Test Magic Link

Test the authentication flow:

1. Go to your deployed site: `https://yourdomain.com/login`
2. Enter your email address
3. Click "Send Magic Link"
4. Check your email for the magic link
5. Click the link to log in

### 5.3 Test Purchase Flow

Test the complete purchase flow:

1. Complete a test purchase (use Stripe test mode)
2. Check for confirmation email
3. Wait for TradingView access email (processed by worker)
4. Verify all emails are received

---

## Step 6: Monitor Email Delivery

### 6.1 Resend Dashboard

Monitor emails in real-time:

- **Emails**: View all sent emails
- **Logs**: View delivery status and errors
- **Analytics**: Track open rates and click rates (Pro plan)
- **Bounces**: Monitor bounced emails

### 6.2 Set Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable alerts for:
   - Bounce rate threshold exceeded
   - Spam complaint threshold exceeded
   - Domain verification expiring

---

## Email Implementation

The platform already has email sending implemented. Here's how it works:

### Email Service

**File**: `apps/worker/src/services/email.service.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    react,
  });
}
```

### Email Types

1. **Magic Link Email**
   - Sent by: NextAuth (web app)
   - Trigger: User clicks "Send Magic Link"
   - Template: Built-in NextAuth template

2. **Purchase Confirmation Email**
   - Sent by: Worker service
   - Trigger: `checkout.session.completed` webhook
   - Template: `purchase-confirmation.tsx`

3. **TradingView Access Email**
   - Sent by: Worker service
   - Trigger: After TradingView provisioning completes
   - Template: `tradingview-access.tsx`

---

## Troubleshooting

### Emails Not Sending

**Symptom**: Emails are not being sent

**Solutions**:
1. Verify `RESEND_API_KEY` is set correctly
2. Verify `RESEND_FROM_EMAIL` matches verified domain
3. Check Resend dashboard for errors
4. Check application logs for errors
5. Verify domain is verified in Resend

### Emails Going to Spam

**Symptom**: Emails are delivered to spam folder

**Solutions**:
1. Verify SPF, DKIM, and DMARC records are set correctly
2. Use a custom domain (not @gmail.com or @yahoo.com)
3. Avoid spam trigger words in subject/body
4. Include unsubscribe link (required by law)
5. Warm up your domain (start with low volume)

### Domain Verification Failing

**Symptom**: Domain verification fails in Resend

**Solutions**:
1. Wait longer (DNS can take up to 48 hours)
2. Check DNS records are added correctly
3. Use [dnschecker.org](https://dnschecker.org) to verify propagation
4. Remove any conflicting DNS records
5. Contact Resend support if still failing

### Magic Link Not Working

**Symptom**: Magic link email not received or link doesn't work

**Solutions**:
1. Check spam folder
2. Verify `NEXTAUTH_URL` is set correctly
3. Verify `NEXTAUTH_SECRET` is set
4. Check application logs for errors
5. Test with a different email address

---

## Best Practices

### Email Deliverability

1. **Use a custom domain**: Don't send from @gmail.com
2. **Verify SPF, DKIM, DMARC**: Required for good deliverability
3. **Warm up your domain**: Start with low volume, increase gradually
4. **Monitor bounce rates**: Keep below 5%
5. **Monitor spam complaints**: Keep below 0.1%
6. **Include unsubscribe link**: Required by CAN-SPAM Act
7. **Use clear subject lines**: Avoid spam trigger words

### Email Content

1. **Keep it short**: Get to the point quickly
2. **Use clear CTAs**: Make it obvious what to do next
3. **Mobile-friendly**: 50%+ of emails are opened on mobile
4. **Include branding**: Logo, colors, consistent design
5. **Test before sending**: Always preview and test

### Security

1. **Never send passwords**: Use magic links instead
2. **Expire magic links**: Set short expiration (15 minutes)
3. **Rate limit**: Prevent email bombing
4. **Validate email addresses**: Check format before sending
5. **Log all emails**: Track delivery for debugging

---

## Email Templates

### Magic Link Email

**Subject**: `Sign in to STS Strategies`

**Content**:
```
Hi there,

Click the link below to sign in to your STS Strategies account:

[Sign In Button]

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

---
STS Strategies
Professional NQ/NASDAQ Trading Strategies
```

### Purchase Confirmation Email

**Subject**: `Welcome to STS Strategies! 🎉`

**Content**:
```
Hi [Name],

Thank you for your purchase! You now have lifetime access to all 6 professional NQ/NASDAQ trading strategies.

What's Next?

1. We're setting up your TradingView access (takes 5-10 minutes)
2. You'll receive another email with your credentials
3. Add strategies to your TradingView charts
4. Start trading with a systematic edge

Order Details:
- Product: STS Strategies - Lifetime Access
- Price: $99.00
- Date: [Purchase Date]

Questions? Reply to this email or visit our FAQ page.

---
STS Strategies
Professional NQ/NASDAQ Trading Strategies
```

### TradingView Access Email

**Subject**: `Your TradingView Access is Ready! 🚀`

**Content**:
```
Hi [Name],

Great news! Your TradingView access is now ready.

Your Credentials:
- Username: [Username]
- Password: [Password]

How to Get Started:

1. Log in to TradingView: https://www.tradingview.com
2. Go to Indicators → My Scripts
3. You'll see all 6 strategies available
4. Add them to your charts and start trading!

Strategy List:
- NQ Momentum Alpha
- NQ Trend Rider
- NQ Breakout Pro
- NQ Mean Reversion
- NQ Power Hour
- NQ Overnight Edge

Need help? Check out our getting started guide: [Link]

---
STS Strategies
Professional NQ/NASDAQ Trading Strategies
```

---

## Cost Estimation

### Free Tier (Suitable for MVP)

- **3,000 emails/month**: ~100 users/month
- **100 emails/day**: Sufficient for low traffic
- **Cost**: $0

### Pro Plan ($20/month)

- **50,000 emails/month**: ~1,600 users/month
- **No daily limit**: Handle traffic spikes
- **Cost**: $20/month

### Scale Plan ($80/month)

- **1,000,000 emails/month**: ~33,000 users/month
- **Dedicated IP**: Better deliverability
- **Cost**: $80/month

**Recommendation**: Start with free tier, upgrade to Pro when you hit 100 users/month.

---

## Next Steps

After setting up Resend:

1. ✅ Create Resend account
2. ✅ Verify your domain (add DNS records)
3. ✅ Get API key
4. ✅ Update `.env.production` with API key and from email
5. ✅ Test email delivery
6. ✅ Customize email templates (optional)
7. ✅ Set up monitoring alerts

---

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Email Deliverability Guide](https://resend.com/docs/knowledge-base/deliverability)
- [SPF/DKIM/DMARC Guide](https://resend.com/docs/knowledge-base/spf-dkim-dmarc)

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
