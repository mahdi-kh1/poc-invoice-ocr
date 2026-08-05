"use client";

import { useInView } from "@/lib/useInView";

/** Wraps children in the scroll-reveal treatment (see .reveal in vision.css), driven by
 * lib/useInView.ts. `delayMs` staggers sibling cards within the same grid/list. */
export function Reveal({
  children,
  className = "",
  delayMs,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal${inView ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
