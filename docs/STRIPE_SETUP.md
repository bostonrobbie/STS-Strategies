# Stripe Setup Guide

This guide covers setting up Stripe for payment processing on the STS Strategies platform.

---

## Overview

The platform uses Stripe for:
- **One-time payments** ($99 lifetime access)
- **Checkout sessions** (hosted payment page)
- **Webhooks** (automated fulfillment)
- **Customer management** (tracking purchases)

---

## Step 1: Switch to Live Mode

### 1.1 Access Stripe Dashboard

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in to your account
3. Toggle from "Test mode" to "Live mode" (top right)

### 1.2 Complete Account Setup

Before going live, complete these steps:

- ✅ Verify your business information
- ✅ Add bank account for payouts
- ✅ Verify your identity (required for live payments)
- ✅ Set up tax settings (if applicable)
- ✅ Review and accept Stripe's terms

---

## Step 2: Create Product & Price

### 2.1 Create Product

1. Go to **Products** in Stripe dashboard
2. Click "Add product"
3. Fill in details:
   - **Name**: `STS Strategies - Lifetime Access`
   - **Description**: `Lifetime access to all 6 professional NQ/NASDAQ trading strategies with automatic TradingView provisioning`
   - **Image**: Upload a product image (optional)
   - **Statement descriptor**: `STS STRATEGIES` (appears on credit card statements)

4. Click "Add product"

### 2.2 Create Price

1. In the product page, click "Add another price"
2. Fill in details:
   - **Pricing model**: `Standard pricing`
   - **Price**: `$99.00 USD`
   - **Billing period**: `One time`
   - **Price description**: `Lifetime Access` (optional)

3. Click "Add price"
4. **Copy the Price ID** (starts with `price_...`)

### 2.3 Update Environment Variables

Add the Price ID to your `.env.production`:

```
STRIPE_PRICE_ID="price_YOUR_LIVE_PRICE_ID"
```

---

## Step 3: Get API Keys

### 3.1 Get Publishable Key

1. Go to **Developers** → **API keys**
2. Find "Publishable key" in Live mode
3. Copy the key (starts with `pk_live_...`)
4. Add to `.env.production`:
   ```
   STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_PUBLISHABLE_KEY"
   ```

### 3.2 Get Secret Key

1. In the same page, find "Secret key"
2. Click "Reveal live key token"
3. Copy the key (starts with `sk_live_...`)
4. Add to `.env.production`:
   ```
   STRIPE_SECRET_KEY="sk_live_YOUR_SECRET_KEY"
   ```

**⚠️ Important**: Never expose the secret key in client-side code or commit it to version control.

---

## Step 4: Set Up Webhooks

Webhooks allow Stripe to notify your application when payments are completed.

### 4.1 Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Fill in details:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
   - **Description**: `STS Strategies Production Webhook`
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.created`
     - `customer.updated`

4. Click "Add endpoint"

### 4.2 Get Webhook Signing Secret

1. Click on the newly created webhook endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)
4. Add to `.env.production`:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
   ```

### 4.3 Test Webhook

After deployment, test the webhook:

1. Go to your webhook endpoint page
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"
5. Verify the webhook is received (check logs)

---

## Step 5: Configure Checkout

The platform uses Stripe Checkout for a hosted payment experience.

### 5.1 Checkout Settings

1. Go to **Settings** → **Checkout**
2. Configure:
   - **Branding**: Upload logo and customize colors
   - **Customer emails**: Enable "Send receipt emails"
   - **Payment method types**: Enable "Card" (credit/debit cards)
   - **Billing address collection**: "Auto" (collect if required)

### 5.2 Success & Cancel URLs

The platform automatically sets these URLs:

- **Success URL**: `https://yourdomain.com/purchase/success?session_id={CHECKOUT_SESSION_ID}`
- **Cancel URL**: `https://yourdomain.com/pricing`

No additional configuration needed.

---

## Step 6: Test Payment Flow

### 6.1 Test in Test Mode First

Before going live, test the entire flow in test mode:

1. Use test API keys (`pk_test_...` and `sk_test_...`)
2. Use test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`

3. Test complete flow:
   - Click "Get Started" on homepage
   - Complete checkout
   - Verify webhook is received
   - Verify user gets access
   - Verify email is sent

### 6.2 Test in Live Mode

After switching to live mode:

1. Use a real card with a small amount (e.g., $1)
2. Complete the purchase
3. Verify webhook is received
4. Verify user gets access
5. Verify email is sent
6. **Refund the test purchase** in Stripe dashboard

---

## Step 7: Configure Tax (Optional)

If you need to collect sales tax:

### 7.1 Enable Stripe Tax

1. Go to **Settings** → **Tax**
2. Click "Enable Stripe Tax"
3. Configure tax settings:
   - **Tax calculation**: Automatic
   - **Product tax code**: `txcd_10000000` (Digital goods)
   - **Nexus**: Add states where you have nexus

### 7.2 Update Checkout Code

The platform automatically handles tax if Stripe Tax is enabled.

---

## Step 8: Set Up Fraud Prevention

### 8.1 Enable Radar

Stripe Radar is included for free and helps prevent fraud.

1. Go to **Radar** → **Rules**
2. Review default rules
3. Enable additional rules if needed:
   - Block payments from high-risk countries
   - Require 3D Secure for high-value transactions
   - Block disposable email addresses

### 8.2 Configure 3D Secure

1. Go to **Settings** → **Payment methods**
2. Under "Card payments", enable:
   - **3D Secure**: "Automatic" (recommended)
   - **Decline on AVS failure**: Optional
   - **Decline on CVC failure**: Optional

---

## Step 9: Monitor Payments

### 9.1 Stripe Dashboard

Monitor payments in real-time:

- **Payments**: View all successful payments
- **Customers**: View customer details
- **Disputes**: Handle chargebacks
- **Radar**: Monitor fraud attempts

### 9.2 Set Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable email alerts for:
   - Successful payments
   - Failed payments
   - Disputes
   - Webhook failures

---

## Webhook Implementation

The platform already has webhook handling implemented. Here's how it works:

### Webhook Endpoint

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

**Events Handled**:

1. **`checkout.session.completed`**
   - Creates/updates user in database
   - Creates purchase record
   - Queues TradingView provisioning job
   - Sends confirmation email

2. **`checkout.session.async_payment_succeeded`**
   - Handles delayed payment success (e.g., bank transfers)
   - Same actions as `checkout.session.completed`

3. **`checkout.session.async_payment_failed`**
   - Logs failed payment
   - Sends failure notification

### Webhook Security

The webhook endpoint verifies requests using:

```typescript
const signature = headers().get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**This prevents unauthorized requests** from triggering actions.

### Idempotency

The webhook handler is idempotent:

- Uses `stripeSessionId` as unique key
- Prevents duplicate processing
- Safe to retry failed webhooks

---

## Troubleshooting

### Webhook Not Received

**Symptom**: Payment succeeds but user doesn't get access

**Solutions**:
1. Check webhook endpoint is accessible: `curl https://yourdomain.com/api/webhooks/stripe`
2. Verify webhook signing secret is correct
3. Check webhook logs in Stripe dashboard
4. Check application logs for errors

### Payment Declined

**Symptom**: Card is declined during checkout

**Solutions**:
1. Verify card details are correct
2. Check if card has sufficient funds
3. Try a different card
4. Check Radar rules (may be blocking legitimate payments)

### 3D Secure Not Working

**Symptom**: 3D Secure authentication fails

**Solutions**:
1. Verify 3D Secure is enabled in settings
2. Test with a 3D Secure test card: `4000 0025 0000 3155`
3. Check browser console for errors

---

## Security Best Practices

1. **Never expose secret keys**: Only use in server-side code
2. **Verify webhook signatures**: Always validate webhook requests
3. **Use HTTPS**: Required for webhooks and API calls
4. **Rotate keys regularly**: Change API keys every 90 days
5. **Monitor for fraud**: Review Radar alerts daily
6. **Handle PCI compliance**: Use Stripe Checkout (PCI compliant)

---

## Cost & Fees

### Stripe Fees

- **Standard pricing**: 2.9% + $0.30 per successful transaction
- **International cards**: Additional 1.5%
- **Currency conversion**: Additional 1%
- **Disputes**: $15 per dispute (refunded if you win)

### Example Calculation

For a $99 purchase:
- **Transaction fee**: $99 × 2.9% + $0.30 = $3.17
- **Your payout**: $99 - $3.17 = $95.83

---

## Next Steps

After setting up Stripe:

1. ✅ Switch to live mode
2. ✅ Create product and price
3. ✅ Get API keys (publishable & secret)
4. ✅ Set up webhook endpoint
5. ✅ Test payment flow end-to-end
6. ✅ Configure fraud prevention
7. ✅ Set up monitoring alerts
8. ✅ Update `.env.production` with all keys

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Guide](https://stripe.com/docs/testing)
- [Radar Documentation](https://stripe.com/docs/radar)

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
