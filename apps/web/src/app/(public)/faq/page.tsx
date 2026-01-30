import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "FAQ | STS Strategies",
  description:
    "Frequently asked questions about STS Strategies trading systems, TradingView access, payments, and more.",
};

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is STS Strategies?",
        a: "STS Strategies provides professional trading strategies for NQ/NASDAQ futures, delivered through TradingView's invite-only script system. Our strategies are designed for 5-minute intraday trading and include clear entry/exit rules with risk management.",
      },
      {
        q: "Who are these strategies for?",
        a: "Our strategies are designed for retail and discretionary traders who want a systematic approach to trading NQ/NASDAQ futures. You should have a basic understanding of trading, TradingView, and risk management before using our strategies.",
      },
      {
        q: "Do you provide trading signals or manage accounts?",
        a: "No. We provide educational and analytical tools only. We do not provide personalized investment advice, trading signals, or account management services. You are solely responsible for your trading decisions.",
      },
    ],
  },
  {
    category: "Access & Delivery",
    questions: [
      {
        q: "How do I access the strategies after purchase?",
        a: "After purchase, you'll receive instant access to the strategy on TradingView. The strategy will appear in your TradingView account under 'Invite-Only Scripts' within minutes. Make sure you've entered your correct TradingView username during signup.",
      },
      {
        q: "What TradingView subscription do I need?",
        a: "Our strategies work with any TradingView plan, including the free plan. However, for the best trading experience with NQ futures, we recommend at least a Pro plan for real-time data and multiple charts.",
      },
      {
        q: "Can I use the strategies on multiple TradingView accounts?",
        a: "No. Each purchase grants access to one TradingView account. The username you provide during signup is the account that will receive access. You cannot transfer access to another account.",
      },
      {
        q: "What if I entered the wrong TradingView username?",
        a: "Contact our support team immediately if you entered an incorrect username. We can update it once, but please double-check your username during signup to avoid delays.",
      },
    ],
  },
  {
    category: "Pricing & Payments",
    questions: [
      {
        q: "What is the pricing model?",
        a: "We offer lifetime access with a one-time payment of $99 per strategy. There are no subscriptions, recurring fees, or hidden charges. You pay once and get access forever, including all future updates.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor, Stripe. We do not accept cryptocurrency or PayPal at this time.",
      },
      {
        q: "Do you offer refunds?",
        a: "No. All sales are final and non-refundable. Due to the digital nature of our products and instant delivery, we cannot offer refunds. Please review all strategy information and our terms of service before purchasing.",
      },
      {
        q: "Do you offer bundle discounts?",
        a: "Currently, each strategy is sold individually at the same price. We may offer bundles in the future. Subscribe to our newsletter to be notified of any promotions.",
      },
    ],
  },
  {
    category: "Technical",
    questions: [
      {
        q: "How do I apply the strategy to my chart?",
        a: "In TradingView, go to the Indicators tab, select 'Invite-Only Scripts', and find the strategy. Click to add it to your chart. You can then customize the settings in the strategy's input panel.",
      },
      {
        q: "Can I modify the strategy code?",
        a: "No. Our strategies are provided as protected, invite-only scripts. You cannot view or modify the underlying Pine Script code. You can only adjust the input parameters provided in the strategy settings.",
      },
      {
        q: "Will the strategy work on other markets besides NQ?",
        a: "Our strategies are specifically optimized for NQ/NASDAQ futures on 5-minute charts. While you can technically apply them to other instruments, we do not recommend it and cannot guarantee performance.",
      },
      {
        q: "Do the strategies generate alerts?",
        a: "Yes. All our strategies support TradingView alerts. You can set up alerts for entry signals, exit signals, or any other conditions defined in the strategy.",
      },
    ],
  },
  {
    category: "Support",
    questions: [
      {
        q: "How do I get help if I have issues?",
        a: "Log into your dashboard and create a support ticket. Our team typically responds within 24-48 hours. For urgent access issues, please include your TradingView username and purchase confirmation.",
      },
      {
        q: "Do you provide strategy tutorials or training?",
        a: "Basic documentation is included with each strategy. We do not provide personalized trading education, coaching, or live training sessions at this time.",
      },
      {
        q: "What if access provisioning fails?",
        a: "If you don't receive access within 24 hours, please verify your TradingView username is correct and contact our support team. We'll investigate and resolve the issue as quickly as possible.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find answers to common questions about our trading strategies,
            access, and support.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-semibold mb-4">{section.category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {section.questions.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${section.category}-${index}`}
                  >
                    <AccordionTrigger className="text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center p-8 rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold">Still have questions?</h3>
          <p className="mt-2 text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Contact our support team.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
