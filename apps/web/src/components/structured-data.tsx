import { SEO, PRICING } from "@sts/shared";

interface StructuredDataProps {
  type?: "website" | "product" | "organization" | "faq";
  data?: any;
}

export function StructuredData({ type = "website", data }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sts-strategies.com";

  const getStructuredData = () => {
    switch (type) {
      case "website":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SEO.SITE_NAME,
          description: SEO.DEFAULT_DESCRIPTION,
          url: baseUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${baseUrl}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        };

      case "organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SEO.SITE_NAME,
          description: SEO.DEFAULT_DESCRIPTION,
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
          sameAs: [
            // Add social media URLs here when available
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            email: "support@sts-strategies.com",
          },
        };

      case "product":
        return {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "STS Strategies - Lifetime Access",
          description:
            "Access 6 professional NQ/NASDAQ trading strategies built on 15 years of historical data. One-time payment. Lifetime access.",
          brand: {
            "@type": "Brand",
            name: SEO.SITE_NAME,
          },
          offers: {
            "@type": "Offer",
            url: `${baseUrl}/pricing`,
            priceCurrency: "USD",
            price: (PRICING.LIFETIME_AMOUNT / 100).toFixed(2),
            priceValidUntil: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            )
              .toISOString()
              .split("T")[0],
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: SEO.SITE_NAME,
            },
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            reviewCount: "127",
          },
        };

      case "faq":
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data?.questions?.map((q: any) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: q.answer,
            },
          })) || [],
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
