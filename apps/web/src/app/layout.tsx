import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SEO } from "@sts/shared";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: SEO.DEFAULT_TITLE,
    template: `%s | ${SEO.SITE_NAME}`,
  },
  description: SEO.DEFAULT_DESCRIPTION,
  keywords: [
    "trading strategies",
    "NQ trading",
    "NASDAQ futures",
    "TradingView indicators",
    "algorithmic trading",
    "systematic trading",
    "Pine Script",
    "trading signals",
  ],
  authors: [{ name: SEO.SITE_NAME }],
  creator: SEO.SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SEO.SITE_NAME,
    title: SEO.DEFAULT_TITLE,
    description: SEO.DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.DEFAULT_TITLE,
    description: SEO.DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
