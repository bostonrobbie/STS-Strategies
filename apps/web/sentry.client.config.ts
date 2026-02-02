import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set environment
  environment: process.env.NODE_ENV,
  
  // Adjust sample rate for production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [],
  
  // Filter out known errors
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Filter out network errors that are user-side
    if (error && typeof error === "object" && "message" in error) {
      const message = String(error.message);
      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed")
      ) {
        return null;
      }
    }
    
    return event;
  },
});
