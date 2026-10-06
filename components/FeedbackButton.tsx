"use client";

import { useState } from "react";
import { SITE_FEEDBACK_EMAIL } from "@/lib/feedback";

type Variant = "nav" | "menu" | "footer";

const STYLES: Record<Variant, string> = {
  nav: "hidden text-[13px] font-medium text-ink-600 underline-offset-4 transition hover:text-frost-600 hover:underline sm:inline",
  menu: "block w-full px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50",
  footer: "text-ink-600 underline-offset-4 transition hover:text-frost-600 hover:underline",
};

/**
 * Opens Sentry's feedback form, so a report lands in the same project as the
 * errors. The SDK is imported on click to keep it out of the initial bundle.
 */
export function FeedbackButton({ variant = "footer", className = "" }: { variant?: Variant; className?: string }) {
  const [unavailable, setUnavailable] = useState(false);

  const open = async () => {
    try {
      const Sentry = await import("@sentry/nextjs");
      const feedback = Sentry.getFeedback();
      if (!feedback) {
        setUnavailable(true);
        return;
      }
      const form = await feedback.createForm();
      form.appendToDom();
      form.open();
    } catch (err) {
      console.error("[feedback] could not open the form", err instanceof Error ? err.name : typeof err);
      setUnavailable(true);
    }
  };

  if (unavailable) {
    return (
      <a className={`${STYLES[variant]} ${className}`} href={`mailto:${SITE_FEEDBACK_EMAIL}`}>
        Email us instead
      </a>
    );
  }
  return (
    <button type="button" onClick={open} className={`${STYLES[variant]} ${className}`}>
      Send feedback
    </button>
  );
}
