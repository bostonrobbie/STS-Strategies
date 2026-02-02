import * as Sentry from "@sentry/node";

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("[Sentry] SENTRY_DSN not set, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    
    // Add context for worker jobs
    beforeSend(event, hint) {
      // Add worker-specific context
      if (event.contexts) {
        event.contexts.worker = {
          type: "background_job",
          service: "sts-worker",
        };
      }
      
      return event;
    },
  });

  console.log("[Sentry] Initialized successfully");
}

export { Sentry };

// Helper to capture job errors with context
export function captureJobError(
  error: Error,
  jobData: {
    jobId?: string;
    jobName?: string;
    attemptsMade?: number;
    [key: string]: any;
  }
) {
  Sentry.captureException(error, {
    tags: {
      jobId: jobData.jobId,
      jobName: jobData.jobName,
    },
    extra: {
      jobData,
      attemptsMade: jobData.attemptsMade,
    },
  });
}
