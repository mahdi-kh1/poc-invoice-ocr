import { Reveal } from "../Reveal";
import {
  IconUpload,
  IconScan,
  IconTag,
  IconEye,
  IconLandmark,
  IconChart,
  IconLink,
  IconCheckCircle,
} from "../icons";

const STEPS = [
  { icon: IconUpload, title: "Upload", body: "PDF, photo, or handwriting." },
  { icon: IconScan, title: "OCR extraction", body: "Confidence score per field." },
  { icon: IconTag, title: "Hybrid categorisation", body: "Rules + per-firm learning." },
  { icon: IconEye, title: "Human review", body: "Only what actually needs it." },
  { icon: IconLandmark, title: "Bank reconciliation", body: "Matched against the live feed." },
  { icon: IconChart, title: "Reports & exports", body: "P&L, VAT drafts, and more." },
  { icon: IconLink, title: "Sync to tax/accounting software", body: "Phase 2.", future: true },
  { icon: IconCheckCircle, title: "Filed with HMRC", body: "Phase 3.", future: true },
];

export function Pipeline() {
  return (
    <section className="vision-section" aria-labelledby="pipeline-title">
      <Reveal className="vision-section-inner">
        <h2 id="pipeline-title" className="vision-section-title">
          The pipeline, visually
        </h2>
        <p className="vision-section-lede">One step reveals into the next as you scroll — this is the shape of the whole product.</p>
      </Reveal>
      <ol className="vision-pipeline">
        {STEPS.map(({ icon: Icon, title, body, future }, i) => (
          <li className="vision-pipeline-item" key={title}>
            <Reveal delayMs={i * 60} className={`vision-pipeline-step${future ? " is-future" : ""}`}>
              <div className="vision-pipeline-node">
                <Icon />
              </div>
              <div className="vision-pipeline-text">
                <h3>
                  {title}
                  {future && <span className="vision-badge-future">Coming later</span>}
                </h3>
                <p>{body}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
