import { Reveal } from "../Reveal";

export function VisionSection() {
  return (
    <section className="vision-section vision-section-tinted" aria-labelledby="vision-title">
      <Reveal className="vision-section-inner">
        <h2 id="vision-title" className="vision-section-title">
          The vision — North Star
        </h2>
        <p className="vision-section-lede">
          A firm should be able to go from <em>"here's a photo of a receipt"</em> to{" "}
          <em>"VAT return filed with HMRC"</em> without ever leaving Accorix. One login. One place
          clients live. AI does the repetitive extraction and first-pass categorisation; the
          accountant stays the one who signs off on anything that matters.
        </p>
        <div className="vision-callout">
          <p className="vision-callout-title">Human-in-the-loop, always.</p>
          <p className="vision-callout-body">
            Accorix never files, never finalises a professional judgement call (capital vs.
            revenue, scheme eligibility, etc.) without an accountant's explicit approval. AI
            drafts; humans decide. This isn't a phase-3 feature — it's a constraint that applies
            from day one and never gets relaxed for convenience.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
