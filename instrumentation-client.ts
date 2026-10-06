import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry-options";

/**
 * Browser error reporting. The feedback integration backs the "Send feedback"
 * control in the header and footer, so a report from a visitor lands in the
 * same Sentry project as the exceptions from the code.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const shared = sharedSentryOptions();

if (dsn) {
  Sentry.init({
    dsn,
    ...shared,
    // Requests go through our own tunnel route (next.config.ts). A feedback
    // report with a screenshot is sent as a raw ArrayBuffer with no
    // Content-Type, which leaves the tunnel with an empty body and the submit
    // failing silently. See getsentry/sentry-javascript#16112.
    transportOptions: { headers: { "content-type": "application/x-sentry-envelope" } },
    integrations: [
      ...shared.integrations,
      Sentry.feedbackIntegration({
        colorScheme: "system",
        autoInject: false,
        showBranding: false,
        formTitle: "Send feedback",
        submitButtonLabel: "Send feedback",
        messagePlaceholder: "Something broken, unclear or missing? Tell us.",
        successMessageText: "Thanks, that has gone straight to us.",
      }),
    ],
  });
} else if (process.env.NODE_ENV === "production") {
  console.warn("[sentry] no DSN configured, error reporting is off");
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
