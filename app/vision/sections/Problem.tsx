import { Fragment } from "react";
import { Reveal } from "../Reveal";
import { IconLedger, IconCamera, IconCalendar } from "../icons";

const TOOLS = [
  { icon: IconLedger, label: "Bookkeeping software", detail: "Xero, QuickBooks" },
  { icon: IconCamera, label: "Document capture", detail: "Dext, or manual entry" },
  { icon: IconCalendar, label: "Deadlines & spreadsheets", detail: "Whatever the software doesn't model" },
];

export function Problem() {
  return (
    <section className="vision-section" aria-labelledby="problem-title">
      <Reveal className="vision-section-inner">
        <h2 id="problem-title" className="vision-section-title">
          The problem
        </h2>
        <p className="vision-section-lede">
          Accounting firms serving many clients today stitch together separate tools that were
          never built to talk to each other.
        </p>
        <div className="vision-scattered">
          {TOOLS.map(({ icon: Icon, label, detail }, i) => (
            <Fragment key={label}>
              {i > 0 && (
                <span className="vision-scattered-break" aria-hidden="true">
                  +
                </span>
              )}
              <div className="vision-scattered-item">
                <div className="vision-scattered-icon">
                  <Icon />
                </div>
                <p className="vision-scattered-label">{label}</p>
                <p className="vision-scattered-detail">{detail}</p>
              </div>
            </Fragment>
          ))}
        </div>
        <p className="vision-section-body">
          Each client is a separate mental context switch, and none of these tools were built
          firm-first — they were built for a single business, then retrofitted with a "practice"
          layer.
        </p>
      </Reveal>
    </section>
  );
}
