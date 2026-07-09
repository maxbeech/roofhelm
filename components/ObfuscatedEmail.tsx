"use client";

import { useEffect, useState } from "react";

// Scrape-resistant mailto link. The address is assembled client-side after
// mount, so the raw "user@host" string never appears in the server-rendered
// HTML that harvesting bots scrape -- only real browsers running JS see it,
// while the link still opens a normal mail client for a human visitor.
const USER = "hello";
const HOST = ["roofhelm", "com"].join(".");

export default function ObfuscatedEmail({
  subject,
  className,
  children,
}: {
  subject?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [href, setHref] = useState<string>();
  const [label, setLabel] = useState("hello (at) roofhelm.com");

  useEffect(() => {
    const address = `${USER}@${HOST}`;
    setLabel(address);
    setHref(`mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`);
  }, [subject]);

  return (
    <a href={href} className={className}>
      {children ?? label}
    </a>
  );
}
