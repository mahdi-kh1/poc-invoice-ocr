import Link from "next/link";
import { Reveal } from "../Reveal";
import { IconArrowRight } from "../icons";

export function DemoStatus() {
  return (
    <section className="vision-section vision-section-tinted" aria-labelledby="demo-status-title">
      <Reveal className="vision-section-inner vision-demo-status">
        <h2 id="demo-status-title" className="vision-section-title">
          What you're looking at right now
        </h2>
        <p className="vision-section-body">
          To be explicit and honest: <strong>this is a feasibility demo</strong>, not the finished
          product. It proves out the hardest technical bet in Phase 1 — can free/local OCR plus an
          LLM reliably turn a messy real-world document into structured, categorised data — before
          the full multi-tenant platform gets built around it.
        </p>
        <p className="vision-section-body">
          No auth. No persistence — nothing you upload is saved once you close the tab. No billing.
          Just the extraction and categorisation engine, on its own.
        </p>
        <Link href="/" className="vision-btn vision-btn-primary">
          Try the live demo <IconArrowRight />
        </Link>
      </Reveal>
    </section>
  );
}
