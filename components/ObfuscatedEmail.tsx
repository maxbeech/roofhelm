"use client";

import { useSyncExternalStore } from "react";

// Scrape-resistant mailto link. The address is assembled client-side after
// mount, so the raw "user@host" string never appears in the server-rendered
// HTML that harvesting bots scrape -- only real browsers running JS see it,
// while the link still opens a normal mail client for a human visitor.
const USER = "hello";
const HOST = ["roofhelm", "com"].join(".");
const ADDRESS = `${USER}@${HOST}`;
const FALLBACK_LABEL = "hello (at) roofhelm.com";

// Nothing to subscribe to: the value is fixed. useSyncExternalStore is the React
// way to read a client-only value without a set-state-in-effect pass, and it
// gives the server a different snapshot, so hydration stays consistent.
const subscribe = () => () => {};
const isBrowser = () => true;
const isServer = () => false;

export default function ObfuscatedEmail({
  subject,
  className,
  children,
}: {
  subject?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ready = useSyncExternalStore(subscribe, isBrowser, isServer);
  const label = ready ? ADDRESS : FALLBACK_LABEL;
  const href = ready
    ? `mailto:${ADDRESS}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
    : undefined;

  return (
    <a href={href} className={className}>
      {children ?? label}
    </a>
  );
}
