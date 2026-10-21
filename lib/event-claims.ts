// Best-effort webhook de-duplication by Stripe event id, held in process memory.
//
// Stripe may deliver the same event more than once, so the handler claims an id
// before working and settles it after. Two rules learned the hard way in other
// products on this account:
//   - A claim made BEFORE the work must be released if the work fails. Keeping
//     it turns Stripe's retry into a false "duplicate" and the sale is lost.
//   - Only a finished event is remembered as done.
//
// This store lives in one process and is empty after a restart, and each
// instance has its own. It is a fast path, not the guarantee. The guarantee is
// that fulfilment is itself idempotent: the email carries a client id derived
// from the Checkout Session, so a repeat delivery cannot send a second copy.
// A durable record would need a table (event id, session id, fulfilled at).
// None is created here; add one if a restart-proof ledger is wanted.

export type ClaimResult = "claimed" | "duplicate" | "in_flight";

export interface ClaimStore {
  claim(id: string): ClaimResult;
  done(id: string): void;
  release(id: string): void;
}

export function createClaimStore(ttlMs = 72 * 3_600_000, maxEntries = 5000, now: () => number = Date.now): ClaimStore {
  const inFlight = new Set<string>();
  const finished = new Map<string, number>(); // id -> expiry (ms)

  function sweep() {
    const t = now();
    for (const [id, expires] of finished) if (expires <= t) finished.delete(id);
    // Map iterates in insertion order, so the oldest entries go first.
    while (finished.size > maxEntries) finished.delete(finished.keys().next().value as string);
  }

  return {
    claim(id) {
      sweep();
      if (finished.has(id)) return "duplicate";
      if (inFlight.has(id)) return "in_flight";
      inFlight.add(id);
      return "claimed";
    },
    done(id) {
      inFlight.delete(id);
      finished.set(id, now() + ttlMs);
    },
    release(id) {
      inFlight.delete(id);
    },
  };
}

/** Shared by the webhook route. Stripe retries for up to three days; keep ids that long. */
export const eventClaims: ClaimStore = createClaimStore();
