import Link from "next/link";

const footerLinks = {
  product: [
    { href: "/strategies", label: "Strategies" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
  ],
  support: [
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "Help Center" },
  ],
  legal: [
    { href: "/disclaimer", label: "Risk Disclaimer" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              STS Strategies
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Professional NQ/NASDAQ trading strategies built on 15 years of
              historical data. Add a systematic edge to your trading.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Risk Disclaimer */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
            <strong>Risk Disclaimer:</strong> Trading futures involves
            substantial risk of loss and is not suitable for all investors. Past
            performance is not indicative of future results. The strategies
            provided are for educational and analytical purposes only. They do
            not constitute investment advice or recommendations to buy or sell
            any financial instruments. You are solely responsible for your
            trading decisions. By using this service, you acknowledge that you
            understand the risks involved and accept full responsibility for any
            losses incurred.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} STS Strategies. All rights
            reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            All sales are final. No refunds.
          </p>
        </div>
      </div>
    </footer>
  );
}
