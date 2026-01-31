import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { StructuredData } from "@/components/structured-data";
import { SEO } from "@sts/shared";

const inter = Inter({ subsets: ["latin"] });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sts-strategies.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: SEO.DEFAULT_TITLE,
    template: `%s | ${SEO.SITE_NAME}`,
  },
  description: SEO.DEFAULT_DESCRIPTION,
  keywords: [
    "trading strategies",
    "NQ trading",
    "NASDAQ futures",
    "NQ futures trading",
    "TradingView strategies",
    "TradingView indicators",
    "algorithmic trading",
    "systematic trading",
    "Pine Script strategies",
    "trading signals",
    "day trading strategies",
    "futures trading system",
    "backtested trading strategies",
    "professional trading strategies",
    "NQ momentum strategy",
    "NQ trend following",
  ],
  authors: [{ name: SEO.SITE_NAME }],
  creator: SEO.SITE_NAME,
  publisher: SEO.SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: SEO.SITE_NAME,
    title: SEO.DEFAULT_TITLE,
    description: SEO.DEFAULT_DESCRIPTION,
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: SEO.SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.DEFAULT_TITLE,
    description: SEO.DEFAULT_DESCRIPTION,
    images: [`${baseUrl}/og-image.png`],
    creator: "@stsstrategies",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
    // Add other verification codes as needed
  },
  alternates: {
    canonical: baseUrl,
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData type="website" />
        <StructuredData type="organization" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
