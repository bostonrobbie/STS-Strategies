# STS Strategies Compliance Posture

## What We Are

STS Strategies is a **software provider** that sells access to proprietary TradingView Pine Script indicators (trading strategies) for educational and analytical purposes.

### Business Model
- One-time payment ($99) for lifetime access to 6 trading strategies
- Strategies are delivered as TradingView invite-only indicators
- No ongoing subscription or recurring charges
- All sales are final (no refunds)

### What We Provide
- Access to pre-built trading strategy indicators on TradingView
- Historical backtest results and performance data (hypothetical)
- Educational content about strategy methodology
- Email-based customer support

---

## What We Are NOT

### We Are NOT:
1. **Investment Advisors** - We do not provide personalized investment advice
2. **Broker-Dealers** - We do not execute trades or hold customer funds
3. **Commodity Trading Advisors (CTA)** - We do not manage accounts or provide trading recommendations
4. **Signal Service** - We do not send trade alerts or entry/exit notifications
5. **Managed Account Service** - Users maintain full control; we never trade on their behalf
6. **Automated Trading System** - Our strategies display signals only; they do not auto-execute

### We Do NOT:
- Execute any trades on behalf of customers
- Manage customer trading accounts
- Hold any customer funds or assets
- Provide personalized trading recommendations
- Guarantee any specific trading results or profits
- Offer refunds under any circumstances

---

## Required Disclaimers

### 1. CFTC Rule 4.41 - Hypothetical Performance Disclaimer

**REQUIRED ON:**
- Homepage (footer)
- Pricing page (before purchase button)
- Checkout page (during checkout flow)
- Strategy detail pages (prominent placement)
- Disclaimer page (full text)
- Purchase confirmation emails
- Dashboard (strategy cards)

**Full Text:**
```
HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN INHERENT LIMITATIONS.
UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS DO NOT REPRESENT ACTUAL TRADING.
ALSO, SINCE THE TRADES HAVE NOT ACTUALLY BEEN EXECUTED, THE RESULTS MAY HAVE UNDER-OR-OVER
COMPENSATED FOR THE IMPACT, IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY.
SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT THAT THEY ARE DESIGNED
WITH THE BENEFIT OF HINDSIGHT. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS
LIKELY TO ACHIEVE PROFITS OR LOSSES SIMILAR TO THOSE SHOWN.
```

### 2. General Risk Disclaimer

**REQUIRED ON:**
- Homepage
- Pricing page
- Strategy pages
- Checkout confirmation
- Terms of Service

**Text:**
```
Trading futures involves substantial risk of loss and is not suitable for all investors.
Past performance is not necessarily indicative of future results. You should carefully
consider whether trading is suitable for you in light of your circumstances, knowledge,
and financial resources.
```

### 3. No Investment Advice Disclaimer

**REQUIRED ON:**
- Homepage footer
- All strategy pages
- FAQ page
- Terms of Service

**Text:**
```
The trading strategies provided by STS Strategies are for educational and informational
purposes only. They do not constitute investment advice, financial advice, trading advice,
or any other type of advice. You should perform your own research and consult with a
licensed financial advisor before making any investment decisions.
```

### 4. No Refund Policy

**REQUIRED ON:**
- Pricing page (near purchase button)
- Checkout page (pre-purchase)
- Onboarding (terms acceptance)
- Terms of Service
- FAQ page

**Text:**
```
All sales are final. We do not offer refunds under any circumstances. By completing
your purchase, you acknowledge and accept this policy.
```

---

## Forbidden Claims

### Never Claim:
1. **Guaranteed profits** or specific returns
2. **"Get rich quick"** or similar promises
3. **Risk-free trading** or no possibility of loss
4. **Specific dollar amounts** users will make
5. **"Best"** or **"#1"** trading system (superlatives)
6. **Endorsement** by financial regulators
7. **Success rates** without full context and disclaimer
8. **Comparison to bank returns** or "safe" investments

### Avoid Language Like:
- "Make $X per day/week/month"
- "Quit your job"
- "Financial freedom guaranteed"
- "Can't lose"
- "Proven profits"
- "Consistent returns"
- "Works every time"
- "Beat the market guaranteed"

### Instead, Use:
- "Historical backtest results show..."
- "Hypothetical performance indicates..."
- "The strategy is designed to..."
- "Based on 15 years of data analysis..."
- "Educational tool for systematic trading"

---

## Disclaimer Placement Requirements

### Homepage (`/`)
| Location | Disclaimer Type |
|----------|-----------------|
| Hero section | General risk warning (brief) |
| Pricing preview | "All sales final" |
| Footer | Full CFTC 4.41 summary |
| Bottom section | Link to full disclaimer |

**Status:** ✅ Implemented

### Pricing Page (`/pricing`)
| Location | Disclaimer Type |
|----------|-----------------|
| Above CTA button | "All sales are final" box |
| Below features | Risk disclosure section |
| Footer | Link to full disclaimer |

**Status:** ✅ Implemented

### Strategy Detail Pages (`/strategies/[slug]`)
| Location | Disclaimer Type |
|----------|-----------------|
| Performance section | Full CFTC 4.41 box (amber highlighted) |
| Sidebar (if stats shown) | "Hypothetical results" note |
| Bottom | Link to full disclaimer |

**Status:** ✅ Implemented

### Checkout Flow
| Location | Disclaimer Type |
|----------|-----------------|
| Onboarding (terms checkbox) | Link to Terms + Disclaimer |
| Pre-redirect | Implicit via pricing page |
| Stripe checkout | Metadata only (no custom UI) |

**Status:** ✅ Implemented

### Emails
| Email Type | Disclaimer Required |
|------------|---------------------|
| Welcome | Brief risk note |
| Purchase confirmation | Full CFTC summary |
| Access granted | "Educational purposes" note |
| Marketing (if any) | Full risk disclosure |

**Status:** ⚠️ Needs verification in email templates

### User Dashboard
| Location | Disclaimer Type |
|----------|-----------------|
| Strategy cards | None required (user already agreed) |
| Settings | None required |
| Support | None required |

**Status:** ✅ Acceptable

---

## Compliance Checklist

### Pre-Launch
- [x] CFTC Rule 4.41 disclaimer on all performance claims
- [x] General risk warning on homepage
- [x] No refund policy clearly stated
- [x] Terms of Service includes all disclaimers
- [x] Privacy Policy exists
- [x] Risk Disclaimer dedicated page exists
- [x] Onboarding requires disclaimer acknowledgment
- [ ] Email templates include appropriate disclaimers
- [ ] No forbidden claims in any copy
- [ ] Review all marketing copy for compliance

### Ongoing
- [ ] Regular review of all disclaimers (quarterly)
- [ ] Monitor customer communications for compliance
- [ ] Update disclaimer dates when changed
- [ ] Document any regulatory guidance received

---

## Legal Review Notes

**This document is for internal guidance only and does not constitute legal advice.**

Before launch, consider:
1. Review by attorney familiar with CFTC regulations
2. Review Terms of Service for completeness
3. Confirm privacy policy meets requirements
4. Verify no claims violate FTC guidelines
5. Check state-specific requirements (if any)

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01 | 1.0 | Initial compliance posture document |
