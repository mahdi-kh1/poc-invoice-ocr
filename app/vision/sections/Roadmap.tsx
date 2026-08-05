import { Reveal } from "../Reveal";

const PHASES = [
  {
    n: "1",
    name: "Extract & Categorise",
    when: "Now",
    current: true,
    ships: [
      "OCR from PDF/photo (printed, scanned, handwritten)",
      "Hybrid AI categorisation (fixed rules + per-firm learning)",
      "Multi-client practice structure",
      "Dashboards & exports",
    ],
  },
  {
    n: "2",
    name: "Connect",
    when: "Next",
    current: false,
    ships: [
      "Automatic sync of cleaned data into third-party tax/accounting software",
      "A lightweight client portal so a firm's own customers can upload documents directly",
    ],
  },
  {
    n: "3",
    name: "File",
    when: "Later",
    current: false,
    ships: [
      "Direct VAT (and eventually other) submissions to HMRC via Making Tax Digital",
      "Filed from inside Accorix — no extra software required",
    ],
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="vision-section" aria-labelledby="roadmap-title">
      <Reveal className="vision-section-inner">
        <h2 id="roadmap-title" className="vision-section-title">
          Roadmap — three phases
        </h2>
        <p className="vision-section-lede">
          This POC you're testing lives entirely inside Phase 1: OCR (Tesseract.js + LLM field
          extraction) and categorisation (currently an editable flat category list; the full
          product adds per-firm learned rules on top of it).
        </p>
        <ol className="vision-timeline">
          {PHASES.map((phase) => (
            <li key={phase.n} className={`vision-timeline-item${phase.current ? " is-current" : ""}`}>
              <div className="vision-timeline-node">
                <span className="vision-timeline-num">{phase.n}</span>
              </div>
              <div className="vision-timeline-content">
                <div className="vision-timeline-heading">
                  <span className="vision-timeline-when">{phase.when}</span>
                  <h3>{phase.name}</h3>
                  {phase.current && <span className="vision-badge-current">This demo</span>}
                </div>
                <ul>
                  {phase.ships.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
