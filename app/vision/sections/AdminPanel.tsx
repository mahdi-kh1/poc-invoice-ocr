import { Reveal } from "../Reveal";
import { IconBuilding, IconTag, IconCpu, IconCreditCard, IconHeadset, IconFileCheck } from "../icons";

const ADMIN_FEATURES = [
  {
    icon: IconBuilding,
    title: "Firm accounts & billing status",
    body: "Every firm's usage, plan, and account health in one view.",
  },
  {
    icon: IconTag,
    title: "Category templates",
    body: "Global and industry-specific categorisation templates, versioned.",
  },
  {
    icon: IconCpu,
    title: "AI model & prompt versioning",
    body: "Per-firm cost and accuracy monitoring for every model in production.",
  },
  {
    icon: IconCreditCard,
    title: "Subscription plans & invoicing",
    body: "Manage pricing tiers, invoices, and billing without a redeploy.",
  },
  {
    icon: IconHeadset,
    title: "Support tooling",
    body: "Tied directly to a firm's live data for fast diagnosis, not a black box.",
  },
  {
    icon: IconFileCheck,
    title: "Full audit trail",
    body: "Every admin action logged — especially anything touching a firm's data.",
  },
];

export function AdminPanel() {
  return (
    <section className="vision-section vision-section-navy" aria-labelledby="admin-panel-title">
      <Reveal className="vision-section-inner">
        <p className="vision-eyebrow vision-eyebrow-onnavy">For Accorix staff, not firms</p>
        <h2 id="admin-panel-title" className="vision-section-title vision-title-onnavy">
          What we run behind the scenes
        </h2>
        <p className="vision-section-lede vision-lede-onnavy">
          The same platform that firms use is managed, for Accorix itself, through an internal
          admin panel.
        </p>
      </Reveal>
      <div className="vision-card-grid">
        {ADMIN_FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delayMs={(i % 3) * 80} className="vision-card vision-card-navy">
            <div className="vision-card-icon vision-card-icon-gold">
              <Icon />
            </div>
            <h3 className="vision-card-title vision-title-onnavy">{title}</h3>
            <p className="vision-card-body vision-lede-onnavy">{body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
