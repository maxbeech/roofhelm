"use client";

import { useCallback, useRef } from "react";
import { trackEvent } from "@/lib/analytics-events";

// Returns a function to call from an input's change handler. Sends
// `calculator_used` once per mount, on the first change a person makes (not on
// the defaults or a shared link that prefills the form).
export function useCalculatorUsed(tool: string): () => void {
  const sent = useRef(false);
  return useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent("calculator_used", { tool });
  }, [tool]);
}
