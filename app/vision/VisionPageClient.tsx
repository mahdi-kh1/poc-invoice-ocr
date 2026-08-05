"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./vision.css";

export default function VisionPageClient() {
  const heroBgRef = useRef<HTMLDivElement>(null);

  // Subtle parallax on the hero background — translates at a fraction of scroll speed.
  // Throttled via requestAnimationFrame rather than running on every raw scroll event.
  useEffect(() => {
    let ticking = false;

    function applyParallax() {
      const node = heroBgRef.current;
      if (node) {
        node.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="vision-page">
      <section className="vision-hero">
        <div className="vision-hero-bg" ref={heroBgRef} aria-hidden="true" />
        <div className="vision-hero-content">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/accorix-logo.svg" alt="Accorix" className="vision-hero-logo" />
          <p className="vision-eyebrow">The Smarter Accounting Assistant</p>
          <h1 className="vision-hero-headline">
            Not a bolt-on OCR tool — a full replacement for Xero/QuickBooks, built for firms who manage
            many clients at once.
          </h1>
          <p className="vision-hero-subhead">
            What you're using right now is a feasibility slice of Accorix — the
            document-extraction-and-categorisation engine at the heart of Phase 1. This page shows where
            it's headed.
          </p>
          <div className="vision-hero-ctas">
            <a href="#roadmap" className="vision-btn vision-btn-primary">
              See the full roadmap ↓
            </a>
            <Link href="/" className="vision-btn vision-btn-secondary">
              ← Back to the live demo
            </Link>
          </div>
        </div>
      </section>

      {/* Sections 2–10 (Problem, Vision, Roadmap, Firm features, Admin panel, Pipeline,
          Comparison, Demo status, Footer) land here next — this stub is just a scroll target for
          the hero's primary CTA until then. */}
      <section id="roadmap" className="vision-stub">
        More of the story — Problem, Vision, Roadmap, and beyond — coming next.
      </section>
    </div>
  );
}
