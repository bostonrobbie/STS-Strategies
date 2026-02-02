import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set environment
  environment: process.env.NODE_ENV,
  
  // Adjust sample rate for production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Enable performance monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    
    // Remove sensitive query params
    if (event.request?.query_string) {
      const params = new URLSearchParams(event.request.query_string);
      if (params.has("token")) params.delete("token");
      if (params.has("key")) params.delete("key");
      event.request.query_string = params.toString();
    }
    
    return event;
  },
});
