"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Segment boundary: keeps the header and footer, reports the failure as an issue.
export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-500">We have been told and will look into it. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 bg-ink-900 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-ink-700"
      >
        Try again
      </button>
    </div>
  );
}
