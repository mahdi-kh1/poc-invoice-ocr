import { Reveal } from "../Reveal";
import { IconPuzzle, IconLayers } from "../icons";

export function Comparison() {
  return (
    <section className="vision-section" aria-labelledby="comparison-title">
      <Reveal className="vision-section-inner">
        <h2 id="comparison-title" className="vision-section-title">
          Why not just use Xero/QuickBooks + Dext?
        </h2>
        <div className="vision-compare">
          <div className="vision-compare-col">
            <div className="vision-compare-icon">
              <IconPuzzle />
            </div>
            <h3>Xero/QuickBooks + Dext</h3>
            <p>
              Two products bolted together, built for a single business first and a practice
              second. Mature and battle-tested today.
            </p>
          </div>
          <div className="vision-compare-col vision-compare-col-accent">
            <div className="vision-compare-icon">
              <IconLayers />
            </div>
            <h3>Accorix</h3>
            <p>
              Practice-first from the ground up: multi-client structure isn't an add-on, and AI
              categorisation is the <em>entry point</em> to the product, not a plugin on top of an
              existing ledger.
            </p>
          </div>
        </div>
        <p className="vision-section-body">
          The honest trade-off: Xero/QuickBooks are mature and battle-tested today; Accorix's bet
          is being faster, more AI-native, and UK-practice-specific enough to be worth the switch
          as it matures through these three phases.
        </p>
      </Reveal>
    </section>
  );
}
