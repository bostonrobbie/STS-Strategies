// Worker configuration
// Loads and validates environment variables

export const config = {
  // Redis
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  },

  // TradingView Access API
  tradingView: {
    apiUrl: process.env.TV_ACCESS_API_URL || "",
    sessionId: process.env.TV_SESSION_ID || "",
    signature: process.env.TV_SIGNATURE || "",
  },

  // Email
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "noreply@example.com",
  },

  // Admin
  adminEmail: process.env.ADMIN_EMAIL || "",

  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME || "STS Strategies",

  // Worker settings
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    maxRetries: parseInt(process.env.WORKER_MAX_RETRIES || "5", 10),
  },
} as const;

export function validateConfig(): void {
  const required: Array<[string, string]> = [
    // All config is optional for staging
    // UPSTASH_REDIS_REST_URL and RESEND_API_KEY will use fallbacks
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // TradingView config is optional - manual provisioning fallback
  if (!config.tradingView.apiUrl) {
    console.warn("⚠️  TV_ACCESS_API_URL not set - TradingView auto-provisioning disabled");
  }
}
