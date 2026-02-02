# Google Search Console Setup Guide

**Date**: February 2, 2026  
**Purpose**: Complete guide for setting up Google Search Console and optimizing for search visibility

---

## Overview

Google Search Console is essential for:
- Submitting your sitemap for faster indexing
- Monitoring search performance
- Identifying and fixing crawl errors
- Understanding which keywords drive traffic
- Improving search rankings

---

## Step 1: Add Property to Google Search Console

### **1.1 Create/Login to Google Search Console**

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Sign in with your Google account
3. Click "Add Property"

### **1.2 Choose Property Type**

**Option A: Domain Property** (Recommended)
- Verifies all subdomains and protocols (http/https)
- URL: `stsstrategies.com`
- Verification: DNS record

**Option B: URL Prefix**
- Verifies specific URL
- URL: `https://www.stsstrategies.com`
- Verification: HTML file or meta tag

**Recommendation**: Use Domain Property for complete coverage

---

## Step 2: Verify Ownership

### **Method 1: DNS Verification** (Recommended for Vercel)

1. Google will provide a TXT record
2. Add to your DNS settings:
   - **Type**: TXT
   - **Name**: @ (or leave blank)
   - **Value**: `google-site-verification=XXXXXXXXXX`
   - **TTL**: 3600

3. Wait for DNS propagation (5-30 minutes)
4. Click "Verify" in Google Search Console

### **Method 2: HTML Meta Tag** (Alternative)

1. Google provides a meta tag like:
   ```html
   <meta name="google-site-verification" content="XXXXXXXXXX" />
   ```

2. Add to `apps/web/src/app/layout.tsx`:
   ```typescript
   export const metadata: Metadata = {
     // ... existing metadata
     verification: {
       google: 'XXXXXXXXXX', // Your verification code
     },
   };
   ```

3. Deploy to production
4. Click "Verify" in Google Search Console

### **Method 3: HTML File Upload**

1. Download the HTML file from Google
2. Upload to `apps/web/public/` directory
3. Deploy to production
4. Verify the file is accessible at `https://stsstrategies.com/google-verification-file.html`
5. Click "Verify" in Google Search Console

---

## Step 3: Submit Sitemap

### **3.1 Verify Sitemap is Accessible**

1. Check that sitemap is live:
   - URL: `https://stsstrategies.com/sitemap.xml`
   - Should return XML with all URLs

2. Verify sitemap structure:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://stsstrategies.com/</loc>
       <lastmod>2026-02-02</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
     <!-- More URLs -->
   </urlset>
   ```

### **3.2 Submit to Google Search Console**

1. In Google Search Console, go to "Sitemaps" (left sidebar)
2. Enter sitemap URL: `sitemap.xml`
3. Click "Submit"
4. Status should show "Success" within a few minutes

### **3.3 Monitor Sitemap Status**

- **Discovered**: Google found the URLs
- **Crawled**: Google visited the URLs
- **Indexed**: URLs are in Google's search index

**Note**: Indexing can take 1-7 days for new sites

---

## Step 4: Submit Individual URLs for Indexing

### **4.1 Priority Pages to Submit**

Submit these URLs immediately for faster indexing:

1. Homepage: `https://stsstrategies.com/`
2. Pricing: `https://stsstrategies.com/pricing`
3. Strategies: `https://stsstrategies.com/strategies`
4. Each strategy page (6 total)

### **4.2 How to Submit**

1. In Google Search Console, go to "URL Inspection"
2. Enter the full URL
3. Click "Request Indexing"
4. Wait for confirmation (can take 1-2 minutes per URL)

**Limit**: 10 URLs per day for new properties

---

## Step 5: Optimize robots.txt

### **5.1 Verify robots.txt is Accessible**

URL: `https://stsstrategies.com/robots.txt`

Should contain:
```
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /admin
Disallow: /api/
Disallow: /dashboard

# Sitemap
Sitemap: https://stsstrategies.com/sitemap.xml
```

### **5.2 Test robots.txt**

1. In Google Search Console, go to "robots.txt Tester" (under Settings)
2. Enter URL to test (e.g., `/pricing`)
3. Verify it's allowed
4. Test blocked URLs (e.g., `/admin`) to verify they're disallowed

---

## Step 6: Set Up Core Web Vitals Monitoring

### **6.1 Enable Core Web Vitals Report**

1. In Google Search Console, go to "Core Web Vitals"
2. View mobile and desktop performance
3. Identify pages with poor performance

### **6.2 Target Metrics**

- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds
- **CLS (Cumulative Layout Shift)**: < 0.1

### **6.3 Optimization Tips**

**For LCP**:
- Optimize images (use WebP, lazy loading)
- Reduce server response time
- Eliminate render-blocking resources

**For FID**:
- Minimize JavaScript execution
- Use code splitting
- Defer non-critical JavaScript

**For CLS**:
- Set explicit dimensions for images/videos
- Avoid inserting content above existing content
- Use transform animations instead of property animations

---

## Step 7: Monitor Search Performance

### **7.1 Performance Report**

1. Go to "Performance" in Google Search Console
2. Monitor:
   - **Total Clicks**: Users clicking through to your site
   - **Total Impressions**: How often your site appears in search
   - **Average CTR**: Click-through rate
   - **Average Position**: Your ranking position

### **7.2 Key Metrics to Track**

| Metric | Target | Notes |
|--------|--------|-------|
| Impressions | Growing | More visibility in search |
| Clicks | Growing | More traffic from search |
| CTR | > 3% | Good title/description |
| Position | < 10 | First page of results |

### **7.3 Top Queries to Target**

Based on market research, these queries are valuable:

**High Intent**:
- "nq trading strategies"
- "nasdaq futures strategies"
- "tradingview nq strategies"
- "nq futures trading system"

**Medium Intent**:
- "nq day trading"
- "nasdaq futures trading"
- "systematic nq trading"

**Long Tail**:
- "best nq trading strategies for tradingview"
- "nq momentum trading strategy"
- "nasdaq futures overnight strategy"

---

## Step 8: Fix Crawl Errors

### **8.1 Monitor Coverage Report**

1. Go to "Coverage" in Google Search Console
2. Check for errors:
   - **Server error (5xx)**: Fix server issues
   - **Redirect error**: Fix redirect chains
   - **Not found (404)**: Fix broken links
   - **Blocked by robots.txt**: Unblock if needed

### **8.2 Common Issues and Fixes**

**Issue**: "Submitted URL not found (404)"  
**Fix**: Ensure URL exists and is accessible

**Issue**: "Submitted URL marked 'noindex'"  
**Fix**: Remove noindex tag from page

**Issue**: "Redirect error"  
**Fix**: Reduce redirect chains, use direct links

**Issue**: "Server error (5xx)"  
**Fix**: Check server logs, fix application errors

---

## Step 9: Enhance Search Appearance

### **9.1 Rich Results**

Verify rich results are working:

1. Go to "Rich Results" in Google Search Console
2. Check for:
   - **Product** (pricing page)
   - **FAQ** (homepage)
   - **Organization** (homepage)

3. If errors, fix structured data in code

### **9.2 Sitelinks**

Google automatically generates sitelinks for well-structured sites.

**To encourage sitelinks**:
- Clear site hierarchy
- Descriptive navigation
- Internal linking
- Consistent URL structure

### **9.3 Search Appearance Optimization**

**Title Tags** (55-60 characters):
- Homepage: "NQ Trading Strategies | Data-Driven | $99 Lifetime"
- Pricing: "Pricing - STS Strategies | $99 Lifetime Access"
- Strategies: "6 NQ Trading Strategies | TradingView Integration"

**Meta Descriptions** (150-160 characters):
- Homepage: "Six systematic NQ trading strategies tested on 15 years of data. TradingView integration. $99 one-time payment. No monthly fees."
- Pricing: "Get lifetime access to all 6 NQ trading strategies for $99. One payment, no recurring fees. Automatic TradingView integration included."

---

## Step 10: Set Up Email Notifications

### **10.1 Configure Alerts**

1. Go to "Settings" → "Users and permissions"
2. Add your email
3. Enable notifications for:
   - **Critical issues**: Server errors, security issues
   - **New issues**: Coverage errors, mobile usability
   - **Performance changes**: Significant drops in traffic

### **10.2 Weekly Email Reports**

Enable weekly email reports to track:
- Search performance trends
- New coverage issues
- Core Web Vitals changes

---

## Step 11: Link Google Analytics

### **11.1 Connect Accounts**

1. In Google Search Console, go to "Settings"
2. Click "Associate with Google Analytics"
3. Select your Google Analytics property
4. Confirm association

### **11.2 Benefits**

- See search data in Google Analytics
- Correlate search performance with on-site behavior
- Better understanding of user journey

---

## Step 12: Monitor Mobile Usability

### **12.1 Mobile Usability Report**

1. Go to "Mobile Usability" in Google Search Console
2. Check for errors:
   - Text too small to read
   - Clickable elements too close
   - Content wider than screen
   - Viewport not set

### **12.2 Test Mobile Experience**

1. Use Google's Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
2. Enter your URL
3. Fix any issues identified

---

## Ongoing Maintenance

### **Weekly Tasks**

- [ ] Review performance report
- [ ] Check for new coverage errors
- [ ] Monitor Core Web Vitals
- [ ] Review top queries

### **Monthly Tasks**

- [ ] Analyze search trends
- [ ] Optimize underperforming pages
- [ ] Update content based on search queries
- [ ] Check for manual actions

### **Quarterly Tasks**

- [ ] Comprehensive SEO audit
- [ ] Update structured data
- [ ] Refresh meta descriptions
- [ ] Analyze competitor rankings

---

## Expected Timeline

### **Week 1**

- Property verified
- Sitemap submitted
- Initial crawling begins

### **Week 2-4**

- Pages start appearing in search
- Initial rankings established
- Core Web Vitals data available

### **Month 2-3**

- Rankings stabilize
- Search traffic grows
- Optimization opportunities identified

### **Month 4+**

- Established search presence
- Consistent traffic growth
- Ongoing optimization

---

## Key Performance Indicators

### **Month 1 Targets**

- 100+ impressions/day
- 5+ clicks/day
- Average position < 30

### **Month 3 Targets**

- 500+ impressions/day
- 25+ clicks/day
- Average position < 20

### **Month 6 Targets**

- 1,000+ impressions/day
- 50+ clicks/day
- Average position < 15

---

## Troubleshooting

### **Problem**: "Site not indexed after 2 weeks"

**Solutions**:
1. Verify sitemap is submitted correctly
2. Check robots.txt isn't blocking Googlebot
3. Ensure no noindex tags on pages
4. Request indexing for individual URLs
5. Check for manual actions in Search Console

### **Problem**: "Low click-through rate (< 1%)"

**Solutions**:
1. Improve title tags (more compelling)
2. Enhance meta descriptions (include benefits)
3. Add structured data for rich results
4. Target more specific keywords

### **Problem**: "High impressions, low clicks"

**Solutions**:
1. Rewrite meta descriptions to be more compelling
2. Ensure title tags match search intent
3. Add schema markup for rich snippets
4. Improve page content to match user expectations

---

## Resources

- [Google Search Console Help](https://support.google.com/webmasters/)
- [Google Search Central Blog](https://developers.google.com/search/blog)
- [SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Structured Data Testing Tool](https://search.google.com/test/rich-results)

---

## Conclusion

Setting up Google Search Console is critical for:
1. Getting indexed quickly
2. Understanding search performance
3. Identifying and fixing issues
4. Optimizing for better rankings

Follow this guide step-by-step to ensure your site is properly configured for maximum search visibility.

**Next Steps**: Complete verification, submit sitemap, and monitor performance weekly.
