"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort boundary: a render error that escaped every page boundary.
// Report it before showing the fallback.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#faf8f3", fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
          <div style={{ maxWidth: 460 }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.75rem" }}>Something went wrong</h1>
            <p style={{ color: "#555", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              We have been told and will look into it. Please try again.
            </p>
            {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#888" }}>Reference: {error.digest}</p>}
            <button
              onClick={reset}
              style={{ padding: "0.6rem 1.4rem", background: "#1a1a1a", color: "#fff", border: 0, cursor: "pointer", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
